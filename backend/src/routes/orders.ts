import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import { notifyAdmins } from './push'
import type { AppEnv, Order } from '../types'

const PAID_LOCALITIES = ['Centenario', 'Roca', 'Allen', '5 Saltos', 'Fernández Oro']
const LOCALITY_FEE = 35_000

function localityFee(locality: string | null | undefined): number {
  return locality && PAID_LOCALITIES.includes(locality) ? LOCALITY_FEE : 0
}

function parseLocalityFromNotes(notes: string | null | undefined): string {
  if (!notes) return ''
  const match = notes.split(' | ').find(p => p.startsWith('Localidad: '))
  return match ? match.slice('Localidad: '.length) : ''
}

const createOrderSchema = z.object({
  pack_id: z.string(),
  people_count: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  notes: z.string().optional(),
  promo_code: z.string().optional(),
  additionals: z.array(z.object({
    additional_id: z.string(),
    quantity: z.number().int().min(1),
  })).optional().default([]),
})

export const orderRouter = new Hono<AppEnv>()

orderRouter.use('*', authMiddleware)

// ─── GET /orders — mis órdenes (admin ve todas) ────────────────────────────────
orderRouter.get('/', async (c) => {
  const { sub, role } = c.get('user')
  const isAdmin = ['admin', 'superadmin', 'employee'].includes(role)

  const query = isAdmin
    ? `SELECT o.*, p.name as pack_name, p.image_key as pack_image_key,
              u.name as user_name, u.phone as user_phone
       FROM orders o
       LEFT JOIN packs p ON p.id = o.pack_id
       LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC`
    : `SELECT o.*, p.name as pack_name, p.image_key as pack_image_key
       FROM orders o
       LEFT JOIN packs p ON p.id = o.pack_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`

  const { results } = isAdmin
    ? await c.env.DB.prepare(query).all()
    : await c.env.DB.prepare(query).bind(sub).all()

  return success(c, results)
})

// ─── GET /orders/:id — detalle con adicionales y comprobantes ─────────────────
orderRouter.get('/:id', async (c) => {
  const { sub, role } = c.get('user')
  const { id } = c.req.param()
  const isAdmin = ['admin', 'superadmin', 'employee'].includes(role)

  const order = await c.env.DB.prepare(
    `SELECT o.*, p.name as pack_name, p.image_key as pack_image_key,
            u.name as user_name, u.phone as user_phone
     FROM orders o
     LEFT JOIN packs p ON p.id = o.pack_id
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ?`
  ).bind(id).first<Order & { pack_name: string; user_name: string; user_phone: string }>()

  if (!order) return error(c, 'Orden no encontrada', 404)
  if (!isAdmin && order.user_id !== sub) return error(c, 'Sin acceso', 403)

  const { results: additionals } = await c.env.DB.prepare(
    `SELECT oa.*, a.name as additional_name, a.image_key as additional_image_key
     FROM order_additionals oa
     LEFT JOIN additionals a ON a.id = oa.additional_id
     WHERE oa.order_id = ?`
  ).bind(id).all()

  const { results: uploads } = await c.env.DB.prepare(
    'SELECT * FROM payment_uploads WHERE order_id = ? ORDER BY uploaded_at DESC'
  ).bind(id).all()

  return success(c, { ...order, additionals, uploads })
})

// ─── POST /orders — crear orden con validación de stock ───────────────────────
orderRouter.post('/', async (c) => {
  const { sub } = c.get('user')
  const body = await c.req.json()
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const { pack_id, people_count, date, notes, additionals, promo_code } = parsed.data

  // Verificar pack existe y está activo
  const pack = await c.env.DB.prepare('SELECT * FROM packs WHERE id = ? AND is_active = 1').bind(pack_id).first<{ id: string; min_people: number; max_people: number }>()
  if (!pack) return error(c, 'Pack no disponible', 404)
  if (people_count < pack.min_people || people_count > pack.max_people) {
    return error(c, `Personas debe estar entre ${pack.min_people} y ${pack.max_people}`)
  }

  // Obtener precio para people_count
  const priceRow = await c.env.DB.prepare(
    'SELECT price FROM pack_prices WHERE pack_id = ? AND people_count = ?'
  ).bind(pack_id, people_count).first<{ price: number }>()
  if (!priceRow) return error(c, `No hay precio configurado para ${people_count} personas`)

  // Validar disponibilidad de stock
  const { results: resourceRows } = await c.env.DB.prepare(
    `SELECT pr.resource_id, r.quantity AS total_stock,
       (pr.quantity_fixed + pr.quantity_per_person * ?3) AS consumes_per_order,
       COALESCE((
         SELECT SUM(pr2.quantity_fixed + pr2.quantity_per_person * o2.people_count)
         FROM orders o2
         JOIN pack_resources pr2 ON pr2.pack_id = o2.pack_id AND pr2.resource_id = pr.resource_id
         WHERE o2.date = ?2
           AND o2.status IN ('pending_payment','pending_confirmation','confirmed')
       ), 0) AS consumed_today
     FROM pack_resources pr
     JOIN resources r ON r.id = pr.resource_id
     WHERE pr.pack_id = ?1`
  ).bind(pack_id, date, people_count).all<{
    resource_id: string; total_stock: number; consumes_per_order: number; consumed_today: number
  }>()

  const notAvailable = resourceRows.find(r => r.total_stock - r.consumed_today < r.consumes_per_order)
  if (notAvailable) return error(c, 'No hay disponibilidad para la fecha seleccionada', 409)

  // Aplicar código de promoción al pack (si viene)
  let discountAmount = 0
  let promoCodeId: string | null = null

  if (promo_code) {
    const normalizedCode = promo_code.toUpperCase().trim()
    const promo = await c.env.DB.prepare(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
    ).bind(normalizedCode).first<{
      id: string; discount_type: string; discount_value: number;
      applicable_pack_ids: string | null; max_uses: number | null;
      used_count: number; expires_at: string | null
    }>()

    if (promo) {
      const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date()
      const isExhausted = promo.max_uses !== null && promo.used_count >= promo.max_uses
      let packApplies = true
      if (promo.applicable_pack_ids !== null) {
        try {
          const ids: string[] = JSON.parse(promo.applicable_pack_ids)
          packApplies = ids.includes(pack_id)
        } catch { packApplies = false }
      }

      if (!isExpired && !isExhausted && packApplies) {
        promoCodeId = promo.id
        const packPrice = priceRow.price
        discountAmount = promo.discount_type === 'percent'
          ? Math.min(packPrice * promo.discount_value / 100, packPrice)
          : Math.min(promo.discount_value, packPrice)
      }
    }
  }

  // Calcular precio total (pack - descuento + traslado + adicionales)
  const locality = parseLocalityFromNotes(notes)
  let total = priceRow.price - discountAmount + localityFee(locality)
  const addlDetails: Array<{ additional_id: string; name: string; price: number; quantity: number }> = []

  for (const addl of additionals) {
    const a = await c.env.DB.prepare('SELECT id, name, price FROM additionals WHERE id = ? AND is_active = 1').bind(addl.additional_id).first<{ id: string; name: string; price: number }>()
    if (!a) return error(c, `Extra no disponible: ${addl.additional_id}`, 404)
    total += a.price * addl.quantity
    addlDetails.push({ additional_id: a.id, name: a.name, price: a.price, quantity: addl.quantity })
  }

  // Crear orden y adicionales en batch
  const orderId = generateId()
  const now = new Date().toISOString()

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO orders (id, user_id, pack_id, people_count, date, status, total_price, notes, promo_code_id, discount_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, sub, pack_id, people_count, date, total, notes ?? null, promoCodeId, discountAmount, now, now),
    ...addlDetails.map(a =>
      c.env.DB.prepare(
        'INSERT INTO order_additionals (id, order_id, additional_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), orderId, a.additional_id, a.quantity, a.price)
    ),
  ]

  if (promoCodeId) {
    statements.push(
      c.env.DB.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').bind(promoCodeId)
    )
  }

  await c.env.DB.batch(statements)

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
  // Fire-and-forget push to admins
  c.executionCtx?.waitUntil(notifyAdmins(c.env))
  return success(c, order, 'Reserva creada exitosamente', 201)
})

// ─── PATCH /orders/:id/details — admin edita datos de la reserva ─────────────
orderRouter.patch('/:id/details', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = z.object({
    user_name:    z.string().min(1).optional(),
    user_phone:   z.string().min(1).optional(),
    notes:        z.string().optional().nullable(),
    locality:     z.string().optional(),
    people_count: z.number().int().min(1).optional(),
  }).safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const order = await c.env.DB.prepare(
    'SELECT id, user_id, pack_id, people_count, total_price, notes FROM orders WHERE id = ?'
  ).bind(id).first<{ id: string; user_id: string; pack_id: string; people_count: number; total_price: number; notes: string | null }>()
  if (!order) return error(c, 'Orden no encontrada', 404)

  const now = new Date().toISOString()
  const { user_name, user_phone, notes, locality, people_count } = parsed.data

  // Update user name/phone if provided
  if (user_name || user_phone) {
    const parts: string[] = []
    const vals: unknown[] = []
    if (user_name)  { parts.push('name = ?');  vals.push(user_name) }
    if (user_phone) { parts.push('phone = ?'); vals.push(user_phone) }
    vals.push(order.user_id)
    await c.env.DB.prepare(`UPDATE users SET ${parts.join(', ')} WHERE id = ?`).bind(...vals).run()
  }

  let newTotal = order.total_price

  // Recalculate locality fee if locality changed
  if (locality !== undefined) {
    const oldLocality = parseLocalityFromNotes(order.notes)
    const oldFee = localityFee(oldLocality)
    const newFee = localityFee(locality)
    newTotal = newTotal - oldFee + newFee
  }

  // Recalculate base price if people_count changed
  if (people_count && people_count !== order.people_count) {
    const priceRow = await c.env.DB.prepare(
      'SELECT price FROM pack_prices WHERE pack_id = ? AND people_count = ?'
    ).bind(order.pack_id, people_count).first<{ price: number }>()
    if (!priceRow) return error(c, `No hay precio configurado para ${people_count} personas`)

    const oldPriceRow = await c.env.DB.prepare(
      'SELECT price FROM pack_prices WHERE pack_id = ? AND people_count = ?'
    ).bind(order.pack_id, order.people_count).first<{ price: number }>()
    const oldBase = oldPriceRow?.price ?? 0
    newTotal = newTotal - oldBase + priceRow.price
  }

  const priceChanged = locality !== undefined || (people_count !== undefined && people_count !== order.people_count)

  // Build order update
  const orderParts: string[] = ['updated_at = ?']
  const orderVals: unknown[] = [now]
  if (notes !== undefined)        { orderParts.push('notes = ?');        orderVals.push(notes) }
  if (people_count !== undefined) { orderParts.push('people_count = ?'); orderVals.push(people_count) }
  if (priceChanged)               { orderParts.push('total_price = ?');  orderVals.push(newTotal) }
  orderVals.push(id)

  await c.env.DB.prepare(`UPDATE orders SET ${orderParts.join(', ')} WHERE id = ?`).bind(...orderVals).run()

  return success(c, { total_price: newTotal }, 'Reserva actualizada')
})

// ─── POST /orders/admin — admin crea una reserva manualmente ─────────────────
orderRouter.post('/admin', adminOrAbove, async (c) => {
  const body = await c.req.json()
  const parsed = z.object({
    user_name:    z.string().min(2),
    user_phone:   z.string().min(7),
    pack_id:      z.string(),
    people_count: z.number().int().min(1),
    date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes:        z.string().optional(),
    promo_code:   z.string().optional(),
    status:       z.enum(['pending_payment', 'confirmed']).default('pending_payment'),
    additionals:  z.array(z.object({
      additional_id: z.string(),
      quantity: z.number().int().min(1),
    })).optional().default([]),
  }).safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const { user_name, user_phone, pack_id, people_count, date, notes, promo_code, status, additionals } = parsed.data

  // Find or create user by phone
  let user = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(user_phone).first<{ id: string }>()
  if (!user) {
    const userId = generateId()
    const now2 = new Date().toISOString()
    await c.env.DB.prepare(
      `INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at) VALUES (?, ?, ?, 'client', 1, ?, ?)`
    ).bind(userId, user_name, user_phone, now2, now2).run()
    user = { id: userId }
  } else {
    // Update name if user exists
    await c.env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(user_name, user.id).run()
  }

  // Verify pack
  const pack = await c.env.DB.prepare('SELECT id, min_people, max_people FROM packs WHERE id = ? AND is_active = 1')
    .bind(pack_id).first<{ id: string; min_people: number; max_people: number }>()
  if (!pack) return error(c, 'Pack no disponible', 404)
  if (people_count < pack.min_people || people_count > pack.max_people) {
    return error(c, `Personas debe estar entre ${pack.min_people} y ${pack.max_people}`)
  }

  const priceRow = await c.env.DB.prepare(
    'SELECT price FROM pack_prices WHERE pack_id = ? AND people_count = ?'
  ).bind(pack_id, people_count).first<{ price: number }>()
  if (!priceRow) return error(c, `No hay precio configurado para ${people_count} personas`)

  // Aplicar código de promoción
  let discountAmount = 0
  let promoCodeId: string | null = null
  if (promo_code) {
    const normalizedCode = promo_code.toUpperCase().trim()
    const promo = await c.env.DB.prepare(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
    ).bind(normalizedCode).first<{
      id: string; discount_type: string; discount_value: number;
      applicable_pack_ids: string | null; max_uses: number | null;
      used_count: number; expires_at: string | null
    }>()
    if (promo) {
      const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date()
      const isExhausted = promo.max_uses !== null && promo.used_count >= promo.max_uses
      let packApplies = true
      if (promo.applicable_pack_ids !== null) {
        try { packApplies = (JSON.parse(promo.applicable_pack_ids) as string[]).includes(pack_id) }
        catch { packApplies = false }
      }
      if (!isExpired && !isExhausted && packApplies) {
        promoCodeId = promo.id
        discountAmount = promo.discount_type === 'percent'
          ? Math.min(priceRow.price * promo.discount_value / 100, priceRow.price)
          : Math.min(promo.discount_value, priceRow.price)
      }
    }
  }

  const locality = parseLocalityFromNotes(notes)
  let total = priceRow.price - discountAmount + localityFee(locality)
  const addlDetails: Array<{ additional_id: string; name: string; price: number; quantity: number }> = []
  for (const addl of additionals) {
    const a = await c.env.DB.prepare('SELECT id, name, price FROM additionals WHERE id = ? AND is_active = 1')
      .bind(addl.additional_id).first<{ id: string; name: string; price: number }>()
    if (!a) return error(c, `Extra no disponible`, 404)
    total += a.price * addl.quantity
    addlDetails.push({ additional_id: a.id, name: a.name, price: a.price, quantity: addl.quantity })
  }

  const orderId = generateId()
  const now = new Date().toISOString()

  const adminBatch = [
    c.env.DB.prepare(
      `INSERT INTO orders (id, user_id, pack_id, people_count, date, status, total_price, notes, promo_code_id, discount_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, user.id, pack_id, people_count, date, status, total, notes ?? null, promoCodeId, discountAmount, now, now),
    ...addlDetails.map(a =>
      c.env.DB.prepare(
        'INSERT INTO order_additionals (id, order_id, additional_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), orderId, a.additional_id, a.quantity, a.price)
    ),
  ]
  if (promoCodeId) {
    adminBatch.push(
      c.env.DB.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').bind(promoCodeId)
    )
  }
  await c.env.DB.batch(adminBatch)

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
  return success(c, order, 'Reserva creada', 201)
})

// ─── POST /orders/:id/accept-terms — registrar aceptación de T&C ─────────────
orderRouter.post('/:id/accept-terms', async (c) => {
  const { sub } = c.get('user')
  const { id } = c.req.param()

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(id).first<Order>()
  if (!order) return error(c, 'Orden no encontrada', 404)
  if (order.user_id !== sub) return error(c, 'Sin acceso', 403)

  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS tc_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      tc_version TEXT NOT NULL,
      amount_paid INTEGER NOT NULL,
      UNIQUE(user_id, order_id)
    )
  `).run()

  const deposit = Math.ceil(order.total_price * 0.3)
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO tc_acceptances (id, user_id, order_id, accepted_at, tc_version, amount_paid)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(generateId(), sub, id, now, '1.0', deposit).run()

  return success(c, null, 'Términos aceptados')
})

// ─── POST /orders/:id/payment-proof — subir comprobante ──────────────────────
orderRouter.post('/:id/payment-proof', async (c) => {
  const { sub, role } = c.get('user')
  const { id } = c.req.param()
  const isAdmin = ['admin', 'superadmin'].includes(role)

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>()
  if (!order) return error(c, 'Orden no encontrada', 404)
  if (!isAdmin && order.user_id !== sub) return error(c, 'Sin acceso', 403)
  if (order.status !== 'pending_payment') return error(c, 'Esta orden ya tiene comprobante subido')

  const formData = await c.req.formData()
  const file = formData.get('proof') as File | null
  if (!file) return error(c, 'Archivo requerido (campo: proof)')

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  if (!allowed.includes(file.type)) return error(c, 'Tipo no permitido. Use JPG, PNG, WebP o PDF')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileKey = `payment-proofs/${id}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await c.env.ASSETS_BUCKET.put(fileKey, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  })

  const uploadId = generateId()
  const now = new Date().toISOString()

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO payment_uploads (id, order_id, file_key, uploaded_at) VALUES (?, ?, ?, ?)')
      .bind(uploadId, id, fileKey, now),
    c.env.DB.prepare("UPDATE orders SET status = 'pending_confirmation', updated_at = ? WHERE id = ?")
      .bind(now, id),
  ])

  return success(c, { file_key: fileKey }, 'Comprobante recibido. Tu reserva está pendiente de confirmación.')
})

// ─── PATCH /orders/:id/status — admin confirma o cancela ─────────────────────
orderRouter.patch('/:id/status', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const { status } = z.object({ status: z.enum(['confirmed', 'cancelled', 'completed']) }).parse(body)

  const order = await c.env.DB.prepare('SELECT id, status, total_price FROM orders WHERE id = ?').bind(id).first<Order & { total_price: number }>()
  if (!order) return error(c, 'Orden no encontrada', 404)

  if (status === 'completed') {
    const row = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total_paid FROM order_payments WHERE order_id = ?'
    ).bind(id).first<{ total_paid: number }>()
    const totalPaid = row?.total_paid ?? 0
    if (totalPaid < order.total_price) {
      return error(c, 'Debe registrar el pago completo antes de marcar como realizado', 400)
    }
  }

  await c.env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, new Date().toISOString(), id).run()

  const msg = status === 'confirmed' ? 'confirmada' : status === 'completed' ? 'marcada como realizada' : 'cancelada'
  return success(c, null, `Orden ${msg}`)
})

// ─── PATCH /orders/:id/date — reprogramar fecha ───────────────────────────────
orderRouter.patch('/:id/date', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const { date } = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  }).parse(await c.req.json())

  const order = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first()
  if (!order) return error(c, 'Orden no encontrada', 404)

  await c.env.DB.prepare('UPDATE orders SET date = ?, updated_at = ? WHERE id = ?')
    .bind(date, new Date().toISOString(), id).run()
  return success(c, null, 'Fecha actualizada')
})

// ─── GET /orders/:id/payments — listar pagos de una orden ─────────────────────
orderRouter.get('/:id/payments', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const order = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first()
  if (!order) return error(c, 'Orden no encontrada', 404)

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM order_payments WHERE order_id = ? ORDER BY created_at ASC'
  ).bind(id).all()
  return success(c, results)
})

// ─── POST /orders/:id/payments — registrar pago ───────────────────────────────
orderRouter.post('/:id/payments', adminOrAbove, async (c) => {
  const { sub } = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
  }).safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const order = await c.env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(id).first()
  if (!order) return error(c, 'Orden no encontrada', 404)

  const paymentId = generateId()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    'INSERT INTO order_payments (id, order_id, amount, description, registered_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(paymentId, id, parsed.data.amount, parsed.data.description ?? null, sub, now).run()

  const payment = await c.env.DB.prepare('SELECT * FROM order_payments WHERE id = ?').bind(paymentId).first()
  return success(c, payment, 'Pago registrado', 201)
})

// ─── DELETE /orders/:id/payments/:paymentId — eliminar pago ──────────────────
orderRouter.delete('/:id/payments/:paymentId', adminOrAbove, async (c) => {
  const { id, paymentId } = c.req.param()
  const payment = await c.env.DB.prepare(
    'SELECT id FROM order_payments WHERE id = ? AND order_id = ?'
  ).bind(paymentId, id).first()
  if (!payment) return error(c, 'Pago no encontrado', 404)

  await c.env.DB.prepare('DELETE FROM order_payments WHERE id = ?').bind(paymentId).run()
  return success(c, null, 'Pago eliminado')
})

// ─── DELETE /orders/:id — borrar orden cancelada ──────────────────────────────
orderRouter.delete('/:id', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const order = await c.env.DB.prepare('SELECT id, status FROM orders WHERE id = ?').bind(id).first<Order>()
  if (!order) return error(c, 'Orden no encontrada', 404)
  if (order.status !== 'cancelled') return error(c, 'Solo se pueden eliminar órdenes canceladas', 400)

  await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run()
  return success(c, null, 'Orden eliminada')
})

// ─── GET /orders/:id/proof-url — presigned URL del comprobante (admin) ────────
orderRouter.get('/:id/proof-url', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const upload = await c.env.DB.prepare(
    'SELECT file_key FROM payment_uploads WHERE order_id = ? ORDER BY uploaded_at DESC LIMIT 1'
  ).bind(id).first<{ file_key: string }>()

  if (!upload) return error(c, 'Sin comprobante', 404)

  const url = `/api/files/${upload.file_key}`
  return success(c, { url })
})

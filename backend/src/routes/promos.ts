import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv } from '../types'

const promoSchema = z.object({
  code: z.string().min(3).max(20).transform(s => s.toUpperCase().trim()),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['percent', 'amount']),
  discount_value: z.number().positive(),
  applicable_pack_ids: z.array(z.string()).optional().nullable(),
  max_uses: z.number().int().positive().optional().nullable(),
  expires_at: z.string().optional().nullable(),
})

export const promoRouter = new Hono<AppEnv>()

// ─── POST /promos/validate — público, valida código para un pack ───────────────
promoRouter.post('/validate', async (c) => {
  const body = await c.req.json()
  const parsed = z.object({ code: z.string(), pack_id: z.string() }).safeParse(body)
  if (!parsed.success) return success(c, { valid: false, message: 'Datos inválidos' })

  const { code, pack_id } = parsed.data
  const normalizedCode = code.toUpperCase().trim()

  const promo = await c.env.DB.prepare(
    'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1'
  ).bind(normalizedCode).first<{
    id: string; code: string; discount_type: string; discount_value: number;
    applicable_pack_ids: string | null; max_uses: number | null;
    used_count: number; expires_at: string | null
  }>()

  if (!promo) return success(c, { valid: false, message: 'Código no válido' })

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return success(c, { valid: false, message: 'El código ha vencido' })
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return success(c, { valid: false, message: 'El código ha alcanzado el límite de usos' })
  }

  if (promo.applicable_pack_ids !== null) {
    let packIds: string[] = []
    try { packIds = JSON.parse(promo.applicable_pack_ids) } catch { packIds = [] }
    if (!packIds.includes(pack_id)) {
      return success(c, { valid: false, message: 'Este código no aplica a este pack' })
    }
  }

  return success(c, {
    valid: true,
    promoCodeId: promo.id,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
  })
})

promoRouter.use('*', authMiddleware)

// ─── GET /promos — listar todos ───────────────────────────────────────────────
promoRouter.get('/', adminOrAbove, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM promo_codes ORDER BY created_at DESC'
  ).all()
  return success(c, results)
})

// ─── POST /promos — crear código ──────────────────────────────────────────────
promoRouter.post('/', adminOrAbove, async (c) => {
  const body = await c.req.json()
  const parsed = promoSchema.safeParse(body)
  if (!parsed.success) return error(c, `Datos inválidos: ${parsed.error.errors[0]?.message}`)

  const { code, description, discount_type, discount_value, applicable_pack_ids, max_uses, expires_at } = parsed.data

  const existing = await c.env.DB.prepare('SELECT id FROM promo_codes WHERE code = ?').bind(code).first()
  if (existing) return error(c, 'Ya existe un código con ese nombre', 409)

  const id = generateId()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO promo_codes (id, code, description, discount_type, discount_value, applicable_pack_ids, max_uses, used_count, is_active, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
  ).bind(
    id, code, description ?? null, discount_type, discount_value,
    applicable_pack_ids ? JSON.stringify(applicable_pack_ids) : null,
    max_uses ?? null, expires_at ?? null, now
  ).run()

  const promo = await c.env.DB.prepare('SELECT * FROM promo_codes WHERE id = ?').bind(id).first()
  return success(c, promo, 'Código creado', 201)
})

// ─── PATCH /promos/:id — editar código ───────────────────────────────────────
promoRouter.patch('/:id', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()

  const promo = await c.env.DB.prepare('SELECT * FROM promo_codes WHERE id = ?').bind(id).first()
  if (!promo) return error(c, 'Código no encontrado', 404)

  const parsed = promoSchema.partial().safeParse(body)
  if (!parsed.success) return error(c, `Datos inválidos: ${parsed.error.errors[0]?.message}`)

  const updates: string[] = []
  const values: unknown[] = []

  const d = parsed.data
  if (d.code !== undefined) { updates.push('code = ?'); values.push(d.code) }
  if (d.description !== undefined) { updates.push('description = ?'); values.push(d.description) }
  if (d.discount_type !== undefined) { updates.push('discount_type = ?'); values.push(d.discount_type) }
  if (d.discount_value !== undefined) { updates.push('discount_value = ?'); values.push(d.discount_value) }
  if ('applicable_pack_ids' in d) {
    updates.push('applicable_pack_ids = ?')
    values.push(d.applicable_pack_ids ? JSON.stringify(d.applicable_pack_ids) : null)
  }
  if ('max_uses' in d) { updates.push('max_uses = ?'); values.push(d.max_uses ?? null) }
  if ('expires_at' in d) { updates.push('expires_at = ?'); values.push(d.expires_at ?? null) }
  if ('is_active' in body) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0) }

  if (updates.length === 0) return error(c, 'Nada que actualizar')

  values.push(id)
  await c.env.DB.prepare(`UPDATE promo_codes SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values).run()

  const updated = await c.env.DB.prepare('SELECT * FROM promo_codes WHERE id = ?').bind(id).first()
  return success(c, updated)
})

// ─── DELETE /promos/:id — desactivar (soft delete) ───────────────────────────
promoRouter.delete('/:id', adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const promo = await c.env.DB.prepare('SELECT id FROM promo_codes WHERE id = ?').bind(id).first()
  if (!promo) return error(c, 'Código no encontrado', 404)

  await c.env.DB.prepare('UPDATE promo_codes SET is_active = 0 WHERE id = ?').bind(id).run()
  return success(c, null, 'Código desactivado')
})

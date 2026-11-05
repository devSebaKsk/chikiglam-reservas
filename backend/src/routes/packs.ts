import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, Pack, PackPrice, PackResource } from '../types'

const packSchema = z.object({
  name: z.string().min(2),
  short_description: z.string().min(5),
  full_description: z.string().min(10),
  image_key: z.string().optional().nullable(),
  min_people: z.number().int().min(1),
  max_people: z.number().int().min(1),
  sort_order: z.number().int().default(0),
  category: z.enum(['carpa', 'adentro', 'talleres', 'grandes']).nullable().optional(),
  is_hidden: z.number().int().optional().default(0),
})

const priceSchema = z.array(z.object({
  people_count: z.number().int().min(1),
  price: z.number().positive(),
}))

const resourceSchema = z.array(z.object({
  resource_id: z.string(),
  quantity_fixed: z.number().int().min(0).default(0),
  quantity_per_person: z.number().int().min(0).default(0),
}))

export const packRouter = new Hono<AppEnv>()

// ─── GET /packs — lista packs activos y visibles con precios ──────────────────
packRouter.get('/', async (c) => {
  const { results: packs } = await c.env.DB.prepare(
    'SELECT * FROM packs WHERE is_active = 1 AND is_hidden = 0 ORDER BY sort_order ASC, created_at DESC'
  ).all<Pack>()

  if (packs.length === 0) return success(c, [])

  const { results: prices } = await c.env.DB.prepare(
    `SELECT * FROM pack_prices WHERE pack_id IN (${packs.map(() => '?').join(',')}) ORDER BY people_count ASC`
  ).bind(...packs.map(p => p.id)).all<PackPrice>()

  const priceMap: Record<string, PackPrice[]> = {}
  prices.forEach(p => {
    if (!priceMap[p.pack_id]) priceMap[p.pack_id] = []
    priceMap[p.pack_id].push(p)
  })

  return success(c, packs.map(pack => ({ ...pack, prices: priceMap[pack.id] ?? [] })))
})

// ─── GET /packs/admin/all — lista admin (incluye ocultos e inactivos) ─────────
// IMPORTANTE: debe estar antes de /:id para que Hono no lo capture como id="admin"
packRouter.get('/admin/all', authMiddleware, adminOrAbove, async (c) => {
  const { results: packs } = await c.env.DB.prepare(
    'SELECT * FROM packs WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC'
  ).all<Pack>()

  if (packs.length === 0) return success(c, [])

  const { results: prices } = await c.env.DB.prepare(
    `SELECT * FROM pack_prices WHERE pack_id IN (${packs.map(() => '?').join(',')}) ORDER BY people_count ASC`
  ).bind(...packs.map(p => p.id)).all<PackPrice>()

  const priceMap: Record<string, PackPrice[]> = {}
  prices.forEach(p => {
    if (!priceMap[p.pack_id]) priceMap[p.pack_id] = []
    priceMap[p.pack_id].push(p)
  })

  return success(c, packs.map(pack => ({ ...pack, prices: priceMap[pack.id] ?? [] })))
})

// ─── GET /packs/:id — detalle completo ───────────────────────────────────────
// Los packs ocultos son accesibles por link directo. Los inactivos devuelven 404.
packRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const pack = await c.env.DB.prepare('SELECT * FROM packs WHERE id = ?').bind(id).first<Pack>()
  if (!pack) return error(c, 'Pack no encontrado', 404)
  if (!pack.is_active) return error(c, 'Pack no disponible', 404)

  const { results: prices } = await c.env.DB.prepare(
    'SELECT * FROM pack_prices WHERE pack_id = ? ORDER BY people_count ASC'
  ).bind(id).all<PackPrice>()

  const { results: packResources } = await c.env.DB.prepare(
    `SELECT pr.*, r.name AS resource_name, r.quantity AS resource_stock
     FROM pack_resources pr JOIN resources r ON r.id = pr.resource_id
     WHERE pr.pack_id = ?`
  ).bind(id).all<PackResource & { resource_name: string; resource_stock: number | null }>()

  return success(c, { ...pack, prices, resources: packResources })
})

// ─── GET /packs/:id/availability ─────────────────────────────────────────────
// ?date=YYYY-MM-DD → { available: bool }
// ?month=YYYY-MM  → { "YYYY-MM-DD": bool, ... }
packRouter.get('/:id/availability', async (c) => {
  const { id } = c.req.param()
  const { date, month } = c.req.query()

  if (!date && !month) return error(c, 'Se requiere date o month')

  const pack = await c.env.DB.prepare('SELECT id, is_active FROM packs WHERE id = ?').bind(id).first<Pick<Pack, 'id' | 'is_active'>>()
  if (!pack) return error(c, 'Pack no encontrado', 404)
  if (!pack.is_active) return error(c, 'Pack no disponible', 404)

  const packInfo = await c.env.DB.prepare('SELECT min_people FROM packs WHERE id = ?').bind(id).first<{ min_people: number }>()
  const minPeople = packInfo?.min_people ?? 1

  const { results: limitedResources } = await c.env.DB.prepare(
    `SELECT pr.resource_id FROM pack_resources pr
     JOIN resources r ON r.id = pr.resource_id
     WHERE pr.pack_id = ? AND r.quantity IS NOT NULL`
  ).bind(id).all<{ resource_id: string }>()

  if (limitedResources.length === 0) {
    if (date) return success(c, { available: true })
    const [yr, mn] = month!.split('-').map(Number)
    const dim = new Date(yr, mn, 0).getDate()
    const todayStr = new Date().toISOString().split('T')[0]
    const allMap: Record<string, boolean> = {}
    for (let d = 1; d <= dim; d++) {
      const ds = `${yr}-${String(mn).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      allMap[ds] = ds >= todayStr
    }
    return success(c, allMap)
  }

  const checkDate = async (checkDay: string, peopleCount: number): Promise<boolean> => {
    const rows = await c.env.DB.prepare(
      `SELECT r.quantity AS total_stock,
              (pr.quantity_fixed + pr.quantity_per_person * ?3) AS needed,
              COALESCE((
                SELECT SUM(pr2.quantity_fixed + pr2.quantity_per_person * o2.people_count)
                FROM orders o2
                JOIN pack_resources pr2 ON pr2.pack_id = o2.pack_id AND pr2.resource_id = pr.resource_id
                WHERE o2.date = ?2
                  AND o2.status IN ('pending_payment','pending_confirmation','confirmed')
              ), 0) AS consumed_today
       FROM pack_resources pr
       JOIN resources r ON r.id = pr.resource_id
       WHERE pr.pack_id = ?1 AND r.quantity IS NOT NULL`
    ).bind(id, checkDay, peopleCount).all<{
      total_stock: number
      needed: number
      consumed_today: number
    }>()

    return rows.results.every(r => r.total_stock - r.consumed_today >= r.needed)
  }

  if (date) {
    const pc = parseInt(c.req.query('people_count') ?? '0') || minPeople
    const available = await checkDate(date, pc)
    return success(c, { available })
  }

  const [year, mon] = month!.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const availabilityMap: Record<string, boolean> = {}
  const queries = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (dayStr < today) {
      availabilityMap[dayStr] = false
    } else {
      queries.push(dayStr)
    }
  }

  for (const dayStr of queries) {
    availabilityMap[dayStr] = await checkDate(dayStr, minPeople)
  }

  return success(c, availabilityMap)
})

// ─── POST /packs — crear pack ─────────────────────────────────────────────────
packRouter.post('/', authMiddleware, adminOrAbove, async (c) => {
  const body = await c.req.json()
  const parsed = packSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const id = generateId()
  const now = new Date().toISOString()
  const d = parsed.data

  await c.env.DB.prepare(
    `INSERT INTO packs (id, name, short_description, full_description, image_key, min_people, max_people, sort_order, category, is_active, is_hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).bind(id, d.name, d.short_description, d.full_description, d.image_key ?? null, d.min_people, d.max_people, d.sort_order, d.category ?? null, d.is_hidden ?? 0, now, now).run()

  const pack = await c.env.DB.prepare('SELECT * FROM packs WHERE id = ?').bind(id).first<Pack>()
  return success(c, pack, 'Pack creado', 201)
})

// ─── PATCH /packs/:id — editar pack ──────────────────────────────────────────
packRouter.patch('/:id', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = packSchema.partial().safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const fields = parsed.data
  const updates: string[] = []
  const bindings: unknown[] = []

  const allowed = ['name', 'short_description', 'full_description', 'image_key', 'min_people', 'max_people', 'sort_order', 'is_active', 'is_hidden', 'category'] as const
  for (const key of allowed) {
    if (fields[key as keyof typeof fields] !== undefined) {
      updates.push(`${key} = ?`)
      bindings.push(fields[key as keyof typeof fields])
    }
  }

  if (updates.length === 0) return error(c, 'Sin cambios')
  updates.push('updated_at = ?')
  bindings.push(new Date().toISOString(), id)

  await c.env.DB.prepare(`UPDATE packs SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()
  const pack = await c.env.DB.prepare('SELECT * FROM packs WHERE id = ?').bind(id).first<Pack>()
  return success(c, pack, 'Pack actualizado')
})

// ─── DELETE /packs/:id — desactivar ──────────────────────────────────────────
packRouter.delete('/:id', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  await c.env.DB.prepare('UPDATE packs SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id).run()
  return success(c, null, 'Pack desactivado')
})

// ─── POST /packs/:id/prices — upsert precios ─────────────────────────────────
packRouter.post('/:id/prices', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = priceSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos: array de { people_count, price }')

  await c.env.DB.prepare('DELETE FROM pack_prices WHERE pack_id = ?').bind(id).run()

  for (const item of parsed.data) {
    await c.env.DB.prepare(
      'INSERT INTO pack_prices (id, pack_id, people_count, price) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), id, item.people_count, item.price).run()
  }

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pack_prices WHERE pack_id = ? ORDER BY people_count ASC'
  ).bind(id).all<PackPrice>()

  return success(c, results, 'Precios actualizados')
})

// ─── POST /packs/:id/resources — asignar recursos ────────────────────────────
packRouter.post('/:id/resources', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = resourceSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos: array de { resource_id, quantity }')

  await c.env.DB.prepare('DELETE FROM pack_resources WHERE pack_id = ?').bind(id).run()

  for (const item of parsed.data) {
    await c.env.DB.prepare(
      'INSERT INTO pack_resources (id, pack_id, resource_id, quantity_fixed, quantity_per_person) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), id, item.resource_id, item.quantity_fixed, item.quantity_per_person).run()
  }

  const { results: updated } = await c.env.DB.prepare(
    `SELECT pr.*, r.name AS resource_name, r.quantity AS resource_stock
     FROM pack_resources pr JOIN resources r ON r.id = pr.resource_id
     WHERE pr.pack_id = ?`
  ).bind(id).all()

  return success(c, updated, 'Recursos actualizados')
})

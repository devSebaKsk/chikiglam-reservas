import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, Additional } from '../types'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  price: z.number().positive(),
  image_key: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  applicable_pack_ids: z.array(z.string()).optional().nullable(),
})

export const additionalRouter = new Hono<AppEnv>()

additionalRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM additionals WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
  ).all<Additional>()
  return success(c, results)
})

additionalRouter.get('/:id', async (c) => {
  const a = await c.env.DB.prepare('SELECT * FROM additionals WHERE id = ?').bind(c.req.param('id')).first<Additional>()
  if (!a) return error(c, 'Extra no encontrado', 404)
  return success(c, a)
})

additionalRouter.post('/', authMiddleware, adminOrAbove, async (c) => {
  const body = await c.req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const id = generateId()
  const now = new Date().toISOString()
  const d = parsed.data
  const packIds = d.applicable_pack_ids?.length ? JSON.stringify(d.applicable_pack_ids) : null
  await c.env.DB.prepare(
    `INSERT INTO additionals (id, name, description, price, image_key, sort_order, is_active, applicable_pack_ids, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).bind(id, d.name, d.description ?? null, d.price, d.image_key ?? null, d.sort_order, packIds, now, now).run()

  const a = await c.env.DB.prepare('SELECT * FROM additionals WHERE id = ?').bind(id).first<Additional>()
  return success(c, a, 'Extra creado', 201)
})

additionalRouter.patch('/:id', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = schema.partial().safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const f = parsed.data
  const updates: string[] = []
  const bindings: unknown[] = []
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined) continue
    if (k === 'applicable_pack_ids') {
      updates.push(`applicable_pack_ids = ?`)
      bindings.push(Array.isArray(v) && v.length > 0 ? JSON.stringify(v) : null)
    } else {
      updates.push(`${k} = ?`); bindings.push(v)
    }
  }
  if (updates.length === 0) return error(c, 'Sin cambios')
  updates.push('updated_at = ?')
  bindings.push(new Date().toISOString(), id)
  await c.env.DB.prepare(`UPDATE additionals SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()
  return success(c, await c.env.DB.prepare('SELECT * FROM additionals WHERE id = ?').bind(id).first(), 'Extra actualizado')
})

additionalRouter.delete('/:id', authMiddleware, adminOrAbove, async (c) => {
  await c.env.DB.prepare('UPDATE additionals SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), c.req.param('id')).run()
  return success(c, null, 'Extra desactivado')
})

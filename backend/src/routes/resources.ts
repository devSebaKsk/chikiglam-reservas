import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, Resource } from '../types'

const schema = z.object({
  name: z.string().min(2),
  quantity: z.number().int().min(0).nullable().optional(),
})

export const resourceRouter = new Hono<AppEnv>()

resourceRouter.use('*', authMiddleware, adminOrAbove)

resourceRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM resources ORDER BY name ASC').all<Resource>()
  return success(c, results)
})

resourceRouter.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')
  const id = generateId()
  const now = new Date().toISOString()
  await c.env.DB.prepare('INSERT INTO resources (id, name, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, parsed.data.name, parsed.data.quantity ?? null, now, now).run()
  return success(c, await c.env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first(), 'Recurso creado', 201)
})

resourceRouter.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const parsed = schema.partial().safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')
  const f = parsed.data
  const updates: string[] = []
  const bindings: unknown[] = []
  if (f.name !== undefined) { updates.push('name = ?'); bindings.push(f.name) }
  if (f.quantity !== undefined) { updates.push('quantity = ?'); bindings.push(f.quantity ?? null) }
  if (!updates.length) return error(c, 'Sin cambios')
  updates.push('updated_at = ?')
  bindings.push(new Date().toISOString(), id)
  await c.env.DB.prepare(`UPDATE resources SET ${updates.join(', ')} WHERE id = ?`).bind(...bindings).run()
  return success(c, await c.env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first(), 'Actualizado')
})

resourceRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM resources WHERE id = ?').bind(c.req.param('id')).run()
  return success(c, null, 'Recurso eliminado')
})

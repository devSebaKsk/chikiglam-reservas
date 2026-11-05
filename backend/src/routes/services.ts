import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, Service } from '../types'

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  duration: z.number().int().positive(),
  price: z.number().positive(),
  category: z.string(),
  imageUrl: z.string().url().optional(),
})

export const serviceRouter = new Hono<AppEnv>()

serviceRouter.get('/', async (c) => {
  const { category } = c.req.query()
  const query = category
    ? 'SELECT * FROM services WHERE is_active = 1 AND category = ? ORDER BY name'
    : 'SELECT * FROM services WHERE is_active = 1 ORDER BY name'
  const { results } = category
    ? await c.env.DB.prepare(query).bind(category).all<Service>()
    : await c.env.DB.prepare(query).all<Service>()
  return success(c, results)
})

serviceRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ? AND is_active = 1').bind(id).first<Service>()
  if (!service) return error(c, 'Servicio no encontrado', 404)
  return success(c, service)
})

serviceRouter.post('/', authMiddleware, adminOrAbove, async (c) => {
  const body = await c.req.json()
  const parsed = createServiceSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')
  const { name, description, duration, price, category, imageUrl } = parsed.data
  const id = generateId()
  await c.env.DB.prepare(
    'INSERT INTO services (id, name, description, duration, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, name, description, duration, price, category, imageUrl ?? null).run()
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first<Service>()
  return success(c, service, 'Servicio creado', 201)
})

serviceRouter.delete('/:id', authMiddleware, adminOrAbove, async (c) => {
  const { id } = c.req.param()
  const service = await c.env.DB.prepare('SELECT id FROM services WHERE id = ?').bind(id).first()
  if (!service) return error(c, 'Servicio no encontrado', 404)
  await c.env.DB.prepare('UPDATE services SET is_active = 0 WHERE id = ?').bind(id).run()
  return success(c, null, 'Servicio eliminado')
})

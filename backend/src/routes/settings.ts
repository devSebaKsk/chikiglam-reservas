import { Hono } from 'hono'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { success, error } from '../utils/response'
import type { AppEnv, Setting } from '../types'

export const settingsRouter = new Hono<AppEnv>()

settingsRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT key, value FROM settings').all<Setting>()
  const map: Record<string, string> = {}
  results.forEach(s => { map[s.key] = s.value })
  return success(c, map)
})

settingsRouter.get('/:key', async (c) => {
  const key = c.req.param('key')
  const row = await c.env.DB.prepare('SELECT key, value FROM settings WHERE key = ?').bind(key).first<Setting>()
  if (!row) return error(c, 'Setting no encontrado', 404)
  return success(c, { key: row.key, value: row.value })
})

settingsRouter.put('/', authMiddleware, adminOrAbove, async (c) => {
  const body = await c.req.json()
  if (typeof body !== 'object' || Array.isArray(body)) return error(c, 'Body debe ser un objeto')

  const now = new Date().toISOString()
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue
    await c.env.DB.prepare(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).bind(key, value, now).run()
  }

  return success(c, null, 'Configuración actualizada')
})

settingsRouter.put('/:key', authMiddleware, adminOrAbove, async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json<{ value: string }>()
  if (typeof body.value !== 'string') return error(c, 'value debe ser string')

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind(key, body.value, now).run()

  return success(c, { key, value: body.value })
})

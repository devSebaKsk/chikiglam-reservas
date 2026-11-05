import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, canManageEvents } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv } from '../types'

const registrationSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().min(6, 'El teléfono debe tener al menos 6 caracteres'),
  people_count: z.number().int().min(1).max(50),
})

export const eventRegistrationsRouter = new Hono<AppEnv>()

const ensureTable = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      people_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `).run()
}

// ─── POST /events/:id/registrations — inscripción pública (sin auth) ──────────
eventRegistrationsRouter.post('/:id/registrations', async (c) => {
  await ensureTable(c.env.DB)
  const { id } = c.req.param()

  const event = await c.env.DB.prepare('SELECT id FROM events WHERE id = ? AND is_active = 1').bind(id).first()
  if (!event) return error(c, 'Evento no encontrado', 404)

  const body = await c.req.json()
  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const { name, phone, people_count } = parsed.data
  const regId = generateId()
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    'INSERT INTO event_registrations (id, event_id, name, phone, people_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(regId, id, name, phone, people_count, 'pending', now).run()

  return success(c, { id: regId }, 'Inscripción registrada exitosamente', 201)
})

// ─── Rutas admin — requieren auth + canManageEvents ───────────────────────────
eventRegistrationsRouter.use('/:id/registrations/*', authMiddleware, canManageEvents)

// ─── GET /events/:id/registrations — listar inscripciones ────────────────────
eventRegistrationsRouter.get('/:id/registrations', async (c) => {
  await ensureTable(c.env.DB)
  const user = c.get('user')
  const { id } = c.req.param()

  const event = await c.env.DB.prepare('SELECT id, title, created_by FROM events WHERE id = ?')
    .bind(id)
    .first<{ id: string; title: string; created_by: string | null }>()
  if (!event) return error(c, 'Evento no encontrado', 404)

  // Organizer solo puede ver inscripciones de sus propios eventos
  if (user.role === 'organizer' && event.created_by !== user.sub) {
    return error(c, 'No tenés permiso para ver estas inscripciones', 403)
  }

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM event_registrations WHERE event_id = ? ORDER BY created_at DESC'
  ).bind(id).all()

  return success(c, { event: { id: event.id, title: event.title }, registrations: results })
})

// ─── PATCH /events/:id/registrations/:regId/confirm — confirmar inscripción ───
eventRegistrationsRouter.patch('/:id/registrations/:regId/confirm', async (c) => {
  await ensureTable(c.env.DB)
  const user = c.get('user')
  const { id, regId } = c.req.param()

  const event = await c.env.DB.prepare('SELECT id, created_by FROM events WHERE id = ?')
    .bind(id)
    .first<{ id: string; created_by: string | null }>()
  if (!event) return error(c, 'Evento no encontrado', 404)

  if (user.role === 'organizer' && event.created_by !== user.sub) {
    return error(c, 'No tenés permiso para gestionar este evento', 403)
  }

  const reg = await c.env.DB.prepare(
    'SELECT id, status FROM event_registrations WHERE id = ? AND event_id = ?'
  ).bind(regId, id).first<{ id: string; status: string }>()
  if (!reg) return error(c, 'Inscripción no encontrada', 404)

  await c.env.DB.prepare(
    'UPDATE event_registrations SET status = ? WHERE id = ?'
  ).bind('confirmed', regId).run()

  return success(c, null, 'Inscripción confirmada')
})

// ─── DELETE /events/:id/registrations/:regId — eliminar inscripción ───────────
eventRegistrationsRouter.delete('/:id/registrations/:regId', async (c) => {
  await ensureTable(c.env.DB)
  const user = c.get('user')
  const { id, regId } = c.req.param()

  const event = await c.env.DB.prepare('SELECT id, created_by FROM events WHERE id = ?')
    .bind(id)
    .first<{ id: string; created_by: string | null }>()
  if (!event) return error(c, 'Evento no encontrado', 404)

  if (user.role === 'organizer' && event.created_by !== user.sub) {
    return error(c, 'No tenés permiso para gestionar este evento', 403)
  }

  const reg = await c.env.DB.prepare(
    'SELECT id FROM event_registrations WHERE id = ? AND event_id = ?'
  ).bind(regId, id).first()
  if (!reg) return error(c, 'Inscripción no encontrada', 404)

  await c.env.DB.prepare('DELETE FROM event_registrations WHERE id = ?').bind(regId).run()

  return success(c, null, 'Inscripción eliminada')
})

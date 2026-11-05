import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, canManageEvents } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv } from '../types'

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(''),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  organizer_name: z.string().optional().default(''),
  instagram_url: z.string().optional().nullable(),
  image_key: z.string().nullable().optional(),
  is_active: z.number().int().optional().default(1),
  is_chiki_glam: z.number().int().optional().default(0),
})

const eventDatesSchema = z.array(z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().optional().default(''),
  end_time: z.string().optional().default(''),
}))

export const eventRouter = new Hono<AppEnv>()

const ensureTables = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      organizer_name TEXT NOT NULL DEFAULT '',
      image_key TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_chiki_glam INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run()
  // Migrate existing tables that may be missing new columns
  await db.prepare(`ALTER TABLE events ADD COLUMN organizer_name TEXT NOT NULL DEFAULT ''`).run().catch(() => {})
  await db.prepare(`ALTER TABLE events ADD COLUMN is_chiki_glam INTEGER NOT NULL DEFAULT 0`).run().catch(() => {})
  await db.prepare(`ALTER TABLE events ADD COLUMN created_by TEXT`).run().catch(() => {})
  await db.prepare(`ALTER TABLE events ADD COLUMN instagram_url TEXT`).run().catch(() => {})
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS event_dates (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run()
}

// ─── GET /events — lista pública de eventos activos ───────────────────────────
eventRouter.get('/', async (c) => {
  await ensureTables(c.env.DB)
  const { results: events } = await c.env.DB.prepare(
    'SELECT * FROM events WHERE is_active = 1 ORDER BY created_at DESC'
  ).all<Record<string, unknown>>()

  if (events.length === 0) return success(c, [])

  const ids = events.map(e => `'${e.id}'`).join(',')
  const { results: dates } = await c.env.DB.prepare(
    `SELECT * FROM event_dates WHERE event_id IN (${ids}) ORDER BY date ASC, start_time ASC`
  ).all<Record<string, unknown>>()

  const datesMap: Record<string, Record<string, unknown>[]> = {}
  for (const d of dates) {
    const eid = d.event_id as string
    if (!datesMap[eid]) datesMap[eid] = []
    datesMap[eid].push(d)
  }

  return success(c, events.map(e => ({ ...e, dates: datesMap[e.id as string] ?? [] })))
})

// ─── GET /events/:id — detalle público de un evento ──────────────────────────
eventRouter.get('/:id', async (c) => {
  await ensureTables(c.env.DB)
  const { id } = c.req.param()
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!event) return error(c, 'Evento no encontrado', 404)
  if (!event.is_active) return error(c, 'Evento no disponible', 404)

  const { results: dates } = await c.env.DB.prepare(
    'SELECT * FROM event_dates WHERE event_id = ? ORDER BY date ASC, start_time ASC'
  ).bind(id).all<Record<string, unknown>>()

  return success(c, { ...event, dates })
})

// ─── Admin routes — require auth + canManageEvents ────────────────────────────
eventRouter.use('*', authMiddleware, canManageEvents)

// ─── GET /events/admin/all — lista admin (incluye inactivos) ──────────────────
eventRouter.get('/admin/all', async (c) => {
  await ensureTables(c.env.DB)
  const user = c.get('user')

  // Organizer solo ve sus propios eventos
  const isOrganizer = user.role === 'organizer'
  const query = isOrganizer
    ? 'SELECT * FROM events WHERE created_by = ? ORDER BY created_at DESC'
    : 'SELECT * FROM events ORDER BY created_at DESC'
  const { results: events } = isOrganizer
    ? await c.env.DB.prepare(query).bind(user.sub).all<Record<string, unknown>>()
    : await c.env.DB.prepare(query).all<Record<string, unknown>>()

  if (events.length === 0) return success(c, [])

  const ids = events.map(e => `'${e.id}'`).join(',')
  const { results: dates } = await c.env.DB.prepare(
    `SELECT * FROM event_dates WHERE event_id IN (${ids}) ORDER BY date ASC, start_time ASC`
  ).all<Record<string, unknown>>()

  const datesMap: Record<string, Record<string, unknown>[]> = {}
  for (const d of dates) {
    const eid = d.event_id as string
    if (!datesMap[eid]) datesMap[eid] = []
    datesMap[eid].push(d)
  }

  return success(c, events.map(e => ({ ...e, dates: datesMap[e.id as string] ?? [] })))
})

// ─── POST /events — crear evento ──────────────────────────────────────────────
eventRouter.post('/', async (c) => {
  await ensureTables(c.env.DB)
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const parsedDates = eventDatesSchema.safeParse(body.dates ?? [])
  if (!parsedDates.success) return error(c, 'Fechas inválidas')

  const id = generateId()
  const now = new Date().toISOString()
  const { title, description, address, phone, organizer_name, instagram_url, image_key, is_active, is_chiki_glam } = parsed.data

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO events (id, title, description, address, phone, organizer_name, instagram_url, image_key, is_active, is_chiki_glam, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, title, description, address, phone, organizer_name, instagram_url ?? null, image_key ?? null, is_active, is_chiki_glam, user.sub, now, now),
    ...parsedDates.data.map(d =>
      c.env.DB.prepare(
        'INSERT INTO event_dates (id, event_id, date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(generateId(), id, d.date, d.start_time, d.end_time, now)
    ),
  ]

  await c.env.DB.batch(statements)
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first()
  return success(c, event, 'Evento creado', 201)
})

// ─── PATCH /events/:id — actualizar evento ────────────────────────────────────
eventRouter.patch('/:id', async (c) => {
  await ensureTables(c.env.DB)
  const user = c.get('user')
  const { id } = c.req.param()
  const event = await c.env.DB.prepare('SELECT id, created_by FROM events WHERE id = ?').bind(id).first<{ id: string; created_by: string | null }>()
  if (!event) return error(c, 'Evento no encontrado', 404)

  // Organizer solo puede editar sus propios eventos
  if (user.role === 'organizer' && event.created_by !== user.sub) {
    return error(c, 'No tenés permiso para editar este evento', 403)
  }

  const body = await c.req.json()
  const parsed = eventSchema.partial().safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const now = new Date().toISOString()
  const fields = parsed.data
  const sets: string[] = ['updated_at = ?']
  const vals: unknown[] = [now]

  if (fields.title !== undefined)          { sets.push('title = ?');          vals.push(fields.title) }
  if (fields.description !== undefined)   { sets.push('description = ?');    vals.push(fields.description) }
  if (fields.address !== undefined)       { sets.push('address = ?');        vals.push(fields.address) }
  if (fields.phone !== undefined)         { sets.push('phone = ?');          vals.push(fields.phone) }
  if (fields.organizer_name !== undefined){ sets.push('organizer_name = ?'); vals.push(fields.organizer_name) }
  if (fields.instagram_url !== undefined) { sets.push('instagram_url = ?');  vals.push(fields.instagram_url ?? null) }
  if (fields.image_key !== undefined)     { sets.push('image_key = ?');      vals.push(fields.image_key) }
  if (fields.is_active !== undefined)     { sets.push('is_active = ?');      vals.push(fields.is_active) }
  if (fields.is_chiki_glam !== undefined) { sets.push('is_chiki_glam = ?');  vals.push(fields.is_chiki_glam) }

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id),
  ]

  // Replace dates if provided
  if (Array.isArray(body.dates)) {
    const parsedDates = eventDatesSchema.safeParse(body.dates)
    if (!parsedDates.success) return error(c, 'Fechas inválidas')
    statements.push(c.env.DB.prepare('DELETE FROM event_dates WHERE event_id = ?').bind(id))
    for (const d of parsedDates.data) {
      statements.push(
        c.env.DB.prepare(
          'INSERT INTO event_dates (id, event_id, date, start_time, end_time, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(generateId(), id, d.date, d.start_time, d.end_time, now)
      )
    }
  }

  await c.env.DB.batch(statements)
  return success(c, null, 'Evento actualizado')
})

// ─── DELETE /events/:id — eliminar evento ────────────────────────────────────
eventRouter.delete('/:id', async (c) => {
  await ensureTables(c.env.DB)
  const user = c.get('user')
  const { id } = c.req.param()
  const event = await c.env.DB.prepare('SELECT id, created_by FROM events WHERE id = ?').bind(id).first<{ id: string; created_by: string | null }>()
  if (!event) return error(c, 'Evento no encontrado', 404)

  // Organizer solo puede eliminar sus propios eventos
  if (user.role === 'organizer' && event.created_by !== user.sub) {
    return error(c, 'No tenés permiso para eliminar este evento', 403)
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM event_dates WHERE event_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id),
  ])

  return success(c, null, 'Evento eliminado')
})

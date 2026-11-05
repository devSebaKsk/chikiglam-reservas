import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, Booking } from '../types'

const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
})

export const bookingRouter = new Hono<AppEnv>()

bookingRouter.use('*', authMiddleware)

bookingRouter.get('/', async (c) => {
  const { sub, role } = c.get('user')
  const query = role === 'admin'
    ? 'SELECT b.*, s.name as service_name, s.price as service_price FROM bookings b LEFT JOIN services s ON b.service_id = s.id ORDER BY b.created_at DESC'
    : 'SELECT b.*, s.name as service_name, s.price as service_price FROM bookings b LEFT JOIN services s ON b.service_id = s.id WHERE b.user_id = ? ORDER BY b.created_at DESC'
  const { results } = role === 'admin'
    ? await c.env.DB.prepare(query).all<Booking>()
    : await c.env.DB.prepare(query).bind(sub).all<Booking>()
  return success(c, results)
})

bookingRouter.get('/:id', async (c) => {
  const { sub, role } = c.get('user')
  const { id } = c.req.param()
  const booking = await c.env.DB.prepare(
    'SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON b.service_id = s.id WHERE b.id = ?'
  ).bind(id).first<Booking>()
  if (!booking) return error(c, 'Reserva no encontrada', 404)
  if (role !== 'admin' && booking.user_id !== sub) return error(c, 'Sin acceso', 403)
  return success(c, booking)
})

bookingRouter.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos: ' + parsed.error.message)

  const { sub } = c.get('user')
  const { serviceId, date, time, notes } = parsed.data

  const service = await c.env.DB.prepare('SELECT id FROM services WHERE id = ? AND is_active = 1').bind(serviceId).first()
  if (!service) return error(c, 'Servicio no disponible', 404)

  const conflict = await c.env.DB.prepare(
    'SELECT id FROM bookings WHERE service_id = ? AND date = ? AND time = ? AND status != ?'
  ).bind(serviceId, date, time, 'cancelled').first()
  if (conflict) return error(c, 'El horario no está disponible', 409)

  const id = generateId()
  await c.env.DB.prepare(
    'INSERT INTO bookings (id, user_id, service_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, sub, serviceId, date, time, 'pending', notes ?? null).run()

  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<Booking>()
  return success(c, booking, 'Reserva creada exitosamente', 201)
})

bookingRouter.patch('/:id/cancel', async (c) => {
  const { sub, role } = c.get('user')
  const { id } = c.req.param()
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<Booking>()
  if (!booking) return error(c, 'Reserva no encontrada', 404)
  if (role !== 'admin' && booking.user_id !== sub) return error(c, 'Sin acceso', 403)
  if (booking.status === 'cancelled') return error(c, 'La reserva ya está cancelada')
  await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind('cancelled', id).run()
  return success(c, { ...booking, status: 'cancelled' }, 'Reserva cancelada')
})

bookingRouter.get('/available', async (c) => {
  const { serviceId, date } = c.req.query()
  if (!serviceId || !date) return error(c, 'serviceId y date son requeridos')
  const allSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00']
  const { results } = await c.env.DB.prepare(
    'SELECT time FROM bookings WHERE service_id = ? AND date = ? AND status != ?'
  ).bind(serviceId, date, 'cancelled').all<{ time: string }>()
  const bookedSlots = results.map((r) => r.time)
  const available = allSlots.filter((s) => !bookedSlots.includes(s))
  return success(c, available)
})

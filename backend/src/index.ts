import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { authRouter } from './routes/auth'
import { bookingRouter } from './routes/bookings'
import { serviceRouter } from './routes/services'
import { userRouter } from './routes/users'
import { packRouter } from './routes/packs'
import { additionalRouter } from './routes/additionals'
import { resourceRouter } from './routes/resources'
import { orderRouter } from './routes/orders'
import { settingsRouter } from './routes/settings'
import { uploadRouter } from './routes/upload'
import { eventRouter } from './routes/events'
import { eventRegistrationsRouter } from './routes/eventRegistrations'
import { promoRouter } from './routes/promos'
import { pushRouter } from './routes/push'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'http://localhost:5173',
        'https://chikiglam.pages.dev',
        'https://chikiglam-reservas.pages.dev',
      ]
      // Permitir cualquier subdominio de pages.dev del proyecto (preview deploys)
      if (!origin || allowed.includes(origin) || origin.endsWith('.chikiglam-reservas.pages.dev')) return origin
      return allowed[0]
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

const api = app.basePath('/api')

// Legacy routes (kept for compatibility)
api.route('/auth',     authRouter)
api.route('/bookings', bookingRouter)
api.route('/services', serviceRouter)
api.route('/users',    userRouter)

// Public file serving (URL is non-guessable: contains UUID + timestamp)
api.get('/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '')
  const obj = await c.env.ASSETS_BUCKET.get(key)
  if (!obj) return c.json({ success: false, message: 'Archivo no encontrado' }, 404)
  const headers = new Headers()
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', 'private, max-age=3600')
  return new Response(obj.body, { headers })
})

// New ChikiGlam routes
api.route('/packs',       packRouter)
api.route('/additionals', additionalRouter)
api.route('/resources',   resourceRouter)
api.route('/orders',      orderRouter)
api.route('/settings',    settingsRouter)
api.route('/admin/upload', uploadRouter)
api.route('/events',      eventRouter)
api.route('/events',      eventRegistrationsRouter)
api.route('/promos',      promoRouter)
api.route('/push',        pushRouter)

app.notFound((c) => c.json({ success: false, message: 'Ruta no encontrada' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ success: false, message: 'Error interno del servidor' }, 500)
})

export default app

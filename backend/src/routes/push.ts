import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove } from '../middleware/auth'
import { success, error } from '../utils/response'
import { sendPush } from '../utils/webpush'
import type { AppEnv } from '../types'

export const pushRouter = new Hono<AppEnv>()

// Public — frontend needs the public key to subscribe
pushRouter.get('/vapid-key', (c) => {
  const key = c.env.VAPID_PUBLIC_KEY
  if (!key) return error(c, 'Push notifications no configuradas', 503)
  return success(c, { publicKey: key })
})

// Save or refresh a push subscription
pushRouter.post('/subscribe', authMiddleware, adminOrAbove, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const { endpoint, p256dh, auth } = z.object({
    endpoint: z.string().url(),
    p256dh: z.string(),
    auth: z.string(),
  }).parse(body)

  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  // Upsert by endpoint (ON CONFLICT REPLACE)
  await c.env.DB.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  `).bind(id, user.sub, endpoint, p256dh, auth, now).run()

  return success(c, null, 'Suscripción guardada')
})

// Remove a subscription by endpoint
pushRouter.delete('/subscribe', authMiddleware, adminOrAbove, async (c) => {
  const user = c.get('user')
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await c.req.json())
  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .bind(endpoint, user.sub).run()
  return success(c, null, 'Suscripción eliminada')
})

// Internal helper — called from orders.ts
export async function notifyAdmins(env: AppEnv['Bindings'], message?: string): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return

  const { results } = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions'
  ).all<{ endpoint: string; p256dh: string; auth: string }>()

  await Promise.allSettled(
    results.map(sub => sendPush(sub, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!, env.VAPID_SUBJECT!))
  )
}

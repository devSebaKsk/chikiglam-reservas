import type { Context } from 'hono'

export function success<T>(c: Context, data: T, message?: string, status: 200 | 201 = 200) {
  return c.json({ success: true, data, message }, status)
}

export function error(c: Context, message: string, status: 400 | 401 | 403 | 404 | 409 | 500 = 400) {
  return c.json({ success: false, message }, status)
}

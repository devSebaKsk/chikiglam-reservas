import type { Context } from 'hono'
import { ZodSchema } from 'zod'
import { error } from './response'

export async function validateBody<T>(c: Context, schema: ZodSchema<T>): Promise<T | null> {
  try {
    const body = await c.req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      error(c, result.error.errors[0]?.message ?? 'Datos inválidos')
      return null
    }
    return result.data
  } catch {
    error(c, 'JSON inválido')
    return null
  }
}

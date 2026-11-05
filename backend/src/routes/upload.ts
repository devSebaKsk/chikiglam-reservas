import { Hono } from 'hono'
import { authMiddleware, canManageEvents } from '../middleware/auth'
import { success, error } from '../utils/response'
import type { AppEnv } from '../types'

export const uploadRouter = new Hono<AppEnv>()

// GET /api/admin/upload/:key/serve — stream R2 object (public for catalog images)
uploadRouter.get('/:key{.+}/serve', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.ASSETS_BUCKET.get(key)
  if (!obj) return error(c, 'Archivo no encontrado', 404)

  const headers = new Headers()
  headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(obj.body, { headers })
})

uploadRouter.use('*', authMiddleware, canManageEvents)

// POST /api/admin/upload — subir imagen de pack o additional
uploadRouter.post('/', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const prefix = (formData.get('prefix') as string | null) ?? 'misc'

  if (!file) return error(c, 'Archivo requerido (campo: file)')

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) return error(c, 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileKey = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await c.env.ASSETS_BUCKET.put(fileKey, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  })

  const url = `/api/admin/upload/${fileKey}/serve`

  return success(c, { key: fileKey, url }, 'Imagen subida exitosamente', 201)
})

// GET /api/admin/upload/:key/url — obtener URL de imagen
uploadRouter.get('/:key{.+}/url', async (c) => {
  const key = c.req.param('key')

  const obj = await c.env.ASSETS_BUCKET.head(key)
  if (!obj) return error(c, 'Archivo no encontrado', 404)

  const url = `/api/admin/upload/${key}/serve`
  return success(c, { url, key })
})

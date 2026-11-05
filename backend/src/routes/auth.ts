import { Hono } from 'hono'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../utils/crypto'
import { signJWT } from '../utils/jwt'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import { authMiddleware } from '../middleware/auth'
import type { AppEnv, User, OtpCode } from '../types'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

const requestOtpSchema = z.object({
  phone: z.string().min(7, 'Teléfono inválido').regex(/^\+?[\d\s\-().]{7,}$/, 'Formato de teléfono inválido'),
  name: z.string().min(2).optional(),
})

const verifyOtpSchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6, 'El código debe tener 6 dígitos'),
})

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const authRouter = new Hono<AppEnv>()

// ─── OTP: solicitar código (clientes WhatsApp) ────────────────────────────────
authRouter.post('/request-otp', async (c) => {
  const body = await c.req.json()
  const parsed = requestOtpSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const { phone, name } = parsed.data
  const normalizedPhone = phone.replace(/\s/g, '')
  const now = new Date()

  // Buscar o crear usuario por teléfono
  let user = await c.env.DB.prepare(
    'SELECT id, name, phone, role FROM users WHERE phone = ?'
  ).bind(normalizedPhone).first<Pick<User, 'id' | 'name' | 'phone' | 'role'>>()

  if (!user) {
    const id = generateId()
    const createdAt = now.toISOString()
    await c.env.DB.prepare(
      `INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'client', 1, ?, ?)`
    ).bind(id, name ?? 'Usuario', normalizedPhone, createdAt, createdAt).run()
    user = { id, name: name ?? 'Usuario', phone: normalizedPhone, role: 'client' }
  }

  // Invalidar OTPs previos no usados para este teléfono
  await c.env.DB.prepare(
    'UPDATE otp_codes SET used = 1 WHERE phone = ? AND used = 0'
  ).bind(normalizedPhone).run()

  // Generar nuevo OTP (válido 10 minutos)
  const code = generateOtp()
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  const otpId = generateId()

  await c.env.DB.prepare(
    'INSERT INTO otp_codes (id, phone, code, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(otpId, normalizedPhone, code, expiresAt).run()

  // TODO: En producción enviar vía Whapi (WhatsApp API)
  // Por ahora: devolver el código solo en development
  const isDev = c.env.ENVIRONMENT !== 'production'

  return success(c, {
    sent: true,
    phone: normalizedPhone,
    ...(isDev ? { dev_code: code } : {}),
  }, isDev ? `OTP (dev): ${code}` : 'Código enviado por WhatsApp')
})

// ─── OTP: verificar código ────────────────────────────────────────────────────
authRouter.post('/verify-otp', async (c) => {
  const body = await c.req.json()
  const parsed = verifyOtpSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const { phone, code } = parsed.data
  const normalizedPhone = phone.replace(/\s/g, '')
  const now = new Date().toISOString()

  const otp = await c.env.DB.prepare(
    `SELECT * FROM otp_codes
     WHERE phone = ? AND code = ? AND used = 0 AND expires_at > ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(normalizedPhone, code, now).first<OtpCode>()

  if (!otp) return error(c, 'Código inválido o expirado', 401)

  // Marcar OTP como usado
  await c.env.DB.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').bind(otp.id).run()

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active FROM users WHERE phone = ?'
  ).bind(normalizedPhone).first<User>()

  if (!user || !user.is_active) return error(c, 'Cuenta no disponible', 403)

  const token = await signJWT(
    { sub: user.id, email: user.email, role: user.role },
    c.env.JWT_SECRET
  )

  return success(c, {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    token,
  }, 'Autenticado exitosamente')
})

// ─── Registro rápido de cliente (sin OTP) ────────────────────────────────────
authRouter.post('/quick-register', async (c) => {
  const body = await c.req.json<{ name?: string; phone?: string }>()
  const name = body.name?.trim()
  const phone = body.phone?.trim().replace(/\s/g, '')

  if (!name || name.length < 2) return error(c, 'Nombre requerido (mín. 2 caracteres)')
  if (!phone || phone.length < 7) return error(c, 'Teléfono requerido')

  const now = new Date().toISOString()

  let user = await c.env.DB.prepare(
    'SELECT id, name, phone, role, is_active FROM users WHERE phone = ?'
  ).bind(phone).first<Pick<User, 'id' | 'name' | 'phone' | 'role' | 'is_active'>>()

  if (!user) {
    const id = generateId()
    await c.env.DB.prepare(
      `INSERT INTO users (id, name, phone, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'client', 1, ?, ?)`
    ).bind(id, name, phone, now, now).run()
    user = { id, name, phone, role: 'client', is_active: 1 }
  } else if (!user.is_active) {
    return error(c, 'Cuenta no disponible', 403)
  } else {
    // Actualizar nombre si cambió
    await c.env.DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, now, user.id).run()
    user = { ...user, name }
  }

  const token = await signJWT(
    { sub: user.id, email: undefined as unknown as string, role: user.role },
    c.env.JWT_SECRET
  )

  return success(c, {
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    token,
  }, 'Registro exitoso')
})

// ─── Registro tradicional (admin crea staff) ──────────────────────────────────
authRouter.post('/register', async (c) => {
  const body = await c.req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return error(c, parsed.error.errors[0]?.message ?? 'Datos inválidos')

  const { name, email, password, phone } = parsed.data
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return error(c, 'El email ya está registrado', 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'client', 1, ?, ?)`
  ).bind(id, name, email, passwordHash, phone ?? null, now, now).run()

  const token = await signJWT({ sub: id, email, role: 'client' }, c.env.JWT_SECRET)
  return success(c, { user: { id, name, email, phone: phone ?? null, role: 'client' }, token }, 'Registro exitoso', 201)
})

// ─── Login tradicional (email + password) ─────────────────────────────────────
authRouter.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const { email, password } = parsed.data
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>()
  if (!user) return error(c, 'Credenciales incorrectas', 401)
  if (!user.is_active) return error(c, 'Cuenta desactivada. Contacta al administrador.', 403)
  if (!user.password_hash) return error(c, 'Esta cuenta usa autenticación por WhatsApp', 400)

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return error(c, 'Credenciales incorrectas', 401)

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET)
  return success(c, {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    token,
  })
})

// ─── Perfil ───────────────────────────────────────────────────────────────────
authRouter.get('/me', authMiddleware, async (c) => {
  const { sub } = c.get('user')
  const user = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ?'
  ).bind(sub).first<Omit<User, 'password_hash'>>()
  if (!user) return error(c, 'Usuario no encontrado', 404)
  if (!user.is_active) return error(c, 'Cuenta desactivada', 403)
  return success(c, user)
})

authRouter.post('/logout', authMiddleware, (c) => success(c, null, 'Sesión cerrada'))

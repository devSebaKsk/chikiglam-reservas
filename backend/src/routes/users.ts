import { Hono } from 'hono'
import { z } from 'zod'
import { authMiddleware, adminOrAbove, staffOrAbove } from '../middleware/auth'
import { canManage, assignableRoles, ALL_ROLES } from '../utils/roles'
import { hashPassword } from '../utils/crypto'
import { generateId } from '../utils/id'
import { success, error } from '../utils/response'
import type { AppEnv, User, UserRole } from '../types'

const updateRoleSchema = z.object({
  role: z.enum(['guest', 'client', 'employee', 'organizer', 'admin', 'superadmin']),
})

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(['guest', 'client', 'employee', 'organizer', 'admin', 'superadmin']).default('client'),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
})

export const userRouter = new Hono<AppEnv>()

userRouter.use('*', authMiddleware)

// ─── Listar usuarios ──────────────────────────────────────────────────────────
// superadmin y admin ven todos; employee solo ve clientes y guests
userRouter.get('/', staffOrAbove, async (c) => {
  const actor = c.get('user')
  const { role: filterRole, search, page = '1', limit = '20' } = c.req.query()

  const offset = (parseInt(page) - 1) * parseInt(limit)

  let whereClause = 'WHERE u.is_active = 1'
  const bindings: unknown[] = []

  // Empleados solo pueden ver clientes e invitados
  if (actor.role === 'employee') {
    whereClause += ` AND u.role IN ('client', 'guest')`
  }

  if (filterRole && ALL_ROLES.includes(filterRole as UserRole)) {
    whereClause += ' AND u.role = ?'
    bindings.push(filterRole)
  }

  if (search) {
    whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)'
    bindings.push(`%${search}%`, `%${search}%`)
  }

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM users u ${whereClause}`
  ).bind(...bindings).first<{ total: number }>()

  const { results } = await c.env.DB.prepare(
    `SELECT id, name, email, phone, role, is_active, created_at, updated_at
     FROM users u ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...bindings, parseInt(limit), offset).all<Omit<User, 'password_hash'>>()

  return success(c, {
    users: results,
    pagination: {
      total: countRow?.total ?? 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((countRow?.total ?? 0) / parseInt(limit)),
    },
  })
})

// ─── Obtener usuario por id ───────────────────────────────────────────────────
userRouter.get('/:id', async (c) => {
  const actor = c.get('user')
  const { id } = c.req.param()

  // Cada usuario puede ver su propio perfil; staff puede ver cualquiera
  const isSelf = actor.sub === id
  const isStaff = ['employee', 'admin', 'superadmin'].includes(actor.role)

  if (!isSelf && !isStaff) {
    return error(c, 'Acceso denegado', 403)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ?'
  ).bind(id).first<Omit<User, 'password_hash'>>()

  if (!user) return error(c, 'Usuario no encontrado', 404)
  return success(c, user)
})

// ─── Crear usuario (desde panel admin) ───────────────────────────────────────
userRouter.post('/', adminOrAbove, async (c) => {
  const actor = c.get('user')
  const body = await c.req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos: ' + parsed.error.errors[0]?.message)

  const { name, email, password, phone, role } = parsed.data

  // Solo puede asignar roles que están dentro de sus permisos
  if (!assignableRoles(actor.role).includes(role)) {
    return error(c, `No tienes permiso para crear usuarios con rol "${role}"`, 403)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return error(c, 'El email ya está registrado', 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, phone, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(id, name, email, passwordHash, phone ?? null, role, now, now).run()

  return success(
    c,
    { id, name, email, phone: phone ?? null, role, is_active: 1, created_at: now },
    'Usuario creado exitosamente',
    201
  )
})

// ─── Actualizar datos básicos del usuario ─────────────────────────────────────
userRouter.patch('/:id', async (c) => {
  const actor = c.get('user')
  const { id } = c.req.param()
  const isSelf = actor.sub === id
  const isStaff = ['employee', 'admin', 'superadmin'].includes(actor.role)

  if (!isSelf && !isStaff) return error(c, 'Acceso denegado', 403)

  const body = await c.req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Datos inválidos')

  const updates: string[] = []
  const bindings: unknown[] = []

  if (parsed.data.name) {
    updates.push('name = ?')
    bindings.push(parsed.data.name)
  }
  if (parsed.data.phone !== undefined) {
    updates.push('phone = ?')
    bindings.push(parsed.data.phone)
  }

  if (updates.length === 0) return error(c, 'Sin cambios')

  updates.push('updated_at = ?')
  bindings.push(new Date().toISOString(), id)

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...bindings).run()

  const updated = await c.env.DB.prepare(
    'SELECT id, name, email, phone, role, is_active, created_at, updated_at FROM users WHERE id = ?'
  ).bind(id).first()

  return success(c, updated, 'Usuario actualizado')
})

// ─── Cambiar rol de usuario ───────────────────────────────────────────────────
// Solo superadmin puede cambiar a admin/superadmin
// Admin puede cambiar entre employee, client, guest
userRouter.patch('/:id/role', adminOrAbove, async (c) => {
  const actor = c.get('user')
  const { id } = c.req.param()

  const body = await c.req.json()
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) return error(c, 'Rol inválido')

  const { role: newRole } = parsed.data

  const target = await c.env.DB.prepare(
    'SELECT id, name, email, role FROM users WHERE id = ?'
  ).bind(id).first<Pick<User, 'id' | 'name' | 'email' | 'role'>>()

  if (!target) return error(c, 'Usuario no encontrado', 404)

  // No puedes cambiar el rol de alguien con igual o mayor jerarquía
  if (!canManage(actor.role, target.role)) {
    return error(c, 'No puedes modificar el rol de este usuario', 403)
  }

  // No puedes asignar un rol que no tienes permiso de asignar
  if (!assignableRoles(actor.role).includes(newRole)) {
    return error(c, `No tienes permiso para asignar el rol "${newRole}"`, 403)
  }

  await c.env.DB.prepare(
    'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
  ).bind(newRole, new Date().toISOString(), id).run()

  return success(c, { ...target, role: newRole }, `Rol actualizado a "${newRole}"`)
})

// ─── Desactivar usuario (soft delete) ────────────────────────────────────────
userRouter.delete('/:id', adminOrAbove, async (c) => {
  const actor = c.get('user')
  const { id } = c.req.param()

  if (actor.sub === id) return error(c, 'No puedes desactivar tu propia cuenta')

  const target = await c.env.DB.prepare(
    'SELECT id, role FROM users WHERE id = ?'
  ).bind(id).first<Pick<User, 'id' | 'role'>>()

  if (!target) return error(c, 'Usuario no encontrado', 404)

  if (!canManage(actor.role, target.role)) {
    return error(c, 'No puedes desactivar a este usuario', 403)
  }

  await c.env.DB.prepare(
    'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), id).run()

  return success(c, null, 'Usuario desactivado')
})

// ─── Reactivar usuario ────────────────────────────────────────────────────────
userRouter.patch('/:id/activate', adminOrAbove, async (c) => {
  const actor = c.get('user')
  const { id } = c.req.param()

  const target = await c.env.DB.prepare(
    'SELECT id, role FROM users WHERE id = ?'
  ).bind(id).first<Pick<User, 'id' | 'role'>>()

  if (!target) return error(c, 'Usuario no encontrado', 404)
  if (!canManage(actor.role, target.role)) return error(c, 'Sin permisos', 403)

  await c.env.DB.prepare(
    'UPDATE users SET is_active = 1, updated_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), id).run()

  return success(c, null, 'Usuario reactivado')
})

// ─── Listar roles disponibles para asignar ────────────────────────────────────
userRouter.get('/meta/assignable-roles', adminOrAbove, (c) => {
  const actor = c.get('user')
  return success(c, assignableRoles(actor.role))
})

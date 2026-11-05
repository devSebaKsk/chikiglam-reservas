import { createMiddleware } from 'hono/factory'
import { verifyJWT } from '../utils/jwt'
import { hasRole, isAtLeast, ROLE_DESCRIPTIONS } from '../utils/roles'
import type { Env, JWTPayload, UserRole } from '../types'

type AuthVariables = { Variables: { user: JWTPayload } }

/**
 * Verifica el JWT y carga el payload en c.var.user.
 * Requerido en todas las rutas privadas.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env } & AuthVariables>(
  async (c, next) => {
    const authorization = c.req.header('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return c.json({ success: false, message: 'Token de autorización requerido' }, 401)
    }

    const token = authorization.slice(7)
    const payload = await verifyJWT(token, c.env.JWT_SECRET)

    if (!payload) {
      return c.json({ success: false, message: 'Token inválido o expirado' }, 401)
    }

    c.set('user', payload)
    await next()
  }
)

/**
 * Fábrica de middleware de autorización por rol exacto.
 *
 * Uso:
 *   router.get('/admin-only', authMiddleware, requireRole('admin', 'superadmin'), handler)
 *
 * Acepta uno o más roles. El usuario debe tener ALGUNO de ellos.
 * El superadmin siempre pasa.
 */
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<{ Bindings: Env } & AuthVariables>(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ success: false, message: 'No autenticado' }, 401)
    }

    // El superadmin siempre tiene acceso
    if (user.role === 'superadmin') {
      await next()
      return
    }

    if (!hasRole(user.role, roles)) {
      const required = roles.map((r) => ROLE_DESCRIPTIONS[r]).join(' o ')
      return c.json(
        { success: false, message: `Acceso denegado. Se requiere: ${required}` },
        403
      )
    }

    await next()
  })
}

/**
 * Middleware para requerir al menos un nivel mínimo en la jerarquía.
 *
 * Uso:
 *   router.get('/staff', authMiddleware, requireAtLeast('employee'), handler)
 *
 * Pasan: employee, admin, superadmin
 */
export function requireAtLeast(minRole: UserRole) {
  return createMiddleware<{ Bindings: Env } & AuthVariables>(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ success: false, message: 'No autenticado' }, 401)
    }

    if (!isAtLeast(user.role, minRole)) {
      return c.json(
        {
          success: false,
          message: `Acceso denegado. Se requiere al menos rol de ${ROLE_DESCRIPTIONS[minRole]}`,
        },
        403
      )
    }

    await next()
  })
}

// Shortcuts de uso frecuente
export const superadminOnly  = requireRole('superadmin')
export const adminOrAbove    = requireAtLeast('admin')
export const staffOrAbove    = requireAtLeast('employee')
export const clientOrAbove   = requireAtLeast('client')
export const canManageEvents = requireRole('organizer', 'admin', 'superadmin')

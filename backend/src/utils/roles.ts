import type { UserRole } from '../types'

/**
 * Jerarquía numérica de roles.
 * Valor mayor = más privilegios.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest:      1,
  client:     2,
  employee:   3,
  organizer:  3,
  admin:      4,
  superadmin: 5,
}

/**
 * Todos los roles válidos del sistema.
 */
export const ALL_ROLES: UserRole[] = ['guest', 'client', 'employee', 'organizer', 'admin', 'superadmin']

/**
 * Roles que pueden autenticarse con usuario/contraseña normal.
 * Los guests se crean por invitación y pueden no tener contraseña propia.
 */
export const AUTHENTICABLE_ROLES: UserRole[] = ['client', 'employee', 'organizer', 'admin', 'superadmin']

/**
 * Descripción corta de cada rol (para logs, respuestas de error, etc.)
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Super Administrador del sistema',
  admin:      'Administrador del local',
  employee:   'Empleado del local',
  organizer:  'Organizador de eventos externos',
  client:     'Cliente registrado',
  guest:      'Invitado de evento',
}

/**
 * Comprueba si `userRole` tiene exactamente uno de los `allowedRoles`.
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Comprueba si `userRole` tiene al menos el nivel de `minRole` en la jerarquía.
 * Ejemplo: isAtLeast('admin', 'employee') → true
 *          isAtLeast('client', 'employee') → false
 */
export function isAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/**
 * Comprueba si `userRole` está estrictamente por encima de `targetRole`.
 */
export function isAbove(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole]
}

/**
 * Devuelve true si el rol puede gestionar (editar/eliminar) al targetRole.
 * Regla: solo puedes gestionar roles de menor jerarquía que el tuyo.
 * El superadmin puede gestionar a todos.
 */
export function canManage(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'superadmin') return true
  return isAbove(actorRole, targetRole)
}

/**
 * Devuelve los roles que `actorRole` puede asignar a otros usuarios.
 */
export function assignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === 'superadmin') return ALL_ROLES
  return ALL_ROLES.filter((r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[actorRole])
}

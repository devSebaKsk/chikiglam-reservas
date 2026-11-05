import type { UserRole } from '@/types'

/**
 * Jerarquía numérica — mismo orden que el backend.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  guest:      1,
  client:     2,
  employee:   3,
  organizer:  3,
  admin:      4,
  superadmin: 5,
}

/** Etiquetas en español para mostrar en UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  admin:      'Administrador',
  employee:   'Empleado',
  organizer:  'Organizador',
  client:     'Cliente',
  guest:      'Invitado',
}

/** Descripción larga para tooltips / panels */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Control total del sistema',
  admin:      'Administra el local y sus eventos',
  employee:   'Gestiona operaciones del local',
  organizer:  'Publica y gestiona sus propios eventos',
  client:     'Puede ver y gestionar sus reservas',
  guest:      'Acceso limitado — solo entradas de eventos',
}

/** Clases de Tailwind para badge de rol */
export const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  superadmin: 'bg-purple-100 text-purple-800 border border-purple-200',
  admin:      'bg-blue-100 text-blue-800 border border-blue-200',
  employee:   'bg-cyan-100 text-cyan-800 border border-cyan-200',
  organizer:  'bg-violet-100 text-violet-800 border border-violet-200',
  client:     'bg-green-100 text-green-800 border border-green-200',
  guest:      'bg-gray-100 text-gray-600 border border-gray-200',
}

/** Color de ícono / acento para cada rol */
export const ROLE_ACCENT_COLOR: Record<UserRole, string> = {
  superadmin: '#a855f7',
  admin:      '#3b82f6',
  employee:   '#06b6d4',
  organizer:  '#7c3aed',
  client:     '#22c55e',
  guest:      '#9ca3af',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** El usuario tiene exactamente uno de los roles indicados. */
export function hasRole(userRole: UserRole, roles: UserRole[]): boolean {
  return roles.includes(userRole)
}

/** El usuario tiene al menos el nivel `minRole` en la jerarquía. */
export function isAtLeast(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/** El usuario puede gestionar (editar/eliminar) a un usuario con `targetRole`. */
export function canManage(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === 'superadmin') return true
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}

/** Devuelve los roles que `actorRole` puede asignar. */
export function assignableRoles(actorRole: UserRole): UserRole[] {
  const all: UserRole[] = ['guest', 'client', 'employee', 'organizer', 'admin', 'superadmin']
  if (actorRole === 'superadmin') return all
  return all.filter((r) => ROLE_HIERARCHY[r] < ROLE_HIERARCHY[actorRole])
}

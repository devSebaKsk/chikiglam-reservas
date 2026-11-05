import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { isAtLeast } from '@utils/roles'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  /**
   * Nivel mínimo requerido (jerarquía).
   * Ejemplo: minRole="employee" → pasan employee, admin, superadmin.
   * Por defecto: 'client' (cualquier usuario autenticado).
   */
  minRole?: UserRole

  /**
   * Lista exacta de roles permitidos (OR).
   * Si se especifica, tiene precedencia sobre minRole.
   */
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({
  minRole = 'client',
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = user.role

  const allowed = allowedRoles
    ? allowedRoles.includes(role)
    : isAtLeast(role, minRole)

  if (!allowed) {
    // Redirige a la pantalla apropiada según el rol
    const fallback =
      role === 'guest'  ? '/my-tickets' :
      '/dashboard'

    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}

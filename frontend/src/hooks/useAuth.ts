import { useAppSelector, useAppDispatch } from '@store/hooks'
import { logout } from '@store/slices/authSlice'
import { hasRole, isAtLeast, canManage } from '@utils/roles'
import type { UserRole } from '@/types'

export const useAuth = () => {
  const dispatch = useAppDispatch()
  const { user, token, isLoading, error, otpSent, otpPhone, devOtpCode } = useAppSelector(s => s.auth)
  const role: UserRole = user?.role ?? 'guest'

  return {
    user, token, isLoading, error,
    otpSent, otpPhone, devOtpCode,
    isAuthenticated: !!token,
    hasRole: (...roles: UserRole[]) => hasRole(role, roles),
    isAtLeast: (minRole: UserRole) => isAtLeast(role, minRole),
    canManage: (targetRole: UserRole) => canManage(role, targetRole),
    isSuperAdmin:  role === 'superadmin',
    isAdmin:       isAtLeast(role, 'admin'),
    isEmployee:    isAtLeast(role, 'employee'),
    isOrganizer:   role === 'organizer',
    isClient:      isAtLeast(role, 'client'),
    isGuest:       role === 'guest',
    canManageEvents: hasRole(role, ['organizer', 'admin', 'superadmin']),
    logout: () => dispatch(logout()),
  }
}

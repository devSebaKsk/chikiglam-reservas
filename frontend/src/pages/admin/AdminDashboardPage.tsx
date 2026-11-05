import { useGsapFadeIn } from '@hooks/useGsap'
import { useAuth } from '@hooks/useAuth'
import { Link } from 'react-router-dom'
import { ROLE_LABELS, ROLE_BADGE_STYLES } from '@utils/roles'

export default function AdminDashboardPage() {
  const ref = useGsapFadeIn()
  const { user } = useAuth()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={ref}>
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Panel de Administración</h1>
          {user?.role && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/users" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-900">Usuarios</h3>
            <p className="text-gray-500 text-sm mt-1">Gestionar clientes, empleados e invitados</p>
          </Link>
          <Link to="/staff" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🗂️</div>
            <h3 className="font-semibold text-gray-900">Reservas</h3>
            <p className="text-gray-500 text-sm mt-1">Ver todas las reservas del local</p>
          </Link>
          <div className="card opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-3">🎉</div>
            <h3 className="font-semibold text-gray-900">Eventos</h3>
            <p className="text-gray-500 text-sm mt-1">Próximamente</p>
          </div>
          <div className="card opacity-50 cursor-not-allowed">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900">Reportes</h3>
            <p className="text-gray-500 text-sm mt-1">Próximamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}

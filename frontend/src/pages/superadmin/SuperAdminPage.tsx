import { useGsapFadeIn } from '@hooks/useGsap'
import { ROLE_BADGE_STYLES } from '@utils/roles'

export default function SuperAdminPage() {
  const ref = useGsapFadeIn()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={ref}>
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Super Admin</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ROLE_BADGE_STYLES['superadmin']}`}>
            Control Total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '🏢', title: 'Tenants / Locales',  desc: 'Gestionar todos los locales del sistema' },
            { icon: '👑', title: 'Todos los Usuarios', desc: 'Ver y gestionar cualquier usuario' },
            { icon: '⚙️', title: 'Configuración',      desc: 'Configuración global del sistema' },
            { icon: '📊', title: 'Analytics',          desc: 'Métricas globales de la plataforma' },
            { icon: '🔑', title: 'Roles y Permisos',   desc: 'Gestión avanzada de roles' },
            { icon: '🗄️', title: 'Base de Datos',      desc: 'Herramientas de administración de datos' },
          ].map((item) => (
            <div key={item.title} className="card hover:shadow-md transition-shadow opacity-70 cursor-not-allowed">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
              <span className="text-xs text-purple-500 font-medium mt-2 block">Próximamente</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

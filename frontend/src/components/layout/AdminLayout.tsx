import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import Toast from '@components/ui/Toast'
import { getPushState, subscribeToPush, unsubscribeFromPush, registerServiceWorker } from '@services/pushService'

const ALL_NAV_ITEMS = [
  { to: '/admin/packs',       label: '📦 Packs',    adminOnly: true },
  { to: '/admin/additionals', label: '✨ Extras',   adminOnly: true },
  { to: '/admin/resources',   label: '🏕 Recursos', adminOnly: true },
  { to: '/admin/orders',      label: '📋 Reservas', adminOnly: true },
  { to: '/admin/events',      label: '🎪 Eventos',  adminOnly: false },
  { to: '/admin/promos',       label: '🎟️ Promos',   adminOnly: true },
  { to: '/admin/settings',    label: '⚙️ Config',   adminOnly: true },
  { to: '/admin/users',       label: '👥 Usuarios', adminOnly: true },
]

export default function AdminLayout() {
  const { user, logout, isOrganizer, isAdmin } = useAuth()
  const [pushState, setPushState] = useState<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'>('loading')

  const navItems = isOrganizer
    ? ALL_NAV_ITEMS.filter(item => !item.adminOnly)
    : isAdmin
      ? ALL_NAV_ITEMS
      : ALL_NAV_ITEMS

  useEffect(() => {
    registerServiceWorker()
    getPushState().then(setPushState)
  }, [])

  const handleTogglePush = async () => {
    if (pushState === 'subscribed') {
      await unsubscribeFromPush()
      setPushState('unsubscribed')
    } else if (pushState === 'unsubscribed') {
      setPushState('loading')
      const ok = await subscribeToPush()
      setPushState(ok ? 'subscribed' : await getPushState())
    }
  }

  const bellIcon = pushState === 'subscribed' ? '🔔' : pushState === 'denied' ? '🔕' : pushState === 'unsupported' ? '' : '🔔'
  const bellTitle = pushState === 'subscribed' ? 'Notificaciones activas — tocar para desactivar'
    : pushState === 'denied' ? 'Notificaciones bloqueadas en el navegador'
    : pushState === 'unsupported' ? ''
    : 'Activar notificaciones de nuevas reservas'

  return (
    <div className="flex justify-center bg-zinc-950 min-h-screen">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col">
        {/* Admin top bar */}
        <div className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 h-12">
            <span className="text-sm font-medium text-zinc-300">
              {isOrganizer ? 'Organizador' : 'Admin'} — <span className="text-brand-pink">{user?.name}</span>
            </span>
            <div className="flex items-center gap-3">
              {bellIcon && (
                <button
                  onClick={handleTogglePush}
                  disabled={pushState === 'denied' || pushState === 'loading'}
                  title={bellTitle}
                  className={`text-base transition-opacity ${pushState === 'subscribed' ? 'opacity-100' : 'opacity-40'} disabled:cursor-not-allowed`}
                >
                  {pushState === 'loading' ? '⏳' : bellIcon}
                </button>
              )}
              <button onClick={logout} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex overflow-x-auto bg-zinc-900 border-b border-zinc-800 no-scrollbar">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-shrink-0 text-xs px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-brand-pink text-brand-pink'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <Toast />
      </div>
    </div>
  )
}

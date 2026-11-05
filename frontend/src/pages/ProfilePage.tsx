import { useAuth } from '@hooks/useAuth'
import { useGsapFadeIn } from '@hooks/useGsap'

export default function ProfilePage() {
  const { user } = useAuth()
  const ref = useGsapFadeIn()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={ref} className="card shadow-xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-600">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
            <p className="text-gray-900">{user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          {user?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
              <p className="text-gray-900">{user.phone}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Rol</label>
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

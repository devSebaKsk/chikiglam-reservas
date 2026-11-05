import { useGsapFadeIn } from '@hooks/useGsap'
import { useAuth } from '@hooks/useAuth'

export default function MyTicketsPage() {
  const ref = useGsapFadeIn()
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={ref}>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Mis Entradas</h1>
        <p className="text-gray-500 mb-8">Hola {user?.name}, aquí están tus entradas para los eventos.</p>

        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎟️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin entradas aún</h3>
          <p className="text-gray-500">Tus entradas de eventos aparecerán aquí.</p>
        </div>
      </div>
    </div>
  )
}

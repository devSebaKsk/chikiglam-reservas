import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { fetchBookings } from '@store/slices/bookingSlice'
import { useAuth } from '@hooks/useAuth'
import { useGsapFadeIn } from '@hooks/useGsap'
import LoadingSpinner from '@components/ui/LoadingSpinner'

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const { bookings, isLoading } = useAppSelector((state) => state.booking)
  const headerRef = useGsapFadeIn()

  useEffect(() => {
    dispatch(fetchBookings())
  }, [dispatch])

  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div ref={headerRef} className="mb-10">
        <h1 className="text-3xl font-display font-bold text-gray-900">
          Hola, {user?.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">Gestiona tus reservas desde aquí</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="card bg-primary-50 border-primary-100">
          <div className="text-3xl font-bold text-primary-600">{bookings.length}</div>
          <div className="text-gray-600 text-sm mt-1">Total Reservas</div>
        </div>
        <div className="card bg-green-50 border-green-100">
          <div className="text-3xl font-bold text-green-600">{bookings.filter(b => b.status === 'confirmed').length}</div>
          <div className="text-gray-600 text-sm mt-1">Confirmadas</div>
        </div>
        <div className="card bg-yellow-50 border-yellow-100">
          <div className="text-3xl font-bold text-yellow-600">{bookings.filter(b => b.status === 'pending').length}</div>
          <div className="text-gray-600 text-sm mt-1">Pendientes</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Mis Reservas</h2>
        <Link to="/dashboard/booking" className="btn-primary text-sm">
          + Nueva Reserva
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin reservas aún</h3>
          <p className="text-gray-500 mb-6">Crea tu primera reserva y comienza tu experiencia.</p>
          <Link to="/dashboard/booking" className="btn-primary">Reservar ahora</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{booking.service?.name ?? 'Servicio'}</h3>
                  <p className="text-gray-500 text-sm mt-1">{booking.date} — {booking.time}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[booking.status]}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

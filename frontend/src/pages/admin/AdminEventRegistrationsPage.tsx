import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { eventService } from '@services/eventService'
import type { EventRegistration } from '@/types'

function buildWhatsAppUrl(phone: string, name: string, eventTitle: string, peopleCount: number): string {
  const cleanPhone = phone.replace(/[\s\-().+]/g, '')
  const msg = `Hola ${name} te escribo por ${eventTitle} al cual pusiste que van ${peopleCount} persona${peopleCount !== 1 ? 's' : ''}`
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
}

export default function AdminEventRegistrationsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const ref = useGsapFadeIn()

  const [eventTitle, setEventTitle] = useState('')
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    eventService.getRegistrations(id)
      .then(({ event, registrations }) => {
        setEventTitle(event.title)
        setRegistrations(registrations)
      })
      .catch(() => dispatch(addToast({ message: 'Error al cargar inscripciones', type: 'error' })))
      .finally(() => setLoading(false))
  }, [id])

  const handleConfirm = async (reg: EventRegistration) => {
    setConfirmingId(reg.id)
    try {
      await eventService.confirmRegistration(id!, reg.id)
      setRegistrations(rs => rs.map(r => r.id === reg.id ? { ...r, status: 'confirmed' } : r))
      dispatch(addToast({ message: 'Inscripción confirmada', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al confirmar', type: 'error' }))
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDelete = async (reg: EventRegistration) => {
    if (!window.confirm(`¿Eliminar la inscripción de ${reg.name}?`)) return
    setDeletingId(reg.id)
    try {
      await eventService.deleteRegistration(id!, reg.id)
      setRegistrations(rs => rs.filter(r => r.id !== reg.id))
      dispatch(addToast({ message: 'Inscripción eliminada', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
    } finally {
      setDeletingId(null)
    }
  }

  const pending = registrations.filter(r => r.status === 'pending').length
  const total = registrations.length

  return (
    <div ref={ref} className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate('/admin/events')}
          className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0"
        >
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-display font-bold text-zinc-100 truncate">
            {loading ? 'Cargando...' : eventTitle}
          </h1>
          {!loading && (
            <p className="text-zinc-500 text-xs">
              {total} inscripto{total !== 1 ? 's' : ''}{pending > 0 ? ` · ${pending} pendiente${pending !== 1 ? 's' : ''}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-zinc-500 text-sm">Todavía no hay inscripciones.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.map(reg => (
              <div key={reg.id} className="dark-card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 font-semibold">{reg.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{reg.phone} · {reg.peopleCount} persona{reg.peopleCount !== 1 ? 's' : ''}</p>
                    <p className="text-zinc-600 text-xs mt-0.5">
                      {new Date(reg.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    reg.status === 'confirmed'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {reg.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <a
                    href={buildWhatsAppUrl(reg.phone, reg.name, eventTitle, reg.peopleCount)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors text-sm font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.855L.057 23.272a.75.75 0 0 0 .916.919l5.453-1.43A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.964-1.355l-.355-.212-3.679.965.982-3.594-.232-.37A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                    </svg>
                    Contactar
                  </a>
                  {reg.status === 'pending' && (
                    <button
                      onClick={() => handleConfirm(reg)}
                      disabled={confirmingId === reg.id}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors text-sm font-medium disabled:opacity-40"
                    >
                      {confirmingId === reg.id ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(reg)}
                    disabled={deletingId === reg.id}
                    className="w-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm disabled:opacity-40 flex items-center justify-center"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

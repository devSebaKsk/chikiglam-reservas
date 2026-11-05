import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { eventService } from '@services/eventService'
import type { ChikiEvent } from '@/types'

interface RegForm {
  name: string
  phone: string
  peopleCount: string
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ref = useGsapFadeIn()

  const [event, setEvent] = useState<ChikiEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [form, setForm] = useState<RegForm>({ name: '', phone: '', peopleCount: '1' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    eventService.getById(id)
      .then(setEvent)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const peopleCount = parseInt(form.peopleCount)
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.')
      return
    }
    if (!form.phone.trim() || form.phone.trim().length < 6) {
      setError('Ingresá un teléfono válido.')
      return
    }
    if (isNaN(peopleCount) || peopleCount < 1) {
      setError('La cantidad de personas debe ser al menos 1.')
      return
    }
    setSubmitting(true)
    try {
      await eventService.registerPublic(id!, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        people_count: peopleCount,
      })
      setSubmitted(true)
    } catch {
      setError('Ocurrió un error al enviar tu inscripción. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4 max-w-[430px] mx-auto">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-8 rounded-xl w-3/4" />
        <div className="skeleton h-4 rounded-lg" />
        <div className="skeleton h-4 rounded-lg w-2/3" />
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-5xl mb-4">🎪</div>
        <p className="text-zinc-300 font-semibold mb-1">Evento no encontrado</p>
        <p className="text-zinc-500 text-sm mb-6">El evento que buscás no existe o ya no está disponible.</p>
        <button onClick={() => navigate('/')} className="btn-brand px-6 py-2">Ir al inicio</button>
      </div>
    )
  }

  return (
    <div ref={ref} className="pb-32">
      {/* Hero image */}
      {event.imageKey && (
        <div className="w-full h-52 overflow-hidden">
          <img
            src={`/api/admin/upload/${event.imageKey}/serve`}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="px-4 py-6 space-y-6">
        {/* Title & meta */}
        <div>
          {event.isChikiGlam && (
            <span className="text-xs font-semibold text-brand-yellow bg-brand-yellow/10 px-2 py-0.5 rounded-full mb-2 inline-block">
              ⭐ Evento ChikiGlam
            </span>
          )}
          <h1 className="text-2xl font-display font-bold text-zinc-100 mt-1">{event.title}</h1>
          {event.organizerName && (
            <p className="text-zinc-400 text-sm mt-1">Por {event.organizerName}</p>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
        )}

        {/* Dates */}
        {event.dates.length > 0 && (
          <div className="dark-card p-4 space-y-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">Fechas</p>
            {event.dates.map(d => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-brand-pink text-sm">📅</span>
                <div>
                  <p className="text-zinc-200 text-sm font-medium">
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                  {(d.startTime || d.endTime) && (
                    <p className="text-zinc-500 text-xs">
                      {d.startTime}{d.endTime ? ` — ${d.endTime}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Location & contact */}
        {(event.address || event.phone) && (
          <div className="dark-card p-4 space-y-2">
            {event.address && (
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">📍</span>
                <p className="text-zinc-300 text-sm">{event.address}</p>
              </div>
            )}
            {event.phone && (
              <div className="flex items-center gap-2">
                <span className="text-sm">📞</span>
                <a href={`tel:${event.phone}`} className="text-zinc-300 text-sm hover:text-brand-pink transition-colors">
                  {event.phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Instagram */}
        {event.instagramUrl && (
          <a
            href={event.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-brand-pink transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
            Ver en Instagram
          </a>
        )}

        {/* Registration form */}
        <div className="dark-card p-4">
          <h2 className="text-zinc-100 font-semibold mb-1">Inscribirme al evento</h2>
          <p className="text-zinc-500 text-xs mb-4">El organizador te va a confirmar tu lugar.</p>

          {submitted ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-400 font-semibold text-sm">¡Inscripción enviada!</p>
              <p className="text-zinc-500 text-xs mt-1">El organizador te va a confirmar pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label-dark">Nombre completo</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-dark w-full"
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <label className="label-dark">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="input-dark w-full"
                  placeholder="+54 9 299 521-7901"
                  required
                />
              </div>
              <div>
                <label className="label-dark">Cantidad de personas</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.peopleCount}
                  onChange={e => setForm(f => ({ ...f, peopleCount: e.target.value }))}
                  className="input-dark w-full"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="btn-brand w-full disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar inscripción'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

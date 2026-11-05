import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { eventService } from '@services/eventService'
import AvailabilityCalendar from '@components/ui/AvailabilityCalendar'
import type { ChikiEvent } from '@/types'

type ViewMode = 'list' | 'calendar'

function buildEventMap(events: ChikiEvent[]): Record<string, ChikiEvent[]> {
  const map: Record<string, ChikiEvent[]> = {}
  for (const ev of events) {
    for (const d of ev.dates) {
      if (!map[d.date]) map[d.date] = []
      map[d.date].push(ev)
    }
  }
  return map
}

export default function AdminEventsPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [events, setEvents] = useState<ChikiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const ref = useGsapFadeIn()

  useEffect(() => {
    eventService.getAllAdmin().then(setEvents).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e: React.MouseEvent, ev: ChikiEvent) => {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar "${ev.title}"?`)) return
    setDeletingId(ev.id)
    try {
      await eventService.delete(ev.id)
      setEvents(es => es.filter(x => x.id !== ev.id))
      dispatch(addToast({ message: 'Evento eliminado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
    } finally {
      setDeletingId(null)
    }
  }

  const eventMap = buildEventMap(events)
  // AvailabilityCalendar expects { [date]: boolean } — true = has events
  const availabilityMap: Record<string, boolean> = {}
  for (const date of Object.keys(eventMap)) {
    availabilityMap[date] = true
  }

  const eventsOnSelectedDate = selectedDate ? (eventMap[selectedDate] ?? []) : []

  const sortedEvents = [...events].sort((a, b) => (b.isChikiGlam ? 1 : 0) - (a.isChikiGlam ? 1 : 0))

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Eventos</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${viewMode === 'list' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500'}`}
              title="Vista lista"
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${viewMode === 'calendar' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500'}`}
              title="Vista calendario"
            >
              📅
            </button>
          </div>
          <button
            onClick={() => navigate('/admin/events/new')}
            className="btn-brand text-sm px-4 py-2"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🎪</div>
          <p className="text-zinc-500">No hay eventos aún.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {sortedEvents.map(ev => (
            <div
              key={ev.id}
              className={`p-4 flex items-center gap-3 rounded-2xl ${
                ev.isChikiGlam
                  ? 'border border-brand-pink/50 bg-brand-pink/5'
                  : 'dark-card'
              }`}
            >
              <div
                className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0 cursor-pointer"
                onClick={() => navigate(`/admin/events/${ev.id}`)}
              >
                {ev.imageKey ? (
                  <img src={`/api/admin/upload/${ev.imageKey}/serve`} alt={ev.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🎪</div>
                )}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/events/${ev.id}`)}>
                <div className="flex items-center gap-1.5">
                  {ev.isChikiGlam && <span className="text-brand-yellow text-xs">⭐</span>}
                  <p className="text-zinc-100 font-semibold truncate">{ev.title}</p>
                </div>
                <p className="text-zinc-500 text-xs">
                  {ev.dates.length > 0
                    ? `${ev.dates.length} fecha${ev.dates.length !== 1 ? 's' : ''} · ${ev.dates[0].date}`
                    : 'Sin fechas'}
                  {ev.organizerName ? ` · ${ev.organizerName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ev.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                }`}>
                  {ev.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <button
                  onClick={() => navigate(`/admin/events/${ev.id}/registrations`)}
                  className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition-colors flex-shrink-0"
                  title="Ver inscripciones"
                >
                  👥
                </button>
                <button
                  onClick={e => handleDelete(e, ev)}
                  disabled={deletingId === ev.id}
                  className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar view */
        <div>
          <AvailabilityCalendar
            availabilityMap={availabilityMap}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(prev => prev === date ? null : date)}
            year={calYear}
            month={calMonth}
            onPrevMonth={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
              else setCalMonth(m => m - 1)
              setSelectedDate(null)
            }}
            onNextMonth={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
              else setCalMonth(m => m + 1)
              setSelectedDate(null)
            }}
          />

          {selectedDate && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">{selectedDate}</p>
              {eventsOnSelectedDate.length === 0 ? (
                <p className="text-zinc-600 text-sm">Sin eventos este día.</p>
              ) : (
                <div className="space-y-2">
                  {eventsOnSelectedDate.map(ev => {
                    const dateInfo = ev.dates.find(d => d.date === selectedDate)
                    return (
                      <div key={ev.id} className="dark-card p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-100 font-medium text-sm truncate">{ev.title}</p>
                          {dateInfo && (dateInfo.startTime || dateInfo.endTime) && (
                            <p className="text-zinc-500 text-xs">
                              {dateInfo.startTime}{dateInfo.endTime ? ` — ${dateInfo.endTime}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/admin/events/${ev.id}/registrations`)}
                            className="text-xs px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                          >
                            Inscripciones
                          </button>
                          <button
                            onClick={() => navigate(`/admin/events/${ev.id}`)}
                            className="text-xs px-2 py-1 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

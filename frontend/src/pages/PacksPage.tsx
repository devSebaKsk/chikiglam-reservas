import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PackCard from '@components/ui/PackCard'
import SkeletonCard from '@components/ui/SkeletonCard'
import { packService } from '@services/packService'
import { useGsapStagger } from '@hooks/useGsap'
import type { Pack, PackCategory } from '@/types'

type Filter = 'todos' | PackCategory

const FILTERS: { id: Filter; label: string; emoji: string }[] = [
  { id: 'todos',    label: 'Todos',        emoji: '✨' },
  { id: 'carpa',    label: 'Glamping',     emoji: '⛺' },
  { id: 'adentro',  label: 'Interior',     emoji: '🏠' },
  { id: 'talleres', label: 'Talleres',     emoji: '🎨' },
  { id: 'grandes',  label: 'Para Grandes', emoji: '🥂' },
]

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('todos')
  const gridRef = useGsapStagger(0.1, 0.07)
  const navigate = useNavigate()

  useEffect(() => {
    packService.getAll()
      .then(setPacks)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'todos'
    ? packs
    : packs.filter(p => p.category === filter)

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="font-display font-bold text-2xl text-zinc-100 mb-4">Nuestros Packs</h1>

      {/* Filtros */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 mb-5 pb-1">
        {FILTERS.map(f => (
          <button
            key={String(f.id)}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === f.id
                ? 'bg-brand-gradient text-white shadow-brand'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>{f.emoji}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Banner requisitos carpa */}
      {filter === 'carpa' && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #6f28d0, #f4068b)' }}>
          <span>⛺ Recordá revisar los requisitos para la instalación de carpa</span>
          <button
            onClick={() => navigate('/', { state: { scrollTo: 'requisitos-carpa' } })}
            className="flex-shrink-0 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
          >
            Ver
          </button>
        </div>
      )}

      {/* Listado */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-zinc-500 text-sm">No hay packs en esta categoría por ahora.</p>
        </div>
      ) : (
        <div ref={gridRef} className="space-y-4">
          {filtered.map((pack, i) => (
            <div key={pack.id} className="pack-card-wrap">
              <PackCard pack={pack} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

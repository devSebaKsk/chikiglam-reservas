import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { packService } from '@services/packService'
import api from '@services/api'
import type { Pack } from '@/types'

export default function AdminPacksPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const ref = useGsapFadeIn()

  const handleDelete = async (e: React.MouseEvent, pack: Pack) => {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar "${pack.name}"?`)) return
    setDeletingId(pack.id)
    try {
      await api.delete(`/packs/${pack.id}`)
      setPacks(p => p.filter(x => x.id !== pack.id))
      dispatch(addToast({ message: 'Pack eliminado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    packService.getAllAdmin().then(setPacks).finally(() => setLoading(false))
  }, [])

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Packs</h1>
        <button
          onClick={() => navigate('/admin/packs/new')}
          className="btn-brand text-sm px-4 py-2"
        >
          + Nuevo Pack
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-zinc-500">No hay packs aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packs.map(pack => (
            <div
              key={pack.id}
              className="dark-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/admin/packs/${pack.id}`)}
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                {pack.imageKey ? (
                  <img src={`/api/admin/upload/${pack.imageKey}/serve`} alt={pack.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🎉</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-100 font-semibold truncate">{pack.name}</p>
                <p className="text-zinc-500 text-xs">{pack.minPeople}–{pack.maxPeople} personas</p>
              </div>
              <div className="flex items-center gap-2">
                {pack.isHidden && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-400">
                    Oculto
                  </span>
                )}
                <button
                  onClick={(e) => handleDelete(e, pack)}
                  disabled={deletingId === pack.id}
                  className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { additionalService } from '@services/additionalService'
import { packService } from '@services/packService'
import type { Additional, Pack } from '@/types'

const emptyForm = { name: '', description: '', price: 0, applicablePackIds: [] as string[] }

export default function AdminAdditionalsPage() {
  const dispatch = useAppDispatch()
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useGsapFadeIn()

  useEffect(() => {
    Promise.all([
      additionalService.getAll(),
      packService.getAll(),
    ]).then(([a, p]) => {
      setAdditionals(a)
      setPacks(p.filter(x => x.isActive))
    }).finally(() => setLoading(false))
  }, [])

  const openForm = (a?: Additional) => {
    if (a) {
      setEditingId(a.id)
      setForm({ name: a.name, description: a.description ?? '', price: a.price, applicablePackIds: a.applicablePackIds ?? [] })
    } else {
      setEditingId(null)
      setForm(emptyForm)
    }
    setShowForm(true)
  }

  const togglePack = (packId: string) => {
    setForm(f => ({
      ...f,
      applicablePackIds: f.applicablePackIds.includes(packId)
        ? f.applicablePackIds.filter(id => id !== packId)
        : [...f.applicablePackIds, packId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        price: form.price,
        applicablePackIds: form.applicablePackIds.length > 0 ? form.applicablePackIds : null,
      }
      if (editingId) {
        const updated = await additionalService.update(editingId, payload)
        setAdditionals(a => a.map(x => x.id === editingId ? updated : x))
      } else {
        const created = await additionalService.create({ ...payload, imageKey: null })
        setAdditionals(a => [...a, created])
      }
      dispatch(addToast({ message: editingId ? 'Extra actualizado' : 'Extra creado', type: 'success' }))
      setShowForm(false)
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (a: Additional) => {
    await additionalService.update(a.id, { isActive: !a.isActive })
    setAdditionals(list => list.map(x => x.id === a.id ? { ...x, isActive: !x.isActive } : x))
  }

  const handleDelete = async (id: string) => {
    await additionalService.remove(id)
    setAdditionals(list => list.filter(x => x.id !== id))
    dispatch(addToast({ message: 'Extra eliminado', type: 'success' }))
  }

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Extras</h1>
        <button onClick={() => openForm()} className="btn-brand text-sm px-4 py-2">+ Nuevo</button>
      </div>

      {showForm && (
        <div className="dark-card p-4 mb-4 space-y-3">
          <h3 className="text-zinc-100 font-semibold text-sm">{editingId ? 'Editar' : 'Nuevo'} extra</h3>

          <input
            placeholder="Nombre"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-dark w-full"
          />
          <input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input-dark w-full"
          />
          <input
            type="number"
            placeholder="Precio"
            value={form.price || ''}
            onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
            className="input-dark w-full"
          />

          {/* Pack restriction */}
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-2">
              Disponible para packs
            </p>
            <p className="text-zinc-500 text-xs mb-2">
              Sin selección = disponible para todos los packs
            </p>
            <div className="flex flex-wrap gap-2">
              {packs.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePack(p.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    form.applicablePackIds.includes(p.id)
                      ? 'bg-brand-pink text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name || !form.price} className="btn-brand flex-1 text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-2xl bg-zinc-700 text-zinc-300 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {additionals.map(a => (
            <div key={a.id} className="dark-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${a.isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>{a.name}</p>
                  <p className="text-brand-yellow font-mono text-sm">${a.price.toLocaleString()}</p>
                  {a.applicablePackIds && a.applicablePackIds.length > 0 && (
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Solo: {a.applicablePackIds.map(pid => packs.find(p => p.id === pid)?.name ?? pid).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(a)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      a.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {a.isActive ? 'On' : 'Off'}
                  </button>
                  <button onClick={() => openForm(a)} className="text-zinc-500 hover:text-zinc-300 text-sm px-2">✏️</button>
                  <button onClick={() => handleDelete(a.id)} className="text-zinc-500 hover:text-red-400 text-sm px-2">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

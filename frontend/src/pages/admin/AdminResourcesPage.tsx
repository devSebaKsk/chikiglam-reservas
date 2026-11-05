import { useEffect, useState } from 'react'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import api from '@services/api'
import type { Resource } from '@/types'

export default function AdminResourcesPage() {
  const dispatch = useAppDispatch()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', quantity: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useGsapFadeIn()

  const load = () => {
    api.get('/resources').then(res => {
      setResources((res.data as { data: Resource[] }).data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        quantity: form.quantity === '' ? null : parseInt(form.quantity),
      }
      if (editingId) {
        const res = await api.patch(`/resources/${editingId}`, payload)
        setResources(r => r.map(x => x.id === editingId ? (res.data as { data: Resource }).data : x))
        dispatch(addToast({ message: 'Recurso actualizado', type: 'success' }))
      } else {
        const res = await api.post('/resources', payload)
        setResources(r => [...r, (res.data as { data: Resource }).data])
        dispatch(addToast({ message: 'Recurso creado', type: 'success' }))
      }
      setShowForm(false); setEditingId(null); setForm({ name: '', quantity: '' })
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (r: Resource) => {
    setEditingId(r.id)
    setForm({ name: r.name, quantity: r.quantity === null ? '' : String(r.quantity) })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/resources/${id}`)
      setResources(r => r.filter(x => x.id !== id))
      dispatch(addToast({ message: 'Recurso eliminado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'No se puede eliminar (en uso)', type: 'error' }))
    }
  }

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Recursos</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', quantity: '' }) }}
          className="btn-brand text-sm px-4 py-2">+ Nuevo</button>
      </div>

      {showForm && (
        <div className="dark-card p-4 mb-4 space-y-3">
          <div>
            <label className="label-dark">Nombre</label>
            <input
              placeholder="Ej: Carpas, Colchones..."
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="label-dark">Cantidad disponible</label>
            <input
              type="number" min={0}
              placeholder="Dejar vacío = sin límite"
              value={form.quantity}
              onChange={e => setForm(f => ({...f, quantity: e.target.value}))}
              className="input-dark w-full"
            />
            <p className="text-zinc-600 text-xs mt-1">Si no ponés un número, el recurso es ilimitado.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-brand flex-1 text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-2xl bg-zinc-700 text-zinc-300 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({length: 3}).map((_,i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">No hay recursos aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map(r => (
            <div key={r.id} className="dark-card p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-zinc-100 font-medium text-sm">{r.name}</p>
                <p className="text-zinc-500 text-xs">
                  {r.quantity === null ? 'Sin límite de stock' : `Stock: ${r.quantity}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(r)} className="text-zinc-500 hover:text-zinc-300 px-2">✏️</button>
                <button onClick={() => handleDelete(r.id)} className="text-zinc-500 hover:text-red-400 px-2">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

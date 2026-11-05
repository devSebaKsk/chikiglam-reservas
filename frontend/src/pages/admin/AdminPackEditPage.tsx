import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Toggle from '@components/ui/Toggle'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import api from '@services/api'
import { packService } from '@services/packService'

interface PackResourceRow {
  resourceId: string
  resourceName: string
  resourceStock: number | null
  quantityFixed: number
  quantityPerPerson: number
}

import type { Pack, PackPrice, PackCategory, Resource } from '@/types'

const CATEGORIES: { value: PackCategory; label: string }[] = [
  { value: null,       label: 'Sin categoría' },
  { value: 'carpa',    label: 'Con Carpa' },
  { value: 'adentro',  label: 'En Casa' },
  { value: 'talleres', label: 'Talleres' },
  { value: 'grandes',  label: 'Para Grandes' },
]

interface FormData {
  name: string
  shortDescription: string
  fullDescription: string
  minPeople: number
  maxPeople: number
  isActive: boolean
  isHidden: boolean
  sortOrder: number
  imageKey: string
  category: PackCategory
}

const empty: FormData = {
  name: '', shortDescription: '', fullDescription: '',
  minPeople: 2, maxPeople: 20, isActive: true, isHidden: false, sortOrder: 0, imageKey: '', category: null,
}

export default function AdminPackEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const ref = useGsapFadeIn()

  const [form, setForm] = useState<FormData>(empty)
  const [prices, setPrices] = useState<PackPrice[]>([])
  const [packResources, setPackResources] = useState<PackResourceRow[]>([])
  const [allResources, setAllResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Load all available resources (for the dropdown)
    api.get('/resources').then(res => {
      const raw = (res.data as { data: Record<string, unknown>[] }).data
      setAllResources(raw.map(r => ({
        id: r.id as string,
        name: r.name as string,
        quantity: r.quantity as number | null,
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) return
    packService.getById(id!).then(pack => {
      setForm({
        name: pack.name,
        shortDescription: pack.shortDescription,
        fullDescription: pack.fullDescription,
        minPeople: pack.minPeople,
        maxPeople: pack.maxPeople,
        isActive: pack.isActive,
        isHidden: pack.isHidden ?? false,
        sortOrder: pack.sortOrder,
        imageKey: pack.imageKey ?? '',
        category: pack.category ?? null,
      })
      setPrices(pack.prices ?? [])
      setPackResources((pack.resources ?? []).map(r => ({
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        resourceStock: r.resourceStock,
        quantityFixed: r.quantityFixed,
        quantityPerPerson: r.quantityPerPerson,
      })))
    }).finally(() => setLoading(false))
  }, [id, isNew])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('prefix', 'packs')
      const res = await api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const key = (res.data as { data: { key: string } }).data.key
      setForm(f => ({ ...f, imageKey: key }))
      dispatch(addToast({ message: 'Imagen subida', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al subir imagen', type: 'error' }))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name, short_description: form.shortDescription, full_description: form.fullDescription,
        min_people: form.minPeople, max_people: form.maxPeople,
        is_active: form.isActive ? 1 : 0, is_hidden: form.isHidden ? 1 : 0,
        sort_order: form.sortOrder,
        image_key: form.imageKey || null,
        category: form.category ?? null,
      }
      const resourcesPayload = packResources.map(r => ({
        resource_id: r.resourceId,
        quantity_fixed: r.quantityFixed,
        quantity_per_person: r.quantityPerPerson,
      }))

      if (isNew) {
        const res = await api.post('/packs', payload)
        const newId = (res.data as { data: Pack }).data.id
        if (prices.length > 0) {
          await api.post(`/packs/${newId}/prices`, prices.map(p => ({ people_count: p.peopleCount, price: p.price })))
        }
        await api.post(`/packs/${newId}/resources`, resourcesPayload)
        dispatch(addToast({ message: 'Pack creado', type: 'success' }))
        navigate('/admin/packs')
      } else {
        await api.patch(`/packs/${id}`, payload)
        if (prices.length > 0) {
          await api.post(`/packs/${id}/prices`, prices.map(p => ({ people_count: p.peopleCount, price: p.price })))
        }
        await api.post(`/packs/${id}/resources`, resourcesPayload)
        dispatch(addToast({ message: 'Pack actualizado', type: 'success' }))
      }
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const addResourceRow = (resource: Resource) => {
    if (packResources.find(r => r.resourceId === resource.id)) return
    setPackResources(rs => [...rs, {
      resourceId: resource.id,
      resourceName: resource.name,
      resourceStock: resource.quantity,
      quantityFixed: 0,
      quantityPerPerson: 0,
    }])
  }
  const updatePackResource = (idx: number, field: 'quantityFixed' | 'quantityPerPerson', value: number) => {
    setPackResources(rs => rs.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  const removePackResource = (idx: number) => setPackResources(rs => rs.filter((_, i) => i !== idx))

  const addPriceRow = () => setPrices(p => [...p, { id: `tmp-${Date.now()}`, packId: id ?? '', peopleCount: 0, price: 0 }])
  const updatePrice = (idx: number, field: 'peopleCount' | 'price', value: number) => {
    setPrices(p => p.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }
  const removePrice = (idx: number) => setPrices(p => p.filter((_, i) => i !== idx))

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este pack? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    try {
      await api.delete(`/packs/${id}`)
      dispatch(addToast({ message: 'Pack eliminado', type: 'success' }))
      navigate('/admin/packs')
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="px-4 py-6 space-y-3"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-48 rounded-2xl" /></div>
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/packs')} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">‹</button>
        <h1 className="text-xl font-display font-bold text-zinc-100 flex-1">{isNew ? 'Nuevo Pack' : 'Editar Pack'}</h1>
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-40"
          >
            🗑
          </button>
        )}
      </div>

      {/* Image */}
      <div className="dark-card p-4">
        <label className="label-dark mb-2">Imagen</label>
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-colors ${
            form.imageKey ? 'border-brand-pink' : 'border-zinc-700 hover:border-zinc-500'
          }`}>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {form.imageKey ? (
              <p className="text-zinc-300 text-sm">✓ Imagen cargada</p>
            ) : (
              <p className="text-zinc-500 text-sm">{uploading ? 'Subiendo...' : 'Subir imagen'}</p>
            )}
          </div>
        </label>
      </div>

      {/* Basic fields */}
      <div className="dark-card p-4 space-y-3">
        <div>
          <label className="label-dark">Nombre</label>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-dark w-full" />
        </div>
        <div>
          <label className="label-dark">Descripción corta</label>
          <input value={form.shortDescription} onChange={e => setForm(f => ({...f, shortDescription: e.target.value}))} className="input-dark w-full" />
        </div>
        <div>
          <label className="label-dark">Descripción completa</label>
          <textarea value={form.fullDescription} onChange={e => setForm(f => ({...f, fullDescription: e.target.value}))} rows={4} className="input-dark w-full resize-none" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label-dark">Personas mín</label>
            <input type="number" value={form.minPeople} onChange={e => setForm(f => ({...f, minPeople: +e.target.value}))} className="input-dark w-full" />
          </div>
          <div className="flex-1">
            <label className="label-dark">Personas máx</label>
            <input type="number" value={form.maxPeople} onChange={e => setForm(f => ({...f, maxPeople: +e.target.value}))} className="input-dark w-full" />
          </div>
        </div>
        <div>
          <label className="label-dark">Categoría</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map(cat => (
              <button
                key={String(cat.value)}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                className={`px-3 py-1.5 rounded-2xl text-xs font-medium transition-colors ${
                  form.category === cat.value
                    ? 'bg-brand-pink text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="label-dark mb-0">Solo visible por link</span>
            <p className="text-zinc-600 text-xs mt-0.5">No aparece en el listado público. Compartí el link para que puedan reservar.</p>
          </div>
          <Toggle value={form.isHidden} onChange={v => setForm(f => ({ ...f, isHidden: v }))} />
        </div>

        {!isNew && form.isHidden && (
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/packs/${id}`
              navigator.clipboard.writeText(url)
                .then(() => dispatch(addToast({ message: 'Link copiado al portapapeles', type: 'success' })))
                .catch(() => dispatch(addToast({ message: url, type: 'info' })))
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
          >
            🔗 Copiar link para compartir
          </button>
        )}
      </div>

      {/* Prices */}
      <div className="dark-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-100 font-semibold text-sm">Precios</span>
          <button onClick={addPriceRow} className="text-brand-pink text-sm">+ Agregar</button>
        </div>
        {prices.map((p, idx) => (
          <div key={p.id} className="flex gap-2 mb-2">
            <input
              type="number" placeholder="Personas"
              value={p.peopleCount || ''}
              onChange={e => updatePrice(idx, 'peopleCount', +e.target.value)}
              className="input-dark flex-1"
            />
            <input
              type="number" placeholder="Precio $"
              value={p.price || ''}
              onChange={e => updatePrice(idx, 'price', +e.target.value)}
              className="input-dark flex-1"
            />
            <button onClick={() => removePrice(idx)} className="text-zinc-500 hover:text-red-400 px-1">✕</button>
          </div>
        ))}
      </div>

      {/* Resources */}
      <div className="dark-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-100 font-semibold text-sm">Recursos del pack</span>
        </div>

        {/* Already added resources */}
        {packResources.length > 0 && (
          <div className="space-y-2 mb-3">
            {packResources.map((r, idx) => (
              <div key={r.resourceId} className="bg-zinc-800/60 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-zinc-100 text-sm font-medium">{r.resourceName}</span>
                    <span className="text-zinc-500 text-xs ml-2">
                      {r.resourceStock === null ? '(sin límite)' : `(stock: ${r.resourceStock})`}
                    </span>
                  </div>
                  <button onClick={() => removePackResource(idx)} className="text-zinc-500 hover:text-red-400 text-lg leading-none">✕</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs mb-1 block">Fijo por reserva</label>
                    <input
                      type="number" min={0}
                      value={r.quantityFixed || ''}
                      placeholder="0"
                      onChange={e => updatePackResource(idx, 'quantityFixed', +e.target.value || 0)}
                      className="input-dark w-full text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-zinc-500 text-xs mb-1 block">Por persona</label>
                    <input
                      type="number" min={0}
                      value={r.quantityPerPerson || ''}
                      placeholder="0"
                      onChange={e => updatePackResource(idx, 'quantityPerPerson', +e.target.value || 0)}
                      className="input-dark w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add resource dropdown */}
        {allResources.filter(r => !packResources.find(pr => pr.resourceId === r.id)).length > 0 && (
          <div>
            <label className="text-zinc-500 text-xs mb-1 block">Agregar recurso</label>
            <select
              className="input-dark w-full text-sm"
              value=""
              onChange={e => {
                const res = allResources.find(r => r.id === e.target.value)
                if (res) addResourceRow(res)
              }}
            >
              <option value="">— Seleccionar recurso —</option>
              {allResources
                .filter(r => !packResources.find(pr => pr.resourceId === r.id))
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.quantity === null ? '(sin límite)' : `(stock: ${r.quantity})`}
                  </option>
                ))}
            </select>
          </div>
        )}

        {allResources.length === 0 && (
          <p className="text-zinc-600 text-xs">No hay recursos creados aún. Creá recursos en la sección Recursos.</p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="btn-brand w-full disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar Pack'}
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { eventService } from '@services/eventService'
import Toggle from '@components/ui/Toggle'
import api from '@services/api'

interface DateRow {
  tmpId: string
  date: string
  startTime: string
  endTime: string
}

interface FormData {
  title: string
  description: string
  address: string
  phone: string
  organizerName: string
  instagramUrl: string
  imageKey: string
  isActive: boolean
  isChikiGlam: boolean
}

const empty: FormData = {
  title: '', description: '', address: '', phone: '',
  organizerName: '', instagramUrl: '', imageKey: '', isActive: true, isChikiGlam: false,
}

export default function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const ref = useGsapFadeIn()

  const [form, setForm] = useState<FormData>(empty)
  const [dates, setDates] = useState<DateRow[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isNew) return
    eventService.getById(id!).then(ev => {
      setForm({
        title: ev.title,
        description: ev.description,
        address: ev.address,
        phone: ev.phone,
        organizerName: ev.organizerName,
        instagramUrl: ev.instagramUrl ?? '',
        imageKey: ev.imageKey ?? '',
        isActive: ev.isActive,
        isChikiGlam: ev.isChikiGlam,
      })
      setDates(ev.dates.map(d => ({
        tmpId: d.id,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
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
      fd.append('prefix', 'events')
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

  const addDateRow = () =>
    setDates(ds => [...ds, { tmpId: `tmp-${Date.now()}`, date: '', startTime: '', endTime: '' }])

  const updateDate = (idx: number, field: keyof Omit<DateRow, 'tmpId'>, value: string) =>
    setDates(ds => ds.map((d, i) => i === idx ? { ...d, [field]: value } : d))

  const removeDate = (idx: number) => setDates(ds => ds.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!form.title.trim()) {
      dispatch(addToast({ message: 'El título es obligatorio', type: 'warning' }))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        organizer_name: form.organizerName.trim(),
        instagram_url: form.instagramUrl.trim() || null,
        image_key: form.imageKey || null,
        is_active: form.isActive ? 1 : 0,
        is_chiki_glam: form.isChikiGlam ? 1 : 0,
        dates: dates
          .filter(d => d.date)
          .map(d => ({ date: d.date, start_time: d.startTime, end_time: d.endTime })),
      }

      if (isNew) {
        await eventService.create(payload)
        dispatch(addToast({ message: 'Evento creado', type: 'success' }))
        navigate('/admin/events')
      } else {
        await eventService.update(id!, payload)
        dispatch(addToast({ message: 'Evento actualizado', type: 'success' }))
      }
    } catch {
      dispatch(addToast({ message: 'Error al guardar', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    try {
      await eventService.delete(id!)
      dispatch(addToast({ message: 'Evento eliminado', type: 'success' }))
      navigate('/admin/events')
    } catch {
      dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
      setDeleting(false)
    }
  }

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  if (loading) {
    return <div className="px-4 py-6 space-y-3"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-48 rounded-2xl" /></div>
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/events')}
          className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400"
        >
          ‹
        </button>
        <h1 className="text-xl font-display font-bold text-zinc-100 flex-1">
          {isNew ? 'Nuevo Evento' : 'Editar Evento'}
        </h1>
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
        {form.imageKey && (
          <img
            src={`/api/admin/upload/${form.imageKey}/serve`}
            alt="preview"
            className="w-full h-40 object-cover rounded-xl mb-3"
          />
        )}
        <label className="block cursor-pointer">
          <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-colors ${
            form.imageKey ? 'border-brand-pink' : 'border-zinc-700 hover:border-zinc-500'
          }`}>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <p className="text-zinc-400 text-sm">
              {uploading ? 'Subiendo...' : form.imageKey ? '✓ Cambiar imagen' : '📷 Subir imagen'}
            </p>
          </div>
        </label>
      </div>

      {/* Basic fields */}
      <div className="dark-card p-4 space-y-3">
        <div>
          <label className="label-dark">Título *</label>
          <input value={form.title} onChange={set('title')} className="input-dark w-full" placeholder="Ej: Feria de Arte" />
        </div>
        <div>
          <label className="label-dark">Descripción</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="input-dark w-full resize-none"
            placeholder="Describí el evento..."
          />
        </div>
        <div>
          <label className="label-dark">Dirección</label>
          <input value={form.address} onChange={set('address')} className="input-dark w-full" placeholder="Calle y número, ciudad" />
        </div>
        <div>
          <label className="label-dark">Teléfono de contacto</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            className="input-dark w-full"
            placeholder="+54 9 299 521-7901"
          />
        </div>
        <div>
          <label className="label-dark">Organizador</label>
          <input
            value={form.organizerName}
            onChange={set('organizerName')}
            className="input-dark w-full"
            placeholder="Nombre del organizador"
          />
        </div>
        <div>
          <label className="label-dark">Instagram (opcional)</label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={set('instagramUrl')}
            className="input-dark w-full"
            placeholder="https://instagram.com/tuusuario"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-zinc-200 text-sm font-medium">Evento de ChikiGlam ⭐</p>
            <p className="text-zinc-500 text-xs mt-0.5">Se destacará al inicio de la lista</p>
          </div>
          <Toggle value={form.isChikiGlam} onChange={v => setForm(f => ({ ...f, isChikiGlam: v }))} />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-zinc-200 text-sm font-medium">Activo</span>
          <Toggle value={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
        </div>
      </div>

      {/* Dates */}
      <div className="dark-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-zinc-100 font-semibold text-sm">Fechas y horarios</span>
          <button onClick={addDateRow} className="text-brand-pink text-sm font-medium">+ Agregar</button>
        </div>

        {dates.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-2">Sin fechas. Agregá al menos una.</p>
        )}

        <div className="space-y-3">
          {dates.map((d, idx) => (
            <div key={d.tmpId} className="bg-zinc-800/60 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs font-medium">Fecha {idx + 1}</span>
                <button onClick={() => removeDate(idx)} className="text-zinc-500 hover:text-red-400 text-sm">✕</button>
              </div>
              <input
                type="date"
                value={d.date}
                onChange={e => updateDate(idx, 'date', e.target.value)}
                className="input-dark w-full text-sm"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-zinc-500 text-xs mb-1 block">Hora inicio</label>
                  <input
                    type="time"
                    step={900}
                    lang="es-AR"
                    value={d.startTime}
                    onChange={e => updateDate(idx, 'startTime', e.target.value)}
                    className="input-dark w-full text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-zinc-500 text-xs mb-1 block">Hora fin</label>
                  <input
                    type="time"
                    step={900}
                    lang="es-AR"
                    value={d.endTime}
                    onChange={e => updateDate(idx, 'endTime', e.target.value)}
                    className="input-dark w-full text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="btn-brand w-full disabled:opacity-50"
      >
        {saving ? 'Guardando...' : isNew ? 'Crear Evento' : 'Guardar cambios'}
      </button>
    </div>
  )
}

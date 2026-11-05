import { useEffect, useState } from 'react'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import promoService from '@services/promoService'
import { packService } from '@services/packService'
import type { PromoCode, Pack } from '@/types'

interface FormState {
  code: string
  description: string
  discount_type: 'percent' | 'amount'
  discount_value: string
  applicable_pack_ids: string[]
  max_uses: string
  expires_at: string
}

const emptyForm: FormState = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  applicable_pack_ids: [],
  max_uses: '',
  expires_at: '',
}

export default function AdminPromosPage() {
  const dispatch = useAppDispatch()
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const ref = useGsapFadeIn()

  useEffect(() => {
    Promise.all([
      promoService.getAll().then(setPromos),
      packService.getAll().then(setPacks),
    ]).finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id)
    setForm({
      code: p.code,
      description: p.description ?? '',
      discount_type: p.discountType,
      discount_value: String(p.discountValue),
      applicable_pack_ids: p.applicablePacks ?? [],
      max_uses: p.maxUses != null ? String(p.maxUses) : '',
      expires_at: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.discount_value) {
      dispatch(addToast({ message: 'Código y valor son requeridos', type: 'error' }))
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        applicable_pack_ids: form.applicable_pack_ids.length > 0 ? form.applicable_pack_ids : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      }
      if (editingId) {
        const updated = await promoService.update(editingId, payload)
        setPromos(list => list.map(x => x.id === editingId ? updated : x))
        dispatch(addToast({ message: 'Código actualizado', type: 'success' }))
      } else {
        const created = await promoService.create(payload)
        setPromos(list => [created, ...list])
        dispatch(addToast({ message: 'Código creado', type: 'success' }))
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar'
      dispatch(addToast({ message: msg, type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: PromoCode) => {
    await promoService.update(p.id, { is_active: !p.isActive })
    setPromos(list => list.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x))
  }

  const togglePack = (packId: string) => {
    setForm(f => ({
      ...f,
      applicable_pack_ids: f.applicable_pack_ids.includes(packId)
        ? f.applicable_pack_ids.filter(id => id !== packId)
        : [...f.applicable_pack_ids, packId],
    }))
  }

  const formatDiscount = (p: PromoCode) =>
    p.discountType === 'percent' ? `${p.discountValue}%` : `$${p.discountValue.toLocaleString()}`

  if (showForm) {
    return (
      <div ref={ref} className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-zinc-100">
            {editingId ? 'Editar código' : 'Nuevo código'}
          </h1>
          <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕ Cancelar</button>
        </div>

        <div className="dark-card p-4 space-y-4">
          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">Código</label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="VERANO2025"
              className="input-dark w-full"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">Descripción (uso interno)</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Promo verano 2025"
              className="input-dark w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">Tipo</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'amount' }))}
                className="input-dark w-full"
              >
                <option value="percent">Porcentaje (%)</option>
                <option value="amount">Monto fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">
                {form.discount_type === 'percent' ? 'Porcentaje' : 'Monto ($)'}
              </label>
              <input
                type="number"
                min="0"
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percent' ? '15' : '500'}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">Máx. usos (vacío = sin límite)</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="100"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-1">Vence (vacío = nunca)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs uppercase tracking-wide block mb-2">
              Packs aplicables (ninguno = todos los packs)
            </label>
            <div className="space-y-2">
              {packs.filter(p => p.isActive).map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.applicable_pack_ids.includes(p.id)}
                    onChange={() => togglePack(p.id)}
                    className="accent-brand-pink w-4 h-4"
                  />
                  <span className="text-zinc-300 text-sm">{p.name}</span>
                </label>
              ))}
            </div>
            {form.applicable_pack_ids.length === 0 && (
              <p className="text-zinc-500 text-xs mt-1">✓ Aplica a todos los packs</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-brand flex-1 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-2xl bg-zinc-700 text-zinc-300 text-sm">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-display font-bold text-zinc-100">Códigos de descuento</h1>
        <button onClick={openCreate} className="btn-brand text-sm px-4 py-2">+ Nuevo</button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}</div>
      ) : promos.length === 0 ? (
        <div className="dark-card p-6 text-center text-zinc-500 text-sm">
          No hay códigos de descuento creados aún
        </div>
      ) : (
        <div className="space-y-2">
          {promos.map(p => (
            <div key={p.id} className="dark-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono font-bold text-sm ${p.isActive ? 'text-brand-pink' : 'text-zinc-500'}`}>
                      {p.code}
                    </span>
                    <span className="text-emerald-400 font-mono text-sm">{formatDiscount(p)}</span>
                    {p.expiresAt && (
                      <span className="text-zinc-500 text-xs">vence {p.expiresAt.slice(0, 10)}</span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-zinc-500 text-xs mt-0.5">{p.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>
                      Usos: {p.usedCount}{p.maxUses != null ? `/${p.maxUses}` : ''}
                    </span>
                    <span>
                      Packs: {p.applicablePacks
                        ? packs.filter(pk => p.applicablePacks!.includes(pk.id)).map(pk => pk.name).join(', ') || 'ninguno'
                        : 'todos'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(p)}
                    className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                      p.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >{p.isActive ? 'On' : 'Off'}</button>
                  <button onClick={() => openEdit(p)} className="text-zinc-500 hover:text-zinc-300 text-sm px-1">✏️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

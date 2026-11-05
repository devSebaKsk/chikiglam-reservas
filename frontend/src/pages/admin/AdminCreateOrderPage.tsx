import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { orderService } from '@services/orderService'
import { packService } from '@services/packService'
import promoService from '@services/promoService'
import { FREE_LOCALITIES, PAID_LOCALITIES, LOCALITY_FEE, LOCALITY_OTHER } from '@store/slices/cartSlice'
import type { Pack } from '@/types'

const EVENT_TYPES = [
  { value: 'nina',  label: 'Niña' },
  { value: 'nino',  label: 'Niño' },
  { value: 'mixto', label: 'Mixto' },
]

export default function AdminCreateOrderPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const ref = useGsapFadeIn()

  const [packs, setPacks] = useState<Pack[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmount: number } | null>(null)

  const [form, setForm] = useState({
    user_name: '', user_phone: '',
    pack_id: '', people_count: '',
    date: '', status: 'pending_payment' as 'pending_payment' | 'confirmed',
    locality: '', address: '', eventType: '', childName: '', birthdayAge: '', colorSuggestions: '',
  })

  useEffect(() => {
    packService.getAll()
      .then(all => setPacks(all.filter(p => p.isActive)))
      .finally(() => setLoading(false))
  }, [])

  const selectedPack = packs.find(p => p.id === form.pack_id)

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const buildNotes = () => {
    const parts: string[] = []
    if (form.locality)          parts.push(`Localidad: ${form.locality}`)
    if (form.address)           parts.push(`Dirección: ${form.address}`)
    if (form.eventType)         parts.push(`Evento: ${form.eventType}`)
    if (form.childName)         parts.push(`Infante: ${form.childName}`)
    if (form.birthdayAge)       parts.push(`Edad cumpleañer@: ${form.birthdayAge}`)
    if (form.colorSuggestions)  parts.push(`Colores: ${form.colorSuggestions}`)
    return parts.join(' | ')
  }

  const people = parseInt(form.people_count) || 0
  const price = selectedPack?.prices?.find(p => p.peopleCount === people)?.price
  const locFee = PAID_LOCALITIES.includes(form.locality) ? LOCALITY_FEE : 0
  const totalPreview = price !== undefined ? price - (appliedPromo?.discountAmount ?? 0) + locFee : undefined

  const handleValidatePromo = async () => {
    if (!promoInput.trim() || !form.pack_id) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const result = await promoService.validate(promoInput.trim(), form.pack_id)
      if (!result.valid) {
        setPromoError(result.message ?? 'Código no válido')
        setAppliedPromo(null)
      } else {
        const packPrice = price ?? 0
        const discountAmount = result.discountType === 'percent'
          ? Math.min(packPrice * result.discountValue! / 100, packPrice)
          : Math.min(result.discountValue!, packPrice)
        setAppliedPromo({ code: promoInput.trim().toUpperCase(), discountAmount })
        setPromoInput('')
      }
    } catch {
      setPromoError('Error al validar el código')
    } finally {
      setPromoLoading(false)
    }
  }

  const canSubmit = (
    form.user_name.trim().length >= 2 &&
    form.user_phone.trim().length >= 7 &&
    form.pack_id !== '' &&
    people >= 1 &&
    form.date !== '' &&
    price !== undefined
  )

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const order = await orderService.createAsAdmin({
        user_name:    form.user_name.trim(),
        user_phone:   form.user_phone.trim(),
        pack_id:      form.pack_id,
        people_count: people,
        date:         form.date,
        notes:        buildNotes() || undefined,
        promo_code:   appliedPromo?.code,
        status:       form.status,
        additionals:  [],
      })
      dispatch(addToast({ message: 'Reserva creada exitosamente', type: 'success' }))
      navigate(`/admin/orders/${order.id}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al crear reserva'
      dispatch(addToast({ message: msg, type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors text-lg"
        >
          ‹
        </button>
        <h1 className="text-xl font-display font-bold text-zinc-100">Nueva reserva</h1>
      </div>

      <div className="dark-card p-4 space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium">Datos del cliente</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-dark">Nombre *</label>
            <input type="text" value={form.user_name} onChange={set('user_name')}
              className="input-dark w-full" placeholder="Nombre completo" />
          </div>
          <div>
            <label className="label-dark">WhatsApp *</label>
            <input type="tel" value={form.user_phone} onChange={set('user_phone')}
              className="input-dark w-full" placeholder="+54 9 11..." />
          </div>
        </div>
      </div>

      <div className="dark-card p-4 space-y-4">
        <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium">Datos de la reserva</p>

        <div>
          <label className="label-dark">Pack *</label>
          {loading ? (
            <div className="skeleton h-10 rounded-xl" />
          ) : (
            <select value={form.pack_id} onChange={set('pack_id')} className="input-dark w-full">
              <option value="">Seleccionar pack...</option>
              {packs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-dark">Personas *</label>
            <input type="number" value={form.people_count} onChange={set('people_count')}
              className="input-dark w-full"
              placeholder={selectedPack ? `${selectedPack.minPeople}–${selectedPack.maxPeople}` : 'Ej: 15'}
              min={selectedPack?.minPeople ?? 1}
              max={selectedPack?.maxPeople ?? 999} />
          </div>
          <div>
            <label className="label-dark">Fecha *</label>
            <input type="date" value={form.date} onChange={set('date')} className="input-dark w-full" />
          </div>
        </div>

        {selectedPack && people > 0 && (
          <div className="bg-zinc-800/50 rounded-xl px-3 py-2.5 space-y-1 text-sm">
            {price !== undefined ? (
              <>
                <div className="flex justify-between text-zinc-400">
                  <span>Pack · {people} personas</span>
                  <span className="font-mono">${price.toLocaleString()}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento ({appliedPromo.code})</span>
                    <span className="font-mono">-${appliedPromo.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {locFee > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Traslado ({form.locality})</span>
                    <span className="font-mono">${locFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-brand-yellow font-semibold border-t border-zinc-700 pt-1 mt-1">
                  <span>Total</span>
                  <span className="font-mono">${totalPreview!.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <span className="text-red-400">No hay precio para {people} personas en este pack</span>
            )}
          </div>
        )}

        <div>
          <label className="label-dark">Estado inicial</label>
          <div className="flex gap-2 mt-1">
            {([
              { value: 'pending_payment', label: 'Pend. de pago' },
              { value: 'confirmed',       label: 'Confirmada' },
            ] as const).map(s => (
              <button key={s.value} type="button"
                onClick={() => setForm(f => ({ ...f, status: s.value }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  form.status === s.value ? 'bg-brand-pink text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dark-card p-4 space-y-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium">Código de descuento</p>
        {appliedPromo ? (
          <div className="flex items-center justify-between bg-emerald-500/10 rounded-xl px-3 py-2">
            <span className="text-emerald-400 text-sm">✓ {appliedPromo.code} — ${appliedPromo.discountAmount.toLocaleString()} de descuento</span>
            <button onClick={() => setAppliedPromo(null)} className="text-zinc-500 hover:text-zinc-300 text-sm ml-3">✕</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && handleValidatePromo()}
                placeholder="CÓDIGO"
                disabled={!form.pack_id}
                className="flex-1 input-dark"
              />
              <button
                onClick={handleValidatePromo}
                disabled={promoLoading || !promoInput.trim() || !form.pack_id}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                {promoLoading ? '...' : 'Aplicar'}
              </button>
            </div>
            {!form.pack_id && <p className="text-zinc-600 text-xs">Seleccioná un pack primero</p>}
            {promoError && <p className="text-red-400 text-xs">{promoError}</p>}
          </>
        )}
      </div>

      <div className="dark-card p-4 space-y-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wide font-medium">Detalles del evento</p>

        <div>
          <label className="label-dark">Localidad</label>
          <select value={form.locality} onChange={set('locality')} className="input-dark w-full">
            <option value="">Sin especificar</option>
            <optgroup label="Sin cargo">
              {FREE_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
            <optgroup label="Con cargo adicional">
              {PAID_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
            <option value={LOCALITY_OTHER}>Otras localidades</option>
          </select>
        </div>

        <div>
          <label className="label-dark">Dirección</label>
          <input type="text" value={form.address} onChange={set('address')}
            className="input-dark w-full" placeholder="Calle y número" />
        </div>

        <div>
          <label className="label-dark">Tipo de evento</label>
          <div className="flex gap-2 mt-1">
            {EVENT_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm(f => ({ ...f, eventType: t.value }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  form.eventType === t.value ? 'bg-brand-pink text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-dark">Nombre del infante</label>
            <input type="text" value={form.childName} onChange={set('childName')}
              className="input-dark w-full" placeholder="Ej: Sofía" />
          </div>
          <div>
            <label className="label-dark">Edad</label>
            <input type="text" value={form.birthdayAge} onChange={set('birthdayAge')}
              className="input-dark w-full" placeholder="Ej: 8 años" />
          </div>
        </div>

        <div>
          <label className="label-dark">Sugerencias de colores</label>
          <input type="text" value={form.colorSuggestions} onChange={set('colorSuggestions')}
            className="input-dark w-full" placeholder="Ej: rosa y dorado, unicornio..." />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
        className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Creando...' : 'Crear reserva →'}
      </button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { quickRegister } from '@store/slices/authSlice'
import { setEventDetails, FREE_LOCALITIES, PAID_LOCALITIES, LOCALITY_FEE, LOCALITY_OTHER } from '@store/slices/cartSlice'
import type { EventDetails } from '@store/slices/cartSlice'
import { useAuth } from '@hooks/useAuth'
import { useGsapBottomSheet } from '@hooks/useGsap'

interface OtpModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const EVENT_TYPES: { value: EventDetails['eventType']; label: string }[] = [
  { value: 'nina',  label: 'Niña' },
  { value: 'nino',  label: 'Niño' },
  { value: 'mixto', label: 'Mixto' },
]

export default function OtpModal({ isOpen, onClose, onSuccess }: OtpModalProps) {
  const dispatch = useAppDispatch()
  const { isLoading, error, isAuthenticated } = useAuth()
  const user = useAppSelector(s => s.auth.user)
  const sheetRef = useGsapBottomSheet(isOpen)

  const wasAuthOnOpen = useRef(false)

  const [form, setForm] = useState({
    name: '', phone: '', locality: '', address: '',
    eventType: '' as EventDetails['eventType'],
    childName: '', birthdayAge: '', colorSuggestions: '',
  })

  // Reset form every time the modal opens
  useEffect(() => {
    if (isOpen) {
      wasAuthOnOpen.current = isAuthenticated
      setForm({
        name: user?.name ?? '',
        phone: user?.phone ?? '',
        locality: '',
        address: '',
        eventType: '',
        childName: '',
        birthdayAge: '',
        colorSuggestions: '',
      })
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-close only when quickRegister completes (user was NOT auth on open)
  useEffect(() => {
    if (isAuthenticated && isOpen && !wasAuthOnOpen.current) {
      onSuccess?.()
      onClose()
    }
  }, [isAuthenticated, isOpen, onSuccess, onClose])

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async () => {
    dispatch(setEventDetails({
      locality: form.locality,
      address: form.address,
      eventType: form.eventType,
      childName: form.childName,
      birthdayAge: form.birthdayAge,
      colorSuggestions: form.colorSuggestions,
    }))

    if (wasAuthOnOpen.current) {
      onSuccess?.()
      onClose()
    } else {
      await dispatch(quickRegister({ name: form.name.trim(), phone: form.phone.trim() }))
    }
  }

  if (!isOpen) return null

  const canSubmit = form.name.trim().length >= 2 && form.phone.trim().length >= 7 && form.locality !== ''

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="sheet-overlay" onClick={onClose} />

      <div ref={sheetRef} className="sheet w-full max-w-[430px] mx-auto">
        <div className="sheet-handle" />

        <div className="p-6 pb-8 overflow-y-auto max-h-[85vh]">
          <h2 className="text-xl font-display font-bold text-zinc-100 mb-1">¡Casi listo! 🎉</h2>
          <p className="text-zinc-400 text-sm mb-5">Completá los datos para confirmar tu reserva.</p>

          <div className="space-y-3">
            {/* Nombre */}
            <div>
              <label className="label-dark">Nombre del adulto responsable *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Nombre completo"
                className="input-dark w-full"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="label-dark">WhatsApp *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+54 9 11 1234-5678"
                className="input-dark w-full"
              />
            </div>

            {/* Localidad */}
            <div>
              <label className="label-dark">Localidad *</label>
              <select value={form.locality} onChange={set('locality')} className="input-dark w-full">
                <option value="">Seleccionar localidad...</option>
                <optgroup label="Sin cargo">
                  {FREE_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
                </optgroup>
                <optgroup label={`+ $${LOCALITY_FEE.toLocaleString()} adicionales`}>
                  {PAID_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
                </optgroup>
                <option value={LOCALITY_OTHER}>Otras localidades (consultar valor)</option>
              </select>
              {form.locality === LOCALITY_OTHER && (
                <p className="text-brand-yellow text-xs mt-1.5">
                  ⚠️ Te contactaremos para coordinar el valor del traslado.
                </p>
              )}
              {PAID_LOCALITIES.includes(form.locality) && (
                <p className="text-brand-pink text-xs mt-1.5">
                  + ${LOCALITY_FEE.toLocaleString()} por traslado
                </p>
              )}
            </div>

            {/* Dirección */}
            <div>
              <label className="label-dark">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={set('address')}
                placeholder="Calle y número"
                className="input-dark w-full"
              />
            </div>

            {/* Tipo de evento */}
            <div>
              <label className="label-dark">Evento para</label>
              <div className="flex gap-2 mt-1">
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, eventType: t.value }))}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                      form.eventType === t.value
                        ? 'bg-brand-pink text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre del infante */}
            <div>
              <label className="label-dark">Nombre del infante / cumpleañer@</label>
              <input
                type="text"
                value={form.childName}
                onChange={set('childName')}
                placeholder="Ej: Sofía"
                className="input-dark w-full"
              />
            </div>

            {/* Edad */}
            <div>
              <label className="label-dark">Edad del cumpleañer@</label>
              <input
                type="text"
                value={form.birthdayAge}
                onChange={set('birthdayAge')}
                placeholder="Ej: 8 años"
                className="input-dark w-full"
              />
            </div>

            {/* Colores */}
            <div>
              <label className="label-dark">Sugerencias de colores</label>
              <input
                type="text"
                value={form.colorSuggestions}
                onChange={set('colorSuggestions')}
                placeholder="Ej: rosa y dorado, unicornio..."
                className="input-dark w-full"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="btn-brand w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Confirmando...' : 'Confirmar reserva →'}
          </button>

          <p className="text-zinc-600 text-xs text-center mt-3">* campos obligatorios</p>
        </div>
      </div>
    </div>
  )
}

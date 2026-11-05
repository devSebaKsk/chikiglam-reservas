import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { selectCartTotal, getLocalityFee, LOCALITY_OTHER, applyPromo, clearPromo } from '@store/slices/cartSlice'
import { createOrder } from '@store/slices/orderSlice'
import { addToast } from '@store/slices/uiSlice'
import promoService from '@services/promoService'

export default function OrderSummaryPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const cart = useAppSelector(s => s.cart)
  const total = useAppSelector(selectCartTotal)
  const { isLoading } = useAppSelector(s => s.order)
  const linesRef = useRef<HTMLDivElement>(null)
  const localityFee = getLocalityFee(cart.eventDetails.locality)
  const deposit = Math.ceil(total * 0.3)
  const remaining = total - deposit
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')

  useEffect(() => {
    if (!linesRef.current) return
    const lines = linesRef.current.querySelectorAll('.summary-line')
    gsap.fromTo(lines,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, ease: 'power3.out' }
    )
  }, [])

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !cart.pack) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const result = await promoService.validate(promoInput.trim(), cart.pack.id)
      if (!result.valid) {
        setPromoError(result.message ?? 'Código no válido')
        dispatch(clearPromo())
      } else {
        const packPrice = cart.packPrice
        const discountAmount = result.discountType === 'percent'
          ? Math.min(packPrice * result.discountValue! / 100, packPrice)
          : Math.min(result.discountValue!, packPrice)
        dispatch(applyPromo({
          code: promoInput.trim().toUpperCase(),
          promoCodeId: result.promoCodeId!,
          discountType: result.discountType!,
          discountValue: result.discountValue!,
          discountAmount,
        }))
        setPromoInput('')
      }
    } catch {
      setPromoError('Error al validar el código')
    } finally {
      setPromoLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!cart.pack || !cart.date) {
      dispatch(addToast({ message: 'Faltan datos del pedido', type: 'error' }))
      return
    }

    const { eventDetails } = cart
    const notesParts: string[] = []
    if (eventDetails.locality) notesParts.push(`Localidad: ${eventDetails.locality === LOCALITY_OTHER ? 'Otras (consultar traslado)' : eventDetails.locality}`)
    if (eventDetails.address) notesParts.push(`Dirección: ${eventDetails.address}`)
    if (eventDetails.eventType) notesParts.push(`Evento: ${eventDetails.eventType}`)
    if (eventDetails.childName) notesParts.push(`Infante: ${eventDetails.childName}`)
    if (eventDetails.birthdayAge) notesParts.push(`Edad cumpleañer@: ${eventDetails.birthdayAge}`)
    if (eventDetails.colorSuggestions) notesParts.push(`Colores: ${eventDetails.colorSuggestions}`)

    const result = await dispatch(createOrder({
      pack_id: cart.pack.id,
      people_count: cart.peopleCount,
      date: cart.date,
      notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
      promo_code: cart.appliedPromo?.code,
      additionals: cart.additionals.map(a => ({
        additional_id: a.id,
        quantity: a.quantity,
      })),
    }))

    if (createOrder.fulfilled.match(result)) {
      const orderId = result.payload.id
      navigate(`/orders/${orderId}/payment`)
    }
  }

  if (!cart.pack) {
    navigate('/')
    return null
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-2xl font-display font-bold text-zinc-100">Resumen de tu reserva</h1>

      <div ref={linesRef} className="dark-card divide-y divide-zinc-800">
        <div className="summary-line flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Pack</span>
          <span className="text-zinc-100 font-medium text-sm text-right">{cart.pack.name}</span>
        </div>
        <div className="summary-line flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Personas</span>
          <span className="text-zinc-100 font-medium text-sm">{cart.peopleCount}</span>
        </div>
        <div className="summary-line flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Fecha del evento</span>
          <span className="text-zinc-100 font-medium text-sm">{cart.date}</span>
        </div>
        <div className="summary-line flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Pack</span>
          <span className="text-brand-yellow font-mono text-sm">${cart.packPrice.toLocaleString()}</span>
        </div>
        {cart.additionals.map(a => (
          <div key={a.id} className="summary-line flex justify-between p-4">
            <span className="text-zinc-400 text-sm">{a.name} ×{a.quantity}</span>
            <span className="text-brand-yellow font-mono text-sm">${(a.price * a.quantity).toLocaleString()}</span>
          </div>
        ))}
        {localityFee > 0 && (
          <div className="summary-line flex justify-between p-4">
            <span className="text-zinc-400 text-sm">Traslado ({cart.eventDetails.locality})</span>
            <span className="text-brand-yellow font-mono text-sm">${localityFee.toLocaleString()}</span>
          </div>
        )}
        {cart.eventDetails.locality === LOCALITY_OTHER && (
          <div className="summary-line p-4">
            <p className="text-brand-yellow text-xs">⚠️ Traslado a coordinar — te contactaremos para acordar el valor.</p>
          </div>
        )}
        {cart.appliedPromo && (
          <div className="summary-line flex justify-between items-center p-4">
            <span className="text-emerald-400 text-sm">Descuento ({cart.appliedPromo.code})</span>
            <span className="text-emerald-400 font-mono text-sm">-${cart.appliedPromo.discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="summary-line flex justify-between p-4">
          <span className="text-zinc-100 font-bold">Total</span>
          <span className="text-brand-yellow font-mono font-bold text-xl">${total.toLocaleString()}</span>
        </div>
      </div>

      {/* Código de promoción */}
      <div className="dark-card p-4 space-y-2">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Código de descuento</p>
        {cart.appliedPromo ? (
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-sm">✓ {cart.appliedPromo.code} — ${cart.appliedPromo.discountAmount.toLocaleString()} de descuento en el pack</span>
            <button
              onClick={() => { dispatch(clearPromo()); setPromoError('') }}
              className="text-zinc-500 hover:text-zinc-300 text-sm ml-3"
            >✕</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                placeholder="CÓDIGO"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand-pink"
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {promoLoading ? '...' : 'Aplicar'}
              </button>
            </div>
            {promoError && <p className="text-red-400 text-xs">{promoError}</p>}
          </>
        )}
      </div>

      {/* Desglose de pago */}
      <div className="dark-card divide-y divide-zinc-800">
        <div className="flex justify-between items-center p-4">
          <div>
            <p className="text-zinc-100 text-sm font-semibold">Seña para reservar (30%)</p>
            <p className="text-zinc-500 text-xs mt-0.5">A transferir al confirmar</p>
          </div>
          <span className="text-brand-pink font-mono font-bold text-lg">${deposit.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center p-4">
          <div>
            <p className="text-zinc-400 text-sm font-medium">Restante (70%)</p>
            <p className="text-zinc-500 text-xs mt-0.5">A abonar el día del evento</p>
          </div>
          <span className="text-zinc-400 font-mono text-lg">${remaining.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-zinc-500 text-xs text-center">
        Al confirmar, se creará tu reserva y podrás enviar el comprobante de pago.
      </p>

      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="btn-brand w-full disabled:opacity-50"
      >
        {isLoading ? 'Procesando...' : 'Confirmar reserva →'}
      </button>

      <button
        onClick={() => navigate(-1)}
        className="w-full text-center text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
      >
        ← Volver
      </button>
    </div>
  )
}

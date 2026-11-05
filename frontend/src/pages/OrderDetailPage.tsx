import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { fetchOrderById } from '@store/slices/orderSlice'
import { useGsapFadeIn } from '@hooks/useGsap'
import OrderStatusBadge from '@components/ui/OrderStatusBadge'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentOrder, isLoading } = useAppSelector(s => s.order)
  const ref = useGsapFadeIn(0.1)

  useEffect(() => {
    if (id) dispatch(fetchOrderById(id))
  }, [id, dispatch])

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (!currentOrder) {
    return (
      <div className="text-center py-24">
        <p className="text-zinc-500">Reserva no encontrada.</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          ‹
        </button>
        <h1 className="text-xl font-display font-bold text-zinc-100">Detalle de reserva</h1>
      </div>

      {/* Status */}
      <div className="dark-card-elevated p-4 flex items-center justify-between">
        <span className="text-zinc-400 text-sm">Estado</span>
        <OrderStatusBadge status={currentOrder.status} />
      </div>

      {/* Details */}
      <div className="dark-card divide-y divide-zinc-800">
        <div className="flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Pack</span>
          <span className="text-zinc-100 font-medium text-sm">{currentOrder.packName}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Fecha</span>
          <span className="text-zinc-100 font-medium text-sm">{currentOrder.date}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-zinc-400 text-sm">Personas</span>
          <span className="text-zinc-100 font-medium text-sm">{currentOrder.peopleCount}</span>
        </div>
        {currentOrder.notes && (
          <div className="flex justify-between p-4">
            <span className="text-zinc-400 text-sm">Notas</span>
            <span className="text-zinc-100 text-sm text-right max-w-[180px]">{currentOrder.notes}</span>
          </div>
        )}
        {currentOrder.additionals && currentOrder.additionals.map(a => (
          <div key={a.id} className="flex justify-between p-4">
            <span className="text-zinc-400 text-sm">{a.additionalName} ×{a.quantity}</span>
            <span className="text-brand-yellow font-mono text-sm">${(a.unitPrice * a.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between p-4">
          <span className="text-zinc-100 font-bold">Total</span>
          <span className="text-brand-yellow font-mono font-bold text-xl">${currentOrder.totalPrice.toLocaleString()}</span>
        </div>
      </div>

      {/* Upload proof if pending_payment */}
      {currentOrder.status === 'pending_payment' && (
        <button
          onClick={() => navigate(`/orders/${currentOrder.id}/payment`)}
          className="btn-brand w-full"
        >
          Enviar comprobante de pago
        </button>
      )}
    </div>
  )
}

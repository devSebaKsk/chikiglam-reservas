import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch } from '@store/hooks'
import { addToast } from '@store/slices/uiSlice'
import { orderService } from '@services/orderService'
import OrderStatusBadge from '@components/ui/OrderStatusBadge'
import type { Order, OrderStatus } from '@/types'

const STATUS_FILTERS: Array<{ label: string; value: OrderStatus | 'all' }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pago pend.', value: 'pending_payment' },
  { label: 'Por confirmar', value: 'pending_confirmation' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Realizadas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
]

export default function AdminOrdersPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const ref = useGsapFadeIn()

  useEffect(() => {
    orderService.getAll().then(setOrders).finally(() => setLoading(false))
  }, [])

  const handleUpdateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await orderService.updateStatus(id, status)
      setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
      dispatch(addToast({ message: 'Estado actualizado', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Error al actualizar', type: 'error' }))
    }
  }

  const handleViewProof = async (id: string) => {
    try {
      await orderService.openProof(id)
    } catch {
      dispatch(addToast({ message: 'No hay comprobante disponible', type: 'warning' }))
    }
  }

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return (
        o.userName?.toLowerCase().includes(q) ||
        o.userPhone?.toLowerCase().includes(q) ||
        o.packName?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div ref={ref} className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-display font-bold text-zinc-100">Reservas</h1>
        <button
          onClick={() => navigate('/admin/orders/new')}
          className="text-sm bg-brand-pink text-white px-3 py-1.5 rounded-xl font-medium hover:bg-brand-pink/80 transition-colors"
        >
          + Nueva
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-brand-pink mb-3"
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f.value
                ? 'bg-brand-pink text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length: 4}).map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">No hay reservas.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div
              key={order.id}
              onClick={() => navigate(`/admin/orders/${order.id}`)}
              className="dark-card p-4 space-y-3 cursor-pointer hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-100 font-semibold text-sm truncate">
                    {order.userName ?? 'Cliente'} — {order.packName}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {order.date} · {order.peopleCount} personas
                  </p>
                </div>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-brand-yellow font-mono font-bold text-sm">
                  ${order.totalPrice.toLocaleString()}
                </span>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {order.status === 'pending_confirmation' && (
                    <button
                      onClick={() => handleViewProof(order.id)}
                      className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-xl"
                    >
                      📎 Comprobante
                    </button>
                  )}
                  {order.status === 'pending_confirmation' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                      className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-500/30"
                    >
                      ✓ Confirmar
                    </button>
                  )}
                  {(order.status === 'pending_payment' || order.status === 'pending_confirmation') && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                      className="text-xs bg-red-500/15 text-red-400 px-3 py-1.5 rounded-xl hover:bg-red-500/25"
                    >
                      ✕ Cancelar
                    </button>
                  )}
                  {order.status === 'cancelled' && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('¿Eliminar esta reserva permanentemente?')) return
                        try {
                          await orderService.deleteOrder(order.id)
                          setOrders(list => list.filter(o => o.id !== order.id))
                          dispatch(addToast({ message: 'Reserva eliminada', type: 'success' }))
                        } catch {
                          dispatch(addToast({ message: 'Error al eliminar', type: 'error' }))
                        }
                      }}
                      className="text-xs bg-red-900/30 text-red-400 px-3 py-1.5 rounded-xl hover:bg-red-900/50"
                    >
                      🗑 Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

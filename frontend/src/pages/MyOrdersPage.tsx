import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { fetchMyOrders } from '@store/slices/orderSlice'
import { useGsapStagger } from '@hooks/useGsap'
import OrderStatusBadge from '@components/ui/OrderStatusBadge'

export default function MyOrdersPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { orders, isLoading } = useAppSelector(s => s.order)
  const listRef = useGsapStagger(0.1, 0.06)

  useEffect(() => {
    dispatch(fetchMyOrders())
  }, [dispatch])

  if (isLoading && orders.length === 0) {
    return (
      <div className="px-4 py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-zinc-100 mb-5">Mis reservas</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-zinc-500">No tenés reservas aún.</p>
          <button onClick={() => navigate('/')} className="btn-brand mt-4">Ver Packs</button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {orders.map(order => (
            <button
              key={order.id}
              className="dark-card w-full p-4 text-left active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/mis-reservas/${order.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-zinc-100 font-semibold text-sm truncate flex-1">
                  {order.packName ?? 'Pack'}
                </span>
                <OrderStatusBadge status={order.status} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-xs">{order.date} · {order.peopleCount} personas</span>
                <span className="text-brand-yellow font-mono text-sm font-bold">
                  ${order.totalPrice.toLocaleString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

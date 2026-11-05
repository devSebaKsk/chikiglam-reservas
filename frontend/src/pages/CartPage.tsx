import { useNavigate } from 'react-router-dom'
import { useGsapSlideIn } from '@hooks/useGsap'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import {
  selectCartTotal, selectCartIsEmpty,
  incrementAdditional, decrementAdditional, clearCart,
} from '@store/slices/cartSlice'
import { useAuth } from '@hooks/useAuth'

export default function CartPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isAuthenticated } = useAuth()
  const cart = useAppSelector(s => s.cart)
  const total = useAppSelector(selectCartTotal)
  const isEmpty = useAppSelector(selectCartIsEmpty)
  const ref = useGsapSlideIn('up')

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-display font-bold text-zinc-100 mb-2">Tu carrito está vacío</h2>
        <p className="text-zinc-400 text-sm mb-6">Explorá nuestros packs y armá tu evento</p>
        <button onClick={() => navigate('/')} className="btn-brand">Ver Packs</button>
      </div>
    )
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/cart/date')
    } else {
      navigate('/cart/date')
    }
  }

  return (
    <div ref={ref} className="px-4 py-6 space-y-4">
      <h1 className="text-2xl font-display font-bold text-zinc-100">Tu carrito</h1>

      {/* Pack item */}
      <div className="dark-card p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
            {cart.pack?.imageKey ? (
              <img src={`/api/admin/upload/${cart.pack.imageKey}/serve`} alt={cart.pack.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🎉</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-100 font-semibold truncate">{cart.pack?.name}</p>
            <p className="text-zinc-400 text-sm">{cart.peopleCount} personas</p>
          </div>
          <span className="text-brand-yellow font-mono font-bold">
            ${cart.packPrice.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Additionals */}
      {cart.additionals.length > 0 && (
        <div className="dark-card p-4">
          <h3 className="text-zinc-300 font-semibold text-sm mb-3">Extras</h3>
          <div className="space-y-3">
            {cart.additionals.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <p className="text-zinc-200 text-sm flex-1 truncate">{a.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dispatch(decrementAdditional(a.id))}
                    className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center active:scale-90 transition-transform"
                  >−</button>
                  <span className="text-zinc-100 w-4 text-center text-sm font-bold">{a.quantity}</span>
                  <button
                    onClick={() => dispatch(incrementAdditional(a.id))}
                    className="w-7 h-7 rounded-full bg-zinc-700 text-zinc-100 flex items-center justify-center active:scale-90 transition-transform"
                  >+</button>
                </div>
                <span className="text-brand-yellow font-mono text-sm w-20 text-right">
                  ${(a.price * a.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total */}
      <div className="dark-card-elevated p-4 flex items-center justify-between">
        <span className="text-zinc-400 font-medium">Total</span>
        <span className="text-brand-yellow font-mono font-bold text-2xl">
          ${total.toLocaleString()}
        </span>
      </div>

      <div className="space-y-3">
        <button onClick={handleCheckout} className="btn-brand w-full">
          Elegir fecha →
        </button>
        <button
          onClick={() => { dispatch(clearCart()); navigate('/') }}
          className="w-full text-center text-zinc-500 text-sm py-2 hover:text-zinc-300 transition-colors"
        >
          Vaciar carrito
        </button>
      </div>
    </div>
  )
}

import { useRef } from 'react'
import gsap from 'gsap'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import {
  addAdditional, incrementAdditional, decrementAdditional,
} from '@store/slices/cartSlice'
import type { Additional } from '@/types'

interface AdditionalCardProps {
  additional: Additional
}

export default function AdditionalCard({ additional }: AdditionalCardProps) {
  const dispatch = useAppDispatch()
  const cartAdditional = useAppSelector(s =>
    s.cart.additionals.find(a => a.id === additional.id)
  )
  const qty = cartAdditional?.quantity ?? 0
  const cardRef = useRef<HTMLDivElement>(null)

  const handleAdd = () => {
    if (qty === 0) {
      dispatch(addAdditional({
        id: additional.id,
        name: additional.name,
        price: additional.price,
        imageKey: additional.imageKey ?? undefined,
        quantity: 1,
      }))
      if (cardRef.current) {
        gsap.fromTo(cardRef.current, { scale: 0.95 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' })
      }
    } else {
      dispatch(incrementAdditional(additional.id))
    }
  }

  const handleRemove = () => dispatch(decrementAdditional(additional.id))

  return (
    <div ref={cardRef} className="dark-card flex items-center gap-3 p-3">
      <div className="w-14 h-14 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
        {additional.imageKey ? (
          <img
            src={`/api/admin/upload/${additional.imageKey}/serve`}
            alt={additional.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-zinc-100 font-medium text-sm truncate">{additional.name}</p>
        {additional.description && (
          <p className="text-zinc-500 text-xs truncate mt-0.5">{additional.description}</p>
        )}
        <p className="text-brand-yellow font-mono font-bold text-sm mt-0.5">
          +${additional.price.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {qty > 0 ? (
          <>
            <button
              onClick={handleRemove}
              className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-100 flex items-center justify-center text-lg active:scale-90 transition-transform"
            >
              −
            </button>
            <span className="text-zinc-100 font-bold w-5 text-center">{qty}</span>
            <button
              onClick={handleAdd}
              className="w-8 h-8 rounded-full bg-brand-pink hover:brightness-110 text-white flex items-center justify-center text-lg active:scale-90 transition-transform"
            >
              +
            </button>
          </>
        ) : (
          <button
            onClick={handleAdd}
            className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-brand-pink text-zinc-100 flex items-center justify-center text-lg active:scale-90 transition-all"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

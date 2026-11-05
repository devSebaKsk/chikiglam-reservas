import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { PackPrice } from '@/types'

interface PriceTableProps {
  prices: PackPrice[]
  selectedPeople: number | null
  onSelectPeople: (count: number, price: number) => void
}

export default function PriceTable({ prices, selectedPeople, onSelectPeople }: PriceTableProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const rows = listRef.current.querySelectorAll('.price-row')
    gsap.fromTo(rows,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' }
    )
  }, [])

  const sorted = [...prices].sort((a, b) => a.peopleCount - b.peopleCount)

  return (
    <div ref={listRef} className="dark-card overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-zinc-100 font-semibold">Seleccioná cantidad de personas</h3>
      </div>
      {sorted.map((p) => {
        const isSelected = selectedPeople === p.peopleCount
        return (
          <button
            key={p.id}
            className={`price-row w-full flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/60 last:border-0 transition-all active:scale-[0.98] ${
              isSelected ? 'bg-brand-pink/10' : 'hover:bg-zinc-800/60'
            }`}
            onClick={() => onSelectPeople(p.peopleCount, p.price)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'border-brand-pink bg-brand-pink' : 'border-zinc-600'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`font-medium ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                {p.peopleCount} personas
              </span>
            </div>
            <span className={`font-mono font-bold text-lg ${isSelected ? 'text-brand-yellow' : 'text-zinc-400'}`}>
              ${p.price.toLocaleString()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

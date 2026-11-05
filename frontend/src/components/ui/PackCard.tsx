import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import type { Pack } from '@/types'

interface PackCardProps {
  pack: Pack
  index?: number
}

export default function PackCard({ pack, index = 0 }: PackCardProps) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cardRef.current) return
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 40, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, delay: index * 0.08, ease: 'power3.out' }
    )
  }, [index])

  const lowestPrice = pack.prices?.length
    ? Math.min(...pack.prices.map(p => p.price))
    : null

  const handleClick = () => navigate(`/packs/${pack.id}`)

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className="card-glow overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
    >
      {/* Image */}
      <div className="relative h-44 bg-zinc-800 overflow-hidden">
        {pack.imageKey ? (
          <img
            src={`/api/admin/upload/${pack.imageKey}/serve`}
            alt={pack.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-purple/30 to-brand-pink/30">
            <span className="text-5xl">🎉</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

        {/* People badge */}
        <div className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-zinc-300 font-medium border border-zinc-700/50">
          {pack.minPeople}–{pack.maxPeople} personas
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-bold text-zinc-100 text-lg leading-tight mb-1">
          {pack.name}
        </h3>
        <p className="text-zinc-400 text-sm line-clamp-2 mb-3">
          {pack.shortDescription}
        </p>

        <div className="flex items-center justify-between">
          {lowestPrice !== null ? (
            <div>
              <span className="text-xs text-zinc-500">desde</span>
              <span className="text-brand-yellow font-mono font-bold text-lg ml-1">
                ${lowestPrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="text-zinc-500 text-sm">Consultar precio</span>
          )}
          <span className="text-brand-pink text-sm font-medium">Ver más →</span>
        </div>
      </div>
    </div>
  )
}

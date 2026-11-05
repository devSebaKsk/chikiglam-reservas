import { useEffect, useState, Suspense, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { useGsapFadeIn } from '@hooks/useGsap'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { setPack as setCartPack } from '@store/slices/cartSlice'
import { addToast } from '@store/slices/uiSlice'
import PriceTable from '@components/ui/PriceTable'
import AdditionalCard from '@components/ui/AdditionalCard'
import SkeletonCard from '@components/ui/SkeletonCard'
import WaveBackground from '@lib/three/WaveBackground'
import { packService } from '@services/packService'
import { additionalService } from '@services/additionalService'
import type { Pack, Additional } from '@/types'

export default function PackDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const cart = useAppSelector(s => s.cart)

  const [pack, setPackData] = useState<Pack | null>(null)
  const [additionals, setAdditionals] = useState<Additional[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const contentRef = useGsapFadeIn(0.1)

  const closeLightbox = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setLightbox(false)
  }, [])

  useEffect(() => {
    if (!id) return
    Promise.all([
      packService.getById(id),
      additionalService.getAll(),
    ]).then(([p, a]) => {
      setPackData(p)
      setAdditionals(a.filter(x =>
        x.isActive &&
        (!x.applicablePackIds || x.applicablePackIds.length === 0 || x.applicablePackIds.includes(id))
      ))
    }).catch(() => setNotFound(true))
    .finally(() => setLoading(false))
  }, [id])

  const handleSelectPeople = (count: number, price: number) => {
    if (!pack) return
    dispatch(setCartPack({
      pack: {
        id: pack.id,
        name: pack.name,
        shortDescription: pack.shortDescription,
        imageKey: pack.imageKey ?? undefined,
        minPeople: pack.minPeople,
        maxPeople: pack.maxPeople,
      },
      peopleCount: count,
      packPrice: price,
    }))
  }

  const handleGoToCart = () => {
    if (!cart.pack || cart.pack.id !== pack?.id) {
      if (pack?.prices?.length === 1) {
        handleSelectPeople(pack.prices[0].peopleCount, pack.prices[0].price)
        navigate('/cart')
        return
      }
      dispatch(addToast({ message: 'Elegí la cantidad de personas primero', type: 'warning' }))
      return
    }
    navigate('/cart')
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton h-56 rounded-2xl" />
        <SkeletonCard count={2} />
      </div>
    )
  }

  if (notFound || !pack) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-zinc-300 font-semibold mb-1">Pack no disponible</p>
        <p className="text-zinc-500 text-sm mb-6">Este pack no existe o ya no está disponible.</p>
        <button onClick={() => navigate('/packs')} className="btn-brand px-6 py-2">Ver todos los packs</button>
      </div>
    )
  }

  return (
    <div>
      {/* Lightbox */}
      {lightbox && pack.imageKey && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-300 text-lg"
          >
            ✕
          </button>
          <img
            src={`/api/admin/upload/${pack.imageKey}/serve`}
            alt={pack.name}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* Hero */}
      <div className="relative h-56 overflow-hidden">
        {pack.imageKey ? (
          <>
            <img
              src={`/api/admin/upload/${pack.imageKey}/serve`}
              alt={pack.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={() => setLightbox(true)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white text-sm backdrop-blur-sm"
              title="Ver imagen completa"
            >
              ⛶
            </button>
          </>
        ) : (
          <Canvas
            camera={{ position: [0, 0, 4], fov: 60 }}
            gl={{ antialias: true, alpha: true }}
            className="absolute inset-0 w-full h-full"
          >
            <Suspense fallback={null}>
              <WaveBackground />
            </Suspense>
          </Canvas>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate('/packs')}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm text-base leading-none"
        >
          ‹
        </button>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-display font-bold text-zinc-100">{pack.name}</h1>
          <p className="text-zinc-400 text-sm">{pack.minPeople}–{pack.maxPeople} personas</p>
        </div>
      </div>

      <div ref={contentRef} className="px-4 py-5 space-y-5">
        {/* Category badge */}
        {pack.category && (
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            pack.category === 'carpa'    ? 'bg-sky-500/15 text-sky-400' :
            pack.category === 'adentro' ? 'bg-violet-500/15 text-violet-400' :
            pack.category === 'talleres'? 'bg-amber-500/15 text-amber-400' :
                                          'bg-rose-500/15 text-rose-400'
          }`}>
            {pack.category === 'carpa'    ? '⛺ Con Carpa' :
             pack.category === 'adentro' ? '🏠 En Casa' :
             pack.category === 'talleres'? '🎨 Talleres' :
                                           '✨ Para Grandes'}
          </span>
        )}

        {/* Description */}
        <p className="text-zinc-300 text-sm leading-relaxed">{pack.fullDescription}</p>

        {/* Price table */}
        {pack.prices && pack.prices.length > 0 && (
          <PriceTable
            prices={pack.prices}
            selectedPeople={cart.pack?.id === pack.id ? cart.peopleCount : null}
            onSelectPeople={handleSelectPeople}
          />
        )}

        {/* Resources */}
        {pack.resources && pack.resources.length > 0 && (
          <div>
            <h3 className="text-zinc-100 font-semibold mb-3">Incluye</h3>
            <div className="dark-card p-4">
              <ul className="space-y-2">
                {pack.resources.map(r => {
                  return (
                    <li key={r.resourceId} className="flex items-center gap-2 text-sm">
                      <span className="text-brand-pink">✦</span>
                      <span className="text-zinc-300">{r.resourceName}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Additionals */}
        {additionals.length > 0 && (
          <div>
            <h3 className="text-zinc-100 font-semibold mb-3">Extras opcionales</h3>
            <div className="space-y-2">
              {additionals.map(a => (
                <AdditionalCard key={a.id} additional={a} />
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleGoToCart}
          className="btn-brand w-full"
        >
          {cart.pack?.id === pack.id && cart.peopleCount
            ? `Ver carrito — ${cart.peopleCount} personas`
            : 'Agregar al carrito'
          }
        </button>
      </div>
    </div>
  )
}

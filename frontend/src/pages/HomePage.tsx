import { useEffect, useRef, Suspense, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import BrandParticles from '@lib/three/BrandParticles'
import { eventService } from '@services/eventService'
import type { ChikiEvent } from '@/types'

type Tab = 'info' | 'merch' | 'eventos'


export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [events, setEvents] = useState<ChikiEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const logoRef = useRef<HTMLImageElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!logoRef.current) return
    gsap.to(logoRef.current, {
      y: -10, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut',
    })
  }, [])

  useEffect(() => {
    if (activeTab === 'eventos' && events.length === 0) {
      setEventsLoading(true)
      eventService.getAll().then(setEvents).finally(() => setEventsLoading(false))
    }
  }, [activeTab])

  useEffect(() => {
    if (location.state?.scrollTo === 'requisitos-carpa') {
      setActiveTab('info')
      setTimeout(() => {
        document.getElementById('requisitos-carpa')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [location.state])

  return (
    <div>
      {/* Three.js Hero */}
      <div className="relative h-[220px] overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 70 }}
          gl={{ antialias: true, alpha: true }}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        >
          <Suspense fallback={null}>
            <BrandParticles count={120} />
          </Suspense>
        </Canvas>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
          <img
            ref={logoRef}
            src="/logo-solo.png"
            alt="ChikiGlam"
            className="h-32 w-auto object-contain drop-shadow-[0_0_24px_rgba(244,6,139,0.4)]"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent" />
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 mb-4">
        <div className="flex overflow-x-auto no-scrollbar px-4 gap-1">
          {/* Inicio */}
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-brand-pink text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>✨</span>
            <span>Inicio</span>
          </button>

          {/* Packs — navega directo */}
          <button
            onClick={() => navigate('/packs')}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            <span>🎀</span>
            <span>Packs</span>
          </button>

          {/* Eventos */}
          <button
            onClick={() => setActiveTab('eventos')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'eventos'
                ? 'border-brand-pink text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>🎪</span>
            <span>Comunidad</span>
          </button>

          {/* Merch */}
          <button
            onClick={() => setActiveTab('merch')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'merch'
                ? 'border-brand-pink text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>🛍️</span>
            <span>Merch</span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-6">

        {/* Inicio */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="dark-card p-5">
              <h2 className="text-lg font-display font-bold text-zinc-100 mb-3">¡Bienvenidos a ChikiGlam! 🎉</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Acá vas a encontrar toda la información sobre nuestros servicios. Explorá los packs de pijamadas, talleres y más.
              </p>
            </div>
            <div className="dark-card p-5">
              <h3 className="text-zinc-100 font-semibold mb-2 text-sm">¿Cómo funciona?</h3>
              <ol className="space-y-2 text-zinc-400 text-sm">
                <li className="flex gap-2"><span className="text-brand-pink font-bold">1.</span> Elegí el pack que más te guste</li>
                <li className="flex gap-2"><span className="text-brand-pink font-bold">2.</span> Seleccioná la cantidad de personas y extras</li>
                <li className="flex gap-2"><span className="text-brand-pink font-bold">3.</span> Elegí la fecha disponible</li>
                <li className="flex gap-2"><span className="text-brand-pink font-bold">4.</span> Confirmá y abonás el 30% del valor del evento por transferencia</li>
              </ol>
            </div>
            <div id="requisitos-carpa" className="dark-card p-5">
              <h3 className="text-zinc-100 font-semibold mb-3 text-sm">Requisitos para la instalación de carpa ⛺</h3>
              <ul className="space-y-2.5 text-zinc-400 text-sm">
                <li className="flex gap-2 items-start"><span>☝️</span><span>Es necesario contar con un espacio libre de <strong className="text-zinc-300">7 m²</strong>.</span></li>
                <li className="flex gap-2 items-start"><span>🏕️</span><span>La carpa <strong className="text-zinc-300">no se puede armar sobre piso de cemento</strong> (idealmente sobre pasto o tierra).</span></li>
                <li className="flex gap-2 items-start"><span>🥶</span><span>Para fechas de temperaturas muy bajas contamos con <strong className="text-zinc-300">calentador y bolsas de dormir</strong>.</span></li>
                <li className="flex gap-2 items-start"><span>🏡</span><span>El servicio es <strong className="text-zinc-300">a domicilio</strong>.</span></li>
              </ul>
              <p className="mt-3 text-zinc-500 text-xs leading-relaxed">
                Si no contás con el espacio disponible podés considerar la opción de Pijamadas en espacio Mixtura o consultar por nuestras pijamadas adentro de casa ☺️
              </p>
            </div>

          </div>
        )}

        {/* Merch */}
        {activeTab === 'merch' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🛍️</div>
            <h2 className="text-xl font-display font-bold text-zinc-100 mb-2">¡Próximamente!</h2>
            <p className="text-zinc-500 text-sm max-w-[240px]">
              Estamos preparando algo muy especial. ¡Volvé pronto!
            </p>
          </div>
        )}

        {/* Eventos */}
        {activeTab === 'eventos' && (
          <div className="space-y-4">
            {eventsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
              </div>
            )}

            {!eventsLoading && events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4">🎪</div>
                <p className="text-zinc-400 text-sm font-medium mb-1">No hay eventos por ahora</p>
                <p className="text-zinc-600 text-xs">¡Volvé pronto para ver las novedades!</p>
                <div className="mt-8 px-6 py-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 max-w-xs">
                  <p className="text-zinc-300 text-sm font-medium mb-1">¿Tenés un evento o servicio para infantes?</p>
                  <p className="text-zinc-500 text-xs mb-4">Escribinos y lo publicamos para que llegues a más familias.</p>
                  <a
                    href="https://wa.me/5492995217901"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.855L.057 23.272a.75.75 0 0 0 .916.919l5.453-1.43A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.726 9.726 0 0 1-4.964-1.355l-.355-.212-3.679.965.982-3.594-.232-.37A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                    </svg>
                    Escribinos al WhatsApp
                  </a>
                </div>
              </div>
            )}

            {!eventsLoading && [...events].sort((a, b) => (b.isChikiGlam ? 1 : 0) - (a.isChikiGlam ? 1 : 0)).map(ev => (
              <div key={ev.id} className="dark-card overflow-hidden">
                {ev.imageKey && (
                  <img
                    src={`/api/admin/upload/${ev.imageKey}/serve`}
                    alt={ev.title}
                    className="w-full h-44 object-cover"
                  />
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-start gap-2">
                    {ev.isChikiGlam && <span className="text-brand-yellow text-base mt-0.5">⭐</span>}
                    <h3 className="text-zinc-100 font-display font-bold text-lg leading-tight">{ev.title}</h3>
                  </div>

                  {ev.organizerName && (
                    <p className="text-zinc-500 text-xs">por {ev.organizerName}</p>
                  )}

                  {ev.description && (
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">{ev.description}</p>
                  )}

                  {ev.dates.length > 0 && (
                    <div className="space-y-1.5">
                      {ev.dates.slice(0, 2).map(d => (
                        <div key={d.id} className="flex items-center gap-2 text-sm">
                          <span className="text-brand-pink">📅</span>
                          <span className="text-zinc-300 font-medium">{d.date}</span>
                          {(d.startTime || d.endTime) && (
                            <span className="text-zinc-500">
                              {d.startTime}{d.endTime ? ` – ${d.endTime}` : ''}
                            </span>
                          )}
                        </div>
                      ))}
                      {ev.dates.length > 2 && (
                        <p className="text-zinc-600 text-xs">+{ev.dates.length - 2} fechas más</p>
                      )}
                    </div>
                  )}

                  {ev.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>📍</span>
                      <span className="text-zinc-400">{ev.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/eventos/${ev.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-transform active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #6f28d0, #f4068b)' }}
                    >
                      Ver evento e inscribirme
                    </Link>
                    {ev.instagramUrl && (
                      <a
                        href={ev.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-brand-pink transition-colors flex-shrink-0"
                        title="Ver en Instagram"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { useAppSelector } from '@store/hooks'
import { selectCartItemCount } from '@store/slices/cartSlice'
import { useAuth } from '@hooks/useAuth'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M3 12L12 3L21 12M5 10V19a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const PacksIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const OrdersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const ContactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const BAR_H = 64
const CIRCLE_D = 52
const CIRCLE_R = CIRCLE_D / 2
const NOTCH_HALF = 52
const NOTCH_DEPTH = 34
const CORNER_R = 20

function buildPath(w: number, cx: number): string {
  if (w <= 0 || cx <= 0) return ''
  const nh = NOTCH_HALF
  const nd = NOTCH_DEPTH
  const cr = CORNER_R
  return [
    `M ${cr} 0`,
    `H ${cx - nh}`,
    `C ${cx - nh + 22} 0, ${cx - 14} ${nd}, ${cx} ${nd}`,
    `C ${cx + 14} ${nd}, ${cx + nh - 22} 0, ${cx + nh} 0`,
    `H ${w - cr}`,
    `Q ${w} 0, ${w} ${cr}`,
    `V ${BAR_H}`,
    `H 0`,
    `V ${cr}`,
    `Q 0 0, ${cr} 0`,
    `Z`,
  ].join(' ')
}

type NavItemDef = {
  to: string
  end?: boolean
  Icon: () => React.ReactElement
  label: string
  badge?: number
  matchPaths?: string[]
}

export default function BottomNav() {
  const location = useLocation()
  const cartCount = useAppSelector(selectCartItemCount)
  const { isAuthenticated } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const circleRef = useRef<HTMLDivElement>(null)
  const proxy = useRef({ cx: 0 })
  const isInit = useRef(false)
  const [barWidth, setBarWidth] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const navItems: NavItemDef[] = [
    { to: '/', end: true, Icon: HomeIcon, label: 'Inicio' },
    { to: '/packs', Icon: PacksIcon, label: 'Packs' },
    { to: '/cart', Icon: CartIcon, label: 'Carrito', badge: cartCount || undefined },
    isAuthenticated
      ? { to: '/mis-reservas', Icon: OrdersIcon, label: 'Reservas', matchPaths: ['/mis-reservas', '/orders/'] }
      : { to: '/acceder', Icon: ProfileIcon, label: 'Perfil' },
    { to: '/contacto', Icon: ContactIcon, label: 'Contacto' },
  ]

  const getCenterX = (idx: number, w: number) => {
    const iw = w / navItems.length
    return iw * idx + iw / 2
  }

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observe = () => {
      const w = el.offsetWidth
      if (w > 0) setBarWidth(w)
    }
    observe()
    const ro = new ResizeObserver(observe)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const idx = navItems.findIndex(item => {
      if (item.matchPaths) return item.matchPaths.some(p => location.pathname.startsWith(p))
      return item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    })
    setActiveIdx(idx >= 0 ? idx : 0)
  }, [location.pathname, isAuthenticated])

  useEffect(() => {
    if (!barWidth || !pathRef.current || !circleRef.current) return
    const cx = getCenterX(activeIdx, barWidth)
    const p = proxy.current
    const updateD = () => pathRef.current?.setAttribute('d', buildPath(barWidth, p.cx))

    if (!isInit.current) {
      p.cx = cx
      updateD()
      gsap.set(circleRef.current, { left: cx - CIRCLE_R })
      isInit.current = true
      return
    }

    gsap.killTweensOf(p)
    gsap.killTweensOf(circleRef.current)
    gsap.to(p, { cx, duration: 0.45, ease: 'power3.inOut', onUpdate: updateD })
    gsap.to(circleRef.current, { left: cx - CIRCLE_R, duration: 0.45, ease: 'power3.inOut' })
    gsap.fromTo(circleRef.current, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(2)' })
  }, [activeIdx, barWidth])

  const ActiveItem = navItems[activeIdx]

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
      style={{ height: BAR_H + CIRCLE_R + 8, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0"
        style={{ height: BAR_H }}
      >
        {/* SVG notch bar */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={barWidth || 430}
          height={BAR_H}
          style={{ overflow: 'visible' }}
        >
          <path
            ref={pathRef}
            fill="#111111"
            d={barWidth ? buildPath(barWidth, getCenterX(activeIdx, barWidth)) : ''}
          />
        </svg>

        {/* Floating active bubble */}
        <div
          ref={circleRef}
          className="absolute z-20 rounded-full flex items-center justify-center text-white"
          style={{
            width: CIRCLE_D,
            height: CIRCLE_D,
            top: -(CIRCLE_R - 8),
            left: 0,
            background: 'linear-gradient(135deg, #6f28d0, #f4068b)',
            boxShadow: '0 4px 24px rgba(244,6,139,0.55), 0 0 0 3px rgba(111,40,208,0.25)',
          }}
        >
          {ActiveItem && <ActiveItem.Icon />}
        </div>

        {/* Nav items */}
        <div className="relative z-10 flex items-end h-full">
          {navItems.map((item, i) => {
            const isActive = i === activeIdx
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex-1 flex flex-col items-center gap-0.5 pb-2 relative"
              >
                <span className={isActive ? 'opacity-0' : 'text-zinc-500'}>
                  <item.Icon />
                </span>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                  {item.label}
                </span>
                {item.badge != null && item.badge > 0 && !isActive && (
                  <span className="absolute top-0.5 right-[calc(50%-12px)] bg-brand-pink text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

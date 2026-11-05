import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useAuth } from '@hooks/useAuth'

export default function Navbar() {
  const { isAuthenticated, isAdmin } = useAuth()
  const logoRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!logoRef.current) return
    gsap.to(logoRef.current, {
      opacity: 0.7, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut',
    })
  }, [])

  return (
    <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
      <div className="flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center">
          <img
            ref={logoRef}
            src="/logo.png"
            alt="ChikiGlam"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated && isAdmin && (
            <Link
              to="/admin"
              className="text-xs text-zinc-400 hover:text-brand-pink transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800"
            >
              Admin
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/login"
              className="text-xs text-zinc-400 hover:text-brand-pink transition-colors px-3 py-1.5 rounded-full border border-zinc-700 hover:border-brand-pink"
            >
              Staff
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

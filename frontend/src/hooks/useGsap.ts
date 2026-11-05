import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const useGsapFadeIn = (delay = 0) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.7, delay, ease: 'power3.out',
      })
    })
    return () => ctx.revert()
  }, [delay])
  return ref
}

export const useGsapScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%', toggleActions: 'play none none none' },
      })
    })
    return () => ctx.revert()
  }, [])
  return ref
}

export const useGsapStagger = (delay = 0, staggerDelay = 0.08) => {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(containerRef.current!.children, { opacity: 0, y: 30, scale: 0.95 }, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.5, delay, stagger: staggerDelay, ease: 'power3.out',
      })
    })
    return () => ctx.revert()
  }, [delay, staggerDelay])
  return containerRef
}

export const useGsapSlideIn = (direction: 'left' | 'right' | 'up' = 'up', delay = 0) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const from = direction === 'left' ? { x: -40, opacity: 0 }
               : direction === 'right' ? { x: 40, opacity: 0 }
               : { y: 40, opacity: 0 }
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current, from, {
        x: 0, y: 0, opacity: 1, duration: 0.6, delay, ease: 'power3.out',
      })
    })
    return () => ctx.revert()
  }, [direction, delay])
  return ref
}

export const useGsapCounter = (target: number, duration = 1.2, delay = 0) => {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const obj = { value: 0 }
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        value: target, duration, delay, ease: 'power2.out',
        onUpdate: () => { if (ref.current) ref.current.textContent = Math.round(obj.value).toString() },
      })
    })
    return () => ctx.revert()
  }, [target, duration, delay])
  return ref
}

export const useGsapMagnetic = () => {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      gsap.to(el, { x: (e.clientX - cx) * 0.2, y: (e.clientY - cy) * 0.2, duration: 0.4, ease: 'power2.out' })
    }
    const handleLeave = () => { gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' }) }
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => { el.removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave) }
  }, [])
  return ref
}

export const useGsapBottomSheet = (isOpen: boolean) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (isOpen) {
      gsap.fromTo(ref.current, { y: '100%' }, { y: '0%', duration: 0.4, ease: 'power3.out' })
    } else {
      gsap.to(ref.current, { y: '100%', duration: 0.3, ease: 'power2.in' })
    }
  }, [isOpen])
  return ref
}

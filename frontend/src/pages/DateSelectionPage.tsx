import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/hooks'
import { setDate } from '@store/slices/cartSlice'
import { addToast } from '@store/slices/uiSlice'
import AvailabilityCalendar from '@components/ui/AvailabilityCalendar'
import OtpModal from '@components/ui/OtpModal'
import { packService } from '@services/packService'
import type { AvailabilityMap } from '@/types'

const pad = (n: number) => String(n).padStart(2, '0')

function monthStr(y: number, m: number): string {
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default function DateSelectionPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const cart = useAppSelector(s => s.cart)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  // Single merged map for ALL fetched months — calendar reads from it directly
  const [availabilityCache, setAvailabilityCache] = useState<AvailabilityMap>({})
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [monthLoading, setMonthLoading] = useState(false)

  // Track which months are already fetched (or in-flight) to avoid duplicates
  const fetchedMonths = useRef<Set<string>>(new Set())

  const fetchMonth = useCallback(async (packId: string, ms: string): Promise<void> => {
    if (fetchedMonths.current.has(ms)) return
    fetchedMonths.current.add(ms)
    try {
      const data = await packService.getMonthAvailability(packId, ms)
      setAvailabilityCache(prev => ({ ...prev, ...data }))
    } catch {
      fetchedMonths.current.delete(ms) // allow retry
    }
  }, [])

  // On mount: fetch current month + next 3 months in parallel
  useEffect(() => {
    if (!cart.pack?.id) return
    const packId = cart.pack.id
    const months = Array.from({ length: 4 }, (_, i) => monthStr(now.getFullYear(), now.getMonth() + i))
    Promise.all(months.map(m => fetchMonth(packId, m))).finally(() => setInitialLoaded(true))
  }, [cart.pack?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When navigating to a new month, pre-fetch it + the next one if not cached yet
  useEffect(() => {
    if (!cart.pack?.id || !initialLoaded) return
    const packId = cart.pack.id
    const current = monthStr(year, month)
    const next = monthStr(year, month + 1)

    const missing = [current, next].filter(m => !fetchedMonths.current.has(m))
    if (missing.length === 0) return

    setMonthLoading(true)
    Promise.all(missing.map(m => fetchMonth(packId, m))).finally(() => setMonthLoading(false))
  }, [year, month, initialLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const handleSelectDate = (date: string) => {
    dispatch(setDate(date))
  }

  const handleConfirm = () => {
    if (!cart.date) {
      dispatch(addToast({ message: 'Elegí una fecha primero', type: 'warning' }))
      return
    }
    setShowOtp(true)
  }

  const [showOtp, setShowOtp] = useState(false)

  const handleOtpSuccess = () => {
    navigate('/cart/confirm')
  }

  if (!cart.pack) {
    navigate('/')
    return null
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-zinc-100">Elegí la fecha</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {cart.pack.name} · {cart.peopleCount} personas
        </p>
      </div>

      {!initialLoaded ? (
        <div className="skeleton h-80 rounded-2xl" />
      ) : (
        <AvailabilityCalendar
          availabilityMap={availabilityCache}
          selectedDate={cart.date}
          onSelectDate={handleSelectDate}
          year={year}
          month={month}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          loading={monthLoading}
        />
      )}

      {cart.date && (
        <div className="dark-card-elevated p-4 flex items-center justify-between">
          <span className="text-zinc-300 text-sm">Fecha seleccionada</span>
          <span className="text-zinc-100 font-semibold">{cart.date}</span>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!cart.date}
        className="btn-brand w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirmar fecha →
      </button>

      <OtpModal
        isOpen={showOtp}
        onClose={() => setShowOtp(false)}
        onSuccess={handleOtpSuccess}
      />
    </div>
  )
}

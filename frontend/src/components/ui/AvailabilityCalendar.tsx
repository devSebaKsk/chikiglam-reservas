import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { AvailabilityMap } from '@/types'

interface AvailabilityCalendarProps {
  availabilityMap: AvailabilityMap
  selectedDate: string | null
  onSelectDate: (date: string) => void
  year: number
  month: number
  onPrevMonth: () => void
  onNextMonth: () => void
  loading?: boolean
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function AvailabilityCalendar({
  availabilityMap, selectedDate, onSelectDate, year, month, onPrevMonth, onNextMonth, loading = false
}: AvailabilityCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [prevMonth, setPrevMonth] = useState(month)

  useEffect(() => {
    if (!gridRef.current || month === prevMonth) return
    setPrevMonth(month)
    const cells = gridRef.current.querySelectorAll('.cal-day')
    gsap.fromTo(cells,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.015, ease: 'power2.out' }
    )
  }, [month, prevMonth])

  useEffect(() => {
    if (!gridRef.current) return
    const cells = gridRef.current.querySelectorAll('.cal-day')
    gsap.fromTo(cells,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.015, ease: 'power2.out' }
    )
  }, [])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const pad = (n: number) => String(n).padStart(2, '0')

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]

  return (
    <div className="dark-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 active:scale-90 transition-transform"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="text-zinc-100 font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>
          {loading && (
            <span className="w-3 h-3 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
          )}
        </div>
        <button
          onClick={onNextMonth}
          className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 active:scale-90 transition-transform"
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-zinc-500 text-xs py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div ref={gridRef} className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const date = new Date(year, month, day)
          const isPast = date < today
          const available = dateStr in availabilityMap ? availabilityMap[dateStr] : true
          const isSelected = selectedDate === dateStr
          const isUnavailable = !available || isPast

          return (
            <button
              key={dateStr}
              className={`cal-day aspect-square rounded-xl text-sm font-medium flex items-center justify-center transition-all active:scale-90 ${
                isSelected
                  ? 'bg-brand-pink text-white shadow-brand'
                  : isUnavailable
                  ? 'text-zinc-600 cursor-not-allowed bg-zinc-800/30'
                  : 'text-zinc-100 bg-zinc-800 hover:bg-zinc-700 cursor-pointer'
              }`}
              onClick={() => !isUnavailable && onSelectDate(dateStr)}
              disabled={isUnavailable}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-zinc-800" />
          <span className="text-zinc-500 text-xs">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-brand-pink" />
          <span className="text-zinc-500 text-xs">Seleccionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-zinc-800/30" />
          <span className="text-zinc-500 text-xs">No disponible</span>
        </div>
      </div>
    </div>
  )
}

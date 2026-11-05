import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@store/hooks'
import { removeToast } from '@store/slices/uiSlice'

const ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' }
const STYLES = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  error:   'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-brand-yellow/10 border-brand-yellow/30 text-brand-yellow',
  info:    'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan',
}
const ICON_STYLES = {
  success: 'bg-emerald-500/20 text-emerald-400',
  error:   'bg-red-500/20 text-red-400',
  warning: 'bg-brand-yellow/20 text-brand-yellow',
  info:    'bg-brand-cyan/20 text-brand-cyan',
}

export default function Toast() {
  const dispatch = useAppDispatch()
  const toasts = useAppSelector(s => s.ui.toasts)

  useEffect(() => {
    const timers = toasts.map(t =>
      setTimeout(() => dispatch(removeToast(t.id)), 4000)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, dispatch])

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${STYLES[toast.type]} border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-slide-down`}
        >
          <span className={`${ICON_STYLES[toast.type]} w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
            {ICONS[toast.type]}
          </span>
          <span className="text-sm font-medium text-zinc-100 flex-1">{toast.message}</span>
          <button
            onClick={() => dispatch(removeToast(toast.id))}
            className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

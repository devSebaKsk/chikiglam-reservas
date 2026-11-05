interface ToggleProps {
  value: boolean
  onChange: (v: boolean) => void
  colorOn?: string
}

export default function Toggle({ value, onChange, colorOn }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: value ? (colorOn ?? '#f4068b') : '#3f3f46' }}
    >
      <span
        className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: value ? 'translateX(26px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

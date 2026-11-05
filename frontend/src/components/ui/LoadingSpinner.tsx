export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
        <div className="absolute inset-0 rounded-full border-2 border-brand-pink border-t-transparent animate-spin" />
      </div>
    </div>
  )
}

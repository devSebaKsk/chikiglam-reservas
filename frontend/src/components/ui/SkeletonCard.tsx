interface SkeletonCardProps {
  count?: number
}

export default function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="dark-card overflow-hidden">
          <div className="skeleton h-44 w-full" />
          <div className="p-4 space-y-3">
            <div className="skeleton h-5 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-full rounded-lg" />
            <div className="skeleton h-4 w-2/3 rounded-lg" />
            <div className="flex justify-between items-center mt-2">
              <div className="skeleton h-6 w-24 rounded-lg" />
              <div className="skeleton h-4 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

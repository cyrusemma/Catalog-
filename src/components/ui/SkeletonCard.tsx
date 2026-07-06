export default function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`card h-full flex flex-col min-w-0 ${compact ? 'w-44 sm:w-48 rounded-2xl' : ''}`}>
      <div className={`relative overflow-hidden shrink-0 ${compact ? 'aspect-[4/5] sm:aspect-square' : 'aspect-square'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/80 via-slate-200/60 to-slate-200/80 animate-shimmer" />
      </div>
      <div className={`flex flex-col flex-grow ${compact ? 'p-2' : 'p-3'}`}>
        <div className="h-3 bg-cream-100 dark:bg-dark-700 rounded w-2/3 mb-2 mt-auto" />
        <div className="h-3 bg-cream-100 dark:bg-dark-700 rounded w-1/2" />
      </div>
    </div>
  )
}

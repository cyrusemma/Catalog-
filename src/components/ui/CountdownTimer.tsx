import { useEffect, useState } from 'react'

interface Props {
  /** ISO timestamp when the sale ends. */
  endsAt: string
  /** Called once when the countdown crosses zero (e.g. to re-render prices). */
  onExpire?: () => void
  /** Visual size. `chip` is the compact card variant, `bar` the larger detail variant. */
  variant?: 'chip' | 'bar'
  className?: string
}

function remaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

const pad = (n: number) => n.toString().padStart(2, '0')

export default function CountdownTimer({ endsAt, onExpire, variant = 'chip', className = '' }: Props) {
  const [time, setTime] = useState(() => remaining(endsAt))

  useEffect(() => {
    setTime(remaining(endsAt))
    const id = window.setInterval(() => {
      const next = remaining(endsAt)
      setTime(next)
      if (!next) {
        window.clearInterval(id)
        onExpire?.()
      }
    }, 1000)
    return () => window.clearInterval(id)
    // onExpire intentionally omitted — callers pass a fresh closure each render
    // and we only want the interval keyed to the deadline itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt])

  if (!time) return null

  // Drop the days segment once we're inside the final day to keep it tight.
  const segments: [string, number][] = time.days > 0
    ? [['d', time.days], ['h', time.hours], ['m', time.minutes], ['s', time.seconds]]
    : [['h', time.hours], ['m', time.minutes], ['s', time.seconds]]

  if (variant === 'bar') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`} role="timer" aria-label="Flash sale ends in">
        {segments.map(([label, value]) => (
          <div key={label} className="flex flex-col items-center">
            <span className="tabular-nums font-bold text-lg leading-none bg-dark-800 text-white dark:bg-white/10 rounded-lg px-2.5 py-1.5 min-w-[2.4rem] text-center">
              {pad(value)}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-dark-800/50 dark:text-white/40 mt-1">{label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 tabular-nums font-bold ${className}`}
      role="timer"
      aria-label="Flash sale ends in"
    >
      {segments.map(([label, value], i) => (
        <span key={label}>
          {pad(value)}{label}{i < segments.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

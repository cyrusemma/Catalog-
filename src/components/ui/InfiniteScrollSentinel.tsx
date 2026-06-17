import { useEffect, useRef } from 'react'

export default function InfiniteScrollSentinel({
  onReach,
  disabled,
}: {
  onReach: () => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (disabled) return

    const el = ref.current
    let ticking = false

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return

        if (ticking) return
        ticking = true

        // Defer to avoid rapid double triggers in some browsers.
        window.requestAnimationFrame(() => {
          ticking = false
          onReach()
        })
      },
      {
        root: null,
        rootMargin: '600px 0px',
        threshold: 0.01,
      },
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [disabled, onReach])

  return <div ref={ref} aria-hidden="true" className="h-1" />
}


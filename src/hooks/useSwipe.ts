import { useRef } from 'react'

interface SwipeHandlers {
  onSwipeLeft: () => void
  onSwipeRight: () => void
  /** Minimum horizontal travel in px before counting as a swipe. */
  threshold?: number
}

/**
 * Lightweight horizontal-swipe detector. Returns spreadable handlers that
 * track pointer/touch start + end, fire a callback on release if the gesture
 * moved more than `threshold` px (default 40) horizontally, and otherwise let
 * the underlying tap proceed. Uses pointer events so it covers touch, mouse,
 * and pen with one path.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 40 }: SwipeHandlers) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    startY.current = e.clientY
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current == null || startY.current == null) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    startX.current = null
    startY.current = null
    // Ignore primarily-vertical drags so we don't fight the page scroll.
    if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  // Treat cancel like up-without-movement so a dropped pointer doesn't leave
  // stale state.
  const onPointerCancel = () => {
    startX.current = null
    startY.current = null
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}

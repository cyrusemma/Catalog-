import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'
import { useToastStore, type ToastType, type Toast } from '../../store/toastStore'
import { Link } from 'react-router-dom'

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-brand-400',
}

function ToastItem({ toast, removeToast }: { toast: Toast; removeToast: (id: string) => void }) {
  useEffect(() => {
    if (toast.duration === 0) return
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, toast.duration || 2500) // Slightly faster duration (2.5s)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  const Icon = iconMap[toast.type]
  const isCart = toast.title.toLowerCase().includes('cart')
  const isWishlist = toast.title.toLowerCase().includes('wishlist')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.3, x: 40, y: -40, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.8, x: 10, y: -10, filter: 'blur(8px)', transition: { duration: 0.8, ease: "easeOut" } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="pointer-events-auto flex items-center justify-between gap-3 w-full bg-white/70 dark:bg-dark-800/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex-shrink-0 ${colorMap[toast.type]}`}>
          <Icon size={20} weight="fill" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark-800 dark:text-white truncate">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-dark-800/60 dark:text-white/60 truncate">
              {toast.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isCart && (
          <Link
            to="/cart"
            onClick={() => removeToast(toast.id)}
            className="text-xs font-bold text-brand-400 hover:text-brand-500 px-2 py-1 bg-brand-400/10 rounded-lg transition-colors"
          >
            View
          </Link>
        )}
        {isWishlist && (
          <Link
            to="/wishlist"
            onClick={() => removeToast(toast.id)}
            className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1 bg-red-500/10 rounded-lg transition-colors"
          >
            View
          </Link>
        )}
        <button
          onClick={() => removeToast(toast.id)}
          className="p-1 rounded-full text-dark-800/40 dark:text-white/30 hover:bg-cream-100 dark:hover:bg-white/10 hover:text-dark-800 dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
    </motion.div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none w-full max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

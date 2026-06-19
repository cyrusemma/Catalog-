import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretUp } from '@phosphor-icons/react'

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 p-3 rounded-full bg-dark-800 dark:bg-white text-white dark:text-dark-800 shadow-xl shadow-brand-400/20 hover:scale-110 active:scale-95 transition-all duration-200"
          aria-label="Back to top"
        >
          <CaretUp size={20} weight="bold" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

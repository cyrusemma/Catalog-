import { useEffect, useState } from 'react'
import { ArrowUp } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 400px
      if (window.scrollY > 400) {
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
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-[60] w-12 h-12 bg-brand-400 hover:bg-brand-500 text-white rounded-full shadow-amber-glow flex items-center justify-center transition-colors focus:outline-none"
          aria-label="Scroll to top"
        >
          <ArrowUp size={24} weight="bold" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

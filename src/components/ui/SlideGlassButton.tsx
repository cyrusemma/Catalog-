import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'

interface SlideGlassButtonProps {
  to: string
  children: React.ReactNode
}

export default function SlideGlassButton({ to, children }: SlideGlassButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 12, mass: 0.8 }}
      className="inline-block"
    >
      <Link
        to={to}
        className="
          group relative z-10 flex items-center justify-center gap-3 px-8 py-4 mx-auto 
          overflow-hidden rounded-full border border-white/25
          bg-white/10 backdrop-blur-xl shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8px_32px_rgba(0,0,0,0.2)]
          text-white text-sm sm:text-base font-semibold transition-colors duration-300
          before:absolute before:w-full before:-left-full before:hover:left-0 
          before:rounded-full before:bg-brand-500/90 before:transition-all 
          before:duration-700 before:-z-10 before:aspect-square 
          before:hover:scale-150 before:hover:duration-700
          hover:border-brand-400/50 hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.5),0_8px_32px_rgba(212,130,10,0.4)]
        "
      >
        <span className="relative z-10">{children}</span>
        
        <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border border-white/50 group-hover:border-transparent group-hover:bg-white transition-all duration-300">
          <ArrowRight 
            size={16} 
            weight="bold" 
            className="text-white group-hover:text-brand-500 transition-all duration-300 group-hover:rotate-45" 
          />
        </div>
      </Link>
    </motion.div>
  )
}

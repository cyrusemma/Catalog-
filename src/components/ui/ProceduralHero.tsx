import { motion, useReducedMotion } from 'framer-motion'

/**
 * Theme-aware procedural hero background. Renders entirely from CSS gradients
 * + SVG shapes that read the `--hero-*` CSS variables defined in index.css,
 * so switching theme (light / dark / amoled / rose-light / rose-dark) re-tints
 * the whole hero automatically — no per-theme image assets needed.
 *
 * Use this when the admin hasn't uploaded any custom hero images. If they
 * have, the Home page renders those <img>s instead.
 */
export default function ProceduralHero() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Base gradient — diagonal so light + dark themes both feel intentional. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, var(--hero-bg-from) 0%, var(--hero-bg-via) 55%, var(--hero-bg-to) 100%)',
        }}
      />

      {/* Two large soft glow orbs, one warm in the top-right and one cooler
          in the bottom-left. They drift slowly for a "live" feel. */}
      <motion.div
        className="absolute -top-32 -right-24 w-[640px] h-[640px] rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--hero-glow-a)' }}
        animate={reduceMotion ? {} : { x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.06, 1] }}
        transition={reduceMotion ? {} : { duration: 22, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--hero-glow-b)' }}
        animate={reduceMotion ? {} : { x: [0, -22, 0], y: [0, 18, 0], scale: [1, 1.05, 1] }}
        transition={reduceMotion ? {} : { duration: 26, ease: 'easeInOut', repeat: Infinity, delay: 4 }}
      />

      {/* Decorative SVG shapes — concentric arc + scattered dots + a soft
          ribbon. All use --hero-shape so colours shift with the theme. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="hero-fade" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--hero-shape)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--hero-shape)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-ribbon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--hero-shape)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--hero-shape)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft radial wash anchored slightly above-centre. */}
        <rect width="1440" height="900" fill="url(#hero-fade)" />

        {/* Three loose arc rings, top-right, suggesting motion. */}
        <motion.g
          fill="none"
          stroke="var(--hero-shape)"
          strokeLinecap="round"
          animate={reduceMotion ? {} : { rotate: [0, 6, 0] }}
          transition={reduceMotion ? {} : { duration: 30, ease: 'easeInOut', repeat: Infinity }}
          style={{ transformOrigin: '1200px 200px' }}
        >
          <circle cx="1200" cy="200" r="180" strokeWidth="1.4" opacity="0.55" />
          <circle cx="1200" cy="200" r="240" strokeWidth="1" opacity="0.35" />
          <circle cx="1200" cy="200" r="320" strokeWidth="0.8" opacity="0.18" />
        </motion.g>

        {/* Long thin ribbon sweeping across the lower third. */}
        <path
          d="M -100 720 C 380 600 880 820 1540 660"
          fill="none"
          stroke="url(#hero-ribbon)"
          strokeWidth="80"
          strokeLinecap="round"
        />

        {/* Scattered dots for texture. */}
        <g fill="var(--hero-shape)">
          <circle cx="120" cy="180" r="2.5" opacity="0.6" />
          <circle cx="240" cy="320" r="1.8" opacity="0.4" />
          <circle cx="60" cy="420" r="1.4" opacity="0.5" />
          <circle cx="320" cy="120" r="2" opacity="0.5" />
          <circle cx="900" cy="540" r="2.2" opacity="0.55" />
          <circle cx="1080" cy="640" r="1.6" opacity="0.4" />
          <circle cx="780" cy="380" r="1.5" opacity="0.35" />
          <circle cx="1300" cy="780" r="2.4" opacity="0.5" />
        </g>
      </svg>

      {/* Light vignette so text against the hero stays legible on every
          theme — darker washes anchor the bottom for the headline copy. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}

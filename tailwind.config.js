/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf6e3',
          100: '#faecc6',
          200: '#f4d48e',
          300: '#edb94a',
          400: '#d4820a',
          500: '#e8a020',
          600: '#b86d08',
          700: '#7a4706',
          800: '#5c3504',
          900: '#3d2303',
        },
        dark: {
          900: '#0f0a05',
          800: '#1a1008',
          700: '#261810',
          600: '#332010',
          500: '#4a2e14',
        },
        cream: {
          50:  '#fdf8f2',
          100: '#f9efe1',
          200: '#f5e6d0',
          300: '#e8d3ad',
          400: '#a89070',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          hover: '#1da851',
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'amber-glow': 'radial-gradient(ellipse at 60% 30%, rgba(212,130,10,0.20) 0%, transparent 65%)',
        'amber-glow-corner': 'radial-gradient(circle at 15% 85%, rgba(232,160,32,0.12) 0%, transparent 50%)',
      },
      boxShadow: {
        'amber-glow': '0 0 20px rgba(212,130,10,0.08)',
        'amber-glow-lg': '0 0 40px rgba(212,130,10,0.15)',
        'cream-glow': '0 8px 30px rgba(212,130,10,0.10)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.75)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'loader-mark-in': {
          '0%': { transform: 'translateY(-0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shop-sway': {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        'loader-line': {
          '0%': { transform: 'translateY(0.625rem)', opacity: '0', filter: 'blur(4px)' },
          '16%, 82%': { transform: 'translateY(0)', opacity: '1', filter: 'blur(0)' },
          '100%': { transform: 'translateY(-0.625rem)', opacity: '0', filter: 'blur(4px)' },
        },
        'loader-dot': {
          '0%, 100%': { transform: 'scale(0.85)', opacity: '0.25' },
          '50%': { transform: 'scale(1)', opacity: '1' },
        },
        'star-pop': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        marquee: 'marquee 25s linear infinite',
        'scale-in': 'scale-in 160ms ease-out',
        'loader-mark-in': 'loader-mark-in 500ms ease-out both',
        'shop-sway': 'shop-sway 3.2s ease-in-out infinite',
        'loader-line': 'loader-line 2.6s ease-out both',
        'loader-dot': 'loader-dot 1.3s ease-in-out infinite',
        'star-pop': 'star-pop 0.7s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── ChikiGlam Brand ──────────────────────────────────────────────────
        'brand-pink':   '#f4068b',
        'brand-yellow': '#fed801',
        'brand-purple': '#6f28d0',
        'brand-cyan':   '#1adede',
        // Legacy (kept for existing components)
        primary: {
          50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
          400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf',
          800: '#86198f', 900: '#701a75', 950: '#4a044e',
        },
        secondary: {
          50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
          400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
          800: '#9f1239', 900: '#881337', 950: '#4c0519',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
      backgroundImage: {
        'brand-gradient':          'linear-gradient(to right, #6f28d0, #f4068b)',
        'brand-gradient-diagonal': 'linear-gradient(135deg, #6f28d0, #f4068b)',
        'brand-gradient-vertical': 'linear-gradient(to bottom, #6f28d0, #f4068b)',
      },
      boxShadow: {
        'brand':    '0 0 20px rgba(244,6,139,0.30)',
        'brand-lg': '0 0 40px rgba(244,6,139,0.40)',
        'cyan':     '0 0 20px rgba(26,222,222,0.30)',
        'purple':   '0 0 20px rgba(111,40,208,0.30)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-in-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer':    'shimmer 1.8s infinite',
        'bounce-in':  'bounceIn 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(244,6,139,0.2)' },
          '50%':      { boxShadow: '0 0 30px rgba(244,6,139,0.55)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.85)', opacity: '0' },
          '60%':  { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

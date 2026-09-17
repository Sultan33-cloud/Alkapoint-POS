/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f5f7', 100: '#c2e6ea', 200: '#8fd0d8', 300: '#5cb9c5',
          400: '#2fa3b2', 500: '#0f6e7c', 600: '#0d5a66', 700: '#0a4f5a',
          800: '#083f49', 900: '#062f37',
        },
        gold: {
          300: '#e8c88a', 400: '#dcb063', 500: '#d4a24c', 600: '#b9873a', 700: '#8f6a2c',
        },
        ink: {
          900: '#0d1117', 800: '#161b22', 700: '#1c2128',
          600: '#21262d', 500: '#30363d', 400: '#484f58',
        },
        paper: {
          100: '#e6edf3', 200: '#c9d1d9', 300: '#8b949e', 400: '#6e7681',
        },
        success: '#2ea043',
        danger: '#da3633',
        warning: '#d29922',
        info: '#388bfd',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-brand': '0 0 0 1px rgba(15,110,124,0.35), 0 8px 24px rgba(15,110,124,0.20)',
        'glow-gold': '0 0 0 1px rgba(212,162,76,0.35), 0 8px 24px rgba(212,162,76,0.22)',
        'card': '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.25)',
      },
      animation: {
        'float-y': 'floatY 4s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'drift-up': 'driftUp 12s linear infinite',
        'drift-down': 'driftDown 14s linear infinite',
        'fade-in': 'fadeIn 0.35s ease-out',
      },
      keyframes: {
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSoft: { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        driftUp: {
          '0%': { transform: 'translateY(0) translateX(0) scale(0.9)', opacity: '0' },
          '10%': { opacity: '0.55' },
          '90%': { opacity: '0.15' },
          '100%': { transform: 'translateY(-100vh) translateX(40px) scale(1.4)', opacity: '0' },
        },
        driftDown: {
          '0%': { transform: 'translateY(0) translateX(0) scale(1.2)', opacity: '0' },
          '10%': { opacity: '0.35' },
          '90%': { opacity: '0.10' },
          '100%': { transform: 'translateY(100vh) translateX(-40px) scale(0.8)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
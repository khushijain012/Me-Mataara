/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Me Mataara brand palette ──────────────────────────────
        // Primary: GREEN STONE #4F878F. Scale built around the brand hue.
        pounamu: {
          50: '#f0f6f6',
          100: '#dbe9ea',
          200: '#bcd5d8',
          300: '#93b9bd',
          400: '#6b9ba1',
          500: '#4f878f', // brand — Green Stone
          600: '#457077',
          700: '#3a5c62',
          800: '#334d52',
          900: '#2d4247',
          950: '#192a2d',
        },
        // Accent: CHARCOAL #404040.
        kokowai: {
          50: '#f4f4f4',
          100: '#e7e7e6',
          200: '#cfcecd',
          300: '#adacaa',
          400: '#807f7d',
          500: '#5c5b59',
          600: '#4a4a48',
          700: '#404040', // brand — Charcoal
          800: '#363635',
          900: '#2b2b2a',
          950: '#1c1c1b',
        },
        // Neutrals/surfaces: SLATE #DAE2E2 (light) → GRAVEL #BAB9B4 (mid).
        sand: {
          50: '#f7f8f8',
          100: '#eef1f1',
          200: '#dae2e2', // brand — Slate
          300: '#cbd2d1',
          400: '#bab9b4', // brand — Gravel
          500: '#a3a29c',
          600: '#8a8983',
          700: '#6f6e69',
          800: '#565550',
          900: '#403f3c',
          950: '#262523',
        },
        // Secondary highlight: MUSTARD #CAA545.
        mustard: {
          50: '#faf6ea',
          100: '#f3e9c8',
          200: '#e8d494',
          300: '#dcbe66',
          400: '#d3b053',
          500: '#caa545', // brand — Mustard
          600: '#ac8935',
          700: '#89692b',
          800: '#6f5527',
          900: '#5e4924',
        },
        // Legacy highlight key kept as a soft neutral (avoid stray gold).
        kowhai: {
          400: '#c3c2bd',
          500: '#b5b4af',
          600: '#9a9992',
        },
        ink: {
          DEFAULT: '#404040', // Charcoal
          soft: '#5c5b59',
          faint: '#8a8984',
        },
      },
      fontFamily: {
        // Brand typeface: QUICKSAND for both display + body.
        sans: ['"Quicksand"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Quicksand"', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(64,64,64,0.04), 0 8px 24px -12px rgba(64,64,64,0.18)',
        float: '0 12px 40px -12px rgba(45,66,71,0.35)',
      },
      backgroundImage: {
        'weave': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='%234f878f' stroke-opacity='0.06' stroke-width='1'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
}

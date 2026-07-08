/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        teal: {
          DEFAULT: '#0F7173',
          light: '#1A9A9C',
          tint: '#E6F4F4',
        },
        coral: '#F26419',
        gold: '#F5A623',
        correct: '#2ECC71',
        wrong: '#E53935',
        canvas: '#FAFAF8',
        surface: '#FFFFFF',
        ink: '#1A1A2E',
        muted: '#5A5A7A',
      },
      boxShadow: {
        // "chunky button" bottom edge — pairs with translate-y-press on :active
        press: '0 4px 0 0 rgba(0,0,0,0.15)',
        'press-teal': '0 4px 0 0 #0A5153',
        'press-coral': '0 4px 0 0 #C24E12',
        card: '0 2px 8px rgba(26,26,46,0.06)',
      },
      keyframes: {
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'card-in': 'card-in 0.35s ease-out',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#08090b',
          900: '#0d0f12',
          850: '#111418',
          800: '#16191f',
          750: '#1b1f26',
          700: '#222730',
          650: '#2b313d',
          600: '#363d4c',
        },
        accent: {
          orange: '#f59e0b',
          amber: '#d97706',
          darkOrange: '#ea580c',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
    },
  },
  plugins: [],
}

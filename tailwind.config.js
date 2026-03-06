/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d0ff',
          300: '#9ab1ff',
          400: '#6d87ff',
          500: '#4a5ff7',
          600: '#3340ec',
          700: '#2a31d0',
          800: '#2630a8',
          900: '#252f84',
        },
      },
    },
  },
  plugins: [],
}

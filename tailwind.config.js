/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        monte: {
          primary: '#1A6BFF',
          bright: '#2B7FFF',
          deep: '#0B2E8F',
          navy: '#0A1E5C',
          ice: '#F0F6FF',
          accent: '#D6E6FF',
          darkBg: '#0A1430',
          darkBg2: '#0B1A3A',
          darkCard: '#13224A',
          darkCard2: '#1A2D5E',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        graffiti: ['"Bungee"', '"Rubik Bubbles"', 'Impact', 'sans-serif'],
      },
      boxShadow: {
        monte: '0 10px 30px -10px rgba(26, 107, 255, 0.25)',
        'monte-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

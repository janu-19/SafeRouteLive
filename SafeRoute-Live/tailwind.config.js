/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#7c3aed'
        }
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
};



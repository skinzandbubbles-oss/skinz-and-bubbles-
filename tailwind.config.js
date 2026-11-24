/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Skinz & Bubbles brand palette
        brand: {
          pink: {
            50: '#fff1f6',
            100: '#ffe4ee',
            200: '#fec9dd',
            300: '#fd9eba',
            400: '#fb6a97',
            500: '#f43f7a',
            600: '#e11d63',
            700: '#be124f',
            800: '#9d1244',
            900: '#83143e',
          },
          aqua: {
            50: '#effefb',
            100: '#c8fef5',
            200: '#91fce9',
            300: '#52f5d9',
            400: '#1de5cd',
            500: '#06c9b6',
            600: '#01a89a',
            700: '#06877d',
            800: '#0d6b66',
            900: '#115854',
          },
          yellow: {
            50: '#fffdf0',
            100: '#fff9c7',
            200: '#fff196',
            300: '#ffe65d',
            400: '#ffd62f',
            500: '#f5b800',
            600: '#d99100',
            700: '#b56d06',
            800: '#92550d',
            900: '#78460f',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

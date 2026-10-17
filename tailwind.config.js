
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./*.{html,ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '380px',
      },
      fontFamily: {
        sans: ['"Titillium Web"', 'sans-serif'],
        comic: ['"Comic Neue"', 'cursive'],
        heading: ['"Bangers"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        'comic-yellow': '#FFD93D',
        'comic-green': '#6BCB77',
        'comic-red': '#FF6B6B',
        'comic-cyan': '#4D96FF',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#181A1B', // A dark, luxurious background
        'primary': '#FFFFFF',     // White text for high contrast
        'secondary': '#A3A3A3',   // A muted gray for secondary text
        'accent': '#EAB308',      // A warm, golden accent for buttons and highlights
        'nav': '#212426',         // A slightly lighter dark for the nav bar
      }
    },
  },
  plugins: [],
}

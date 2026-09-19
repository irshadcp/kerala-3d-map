/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          mint: '#e4f3de',
          green: '#d6eccf',
          blue: '#8bc6f8',
          cream: '#f6ede4',
          sand: '#ebd9c7',
        }
      }
    },
  },
  plugins: [],
}

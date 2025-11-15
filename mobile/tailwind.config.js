/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          foreground: '#ffffff',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        destructive: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter'],
        display: ['Poppins'],
      },
    },
  },
  plugins: [],
}

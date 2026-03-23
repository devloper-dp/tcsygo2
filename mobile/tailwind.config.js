/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Include all default Tailwind colors
        ...colors,
        // Custom colors
        primary: {
          DEFAULT: '#2563EB', // Blue-600
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563EB',
          700: '#1d4ed8', // Primary Dark
          800: '#1e40af',
          900: '#1e3a8a',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFFFFF', // White
          foreground: '#2563EB',
          border: '#2563EB',
        },
        background: '#F8FAFC', // Very light gray
        surface: '#FFFFFF',

        text: {
          primary: '#0F172A',   // Slate-900 (H1, H2, H3)
          secondary: '#475569', // Slate-600 (Body, Small)
          muted: '#94A3B8',     // Slate-400
          tertiary: '#9CA3AF',
        },

        border: '#E5E7EB', // Gray-200
        input: '#FFFFFF',

        // Semantic Colors
        success: '#16A34A', // Green-600
        warning: '#F59E0B', // Amber-500
        danger: '#DC2626',  // Red-600
        error: '#DC2626',
      },
      borderRadius: {
        'sm': '8px',
        'md': '10px',       // Danger Button / Input
        'lg': '12px',       // Standard Button / Card Base
        'xl': '16px',       // Card Container
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
        'button': '12px',   // Primary/Secondary Button
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.05)', // Standard Card
        'button': '0 2px 4px rgba(0, 0, 0, 0.1)', // Primary Button
        'none': 'none',
      },
      fontFamily: {
        sans: ['Inter', 'System', 'sans-serif'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px', fontWeight: '500' }],  // Label
        'sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],  // Small
        'base': ['16px', { lineHeight: '24px', fontWeight: '400' }], // Body
        'lg': ['18px', { lineHeight: '26px', fontWeight: '600' }],   // H3
        'xl': ['20px', { lineHeight: '28px', fontWeight: '600' }],   // H2
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '700' }],  // H1
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'base': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
      }
    },
  },
  plugins: [],
}


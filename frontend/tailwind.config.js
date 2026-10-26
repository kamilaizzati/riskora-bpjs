/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        riskora: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22A06B',
          700: '#166534',
          800: '#14532D',
          950: '#172B24',
        },
        canvas: '#F7FAF8',
        line: '#E5EBE7',
        muted: '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(20,83,45,0.03), 0 1px 3px rgba(20,83,45,0.02)',
      },
    },
  },
  plugins: [],
};

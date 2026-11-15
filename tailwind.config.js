/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Biryani', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        estado: {
          normal: '#34D399',
          atencion: '#FBBF24',
          critico: '#F87171',
          sinDato: '#64748B',
        },
        acento: 'rgb(var(--acento) / <alpha-value>)',
        fondo: {
          profundo: '#050816',
          medio: '#0B1026',
        },
        superficie: 'rgb(var(--superficie) / <alpha-value>)',
        linea: 'rgb(var(--linea) / <alpha-value>)',
        tinta: {
          DEFAULT: 'rgb(var(--tinta) / <alpha-value>)',
          suave: 'rgb(var(--tinta-suave) / <alpha-value>)',
          tenue: 'rgb(var(--tinta-tenue) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

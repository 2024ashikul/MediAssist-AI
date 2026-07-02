/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12211f',
        paper: '#f6faf8',
        brand: {
          50: '#f3faf7',
          100: '#eaf6f1',
          200: '#bfe4dc',
          300: '#8fd0c2',
          400: '#4db3a4',
          500: '#2f9c8f',
          600: '#228d84',
          700: '#1a7a74',
          800: '#135c58',
          900: '#0e4744',
          950: '#08302e',
        },
        coral: {
          50: '#fbe6e1',
          400: '#f3a08f',
          500: '#e0604a',
          600: '#c94e39',
        },
        warn: {
          50: '#faf1dd',
          500: '#c98a26',
        },
        accent: {
          50: '#ece9fb',
          500: '#7a68c9',
        },
        success: {
          50: '#e4f4ea',
          500: '#2f8f5b',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Noto Sans Bengali', 'serif'],
        sans: ['Inter', 'Noto Sans Bengali', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(14, 71, 68, 0.06)',
        card: '0 8px 24px rgba(14, 71, 68, 0.10)',
        pop: '0 20px 48px rgba(8, 48, 46, 0.16)',
      },
      borderRadius: {
        xl2: '26px',
      },
    },
  },
  plugins: [],
}

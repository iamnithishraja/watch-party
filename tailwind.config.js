/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#080a12',
        panel: '#121624',
        line: '#262b3d',
        accent: '#75f4d3',
        coral: '#ff7a7a',
        iris: '#8ea4ff',
      },
      boxShadow: {
        glow: '0 0 80px rgba(117, 244, 211, 0.16)',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        pulseLine: 'pulseLine 3s ease-in-out infinite',
        sweep: 'sweep 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseLine: {
          '0%, 100%': { opacity: '0.35', transform: 'scaleX(0.72)' },
          '50%': { opacity: '1', transform: 'scaleX(1)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-30%)' },
          '100%': { transform: 'translateX(130%)' },
        },
      },
    },
  },
  plugins: [],
};

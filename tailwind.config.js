/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        gaming: {
          bg: '#070b2a',
          blue: '#2b4bff',
          violet: '#7c3aed',
          neon: '#00e5ff',
          deep: '#030617',
          surface: '#0d1338',
        },
        blend: {
          purple: '#9b4dca',
          magenta: '#d65db1',
          pink: '#f28aa5',
        },
        cultural: {
          coral: '#f4806b',
          peach: '#ffc9a3',
          rose: '#e8607a',
          gold: '#ffd28a',
          bg: '#fff7f2',
          surface: '#ffece0',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        pacifico: ['Pacifico', 'cursive'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'float': 'floatSlow 4s infinite ease-in-out',
        'float-reverse': 'floatSlowReverse 4s infinite ease-in-out',
        'shimmer': 'shimmer 3s infinite linear',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.04)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        floatSlowReverse: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'neon-blue': '0 0 25px rgba(0, 229, 255, 0.45)',
        'neon-violet': '0 0 30px rgba(124, 58, 237, 0.45)',
        'cultural-glow': '0 0 30px rgba(244, 128, 107, 0.45)',
        'glass-edge': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      },
    },
  },
  plugins: [],
}

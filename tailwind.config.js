/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'manrope': ['Manrope', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e6e6ff',
          200: '#d1d1ff',
          300: '#b3b3ff',
          400: '#8a8aff',
          500: '#6056ff',
          600: '#7e75ff',
          700: '#9b8aff',
          800: '#b8a0ff',
          900: '#d5b6ff',
        },
        secondary: {
          50: '#fff0f0',
          100: '#ffe6e6',
          200: '#ffd1d1',
          300: '#ffb3b3',
          400: '#ff8e8e',
          500: '#ff6b6b',
          600: '#ff5252',
          700: '#ff3939',
          800: '#ff2020',
          900: '#ff0707',
        },
        accent: {
          50: '#f0fffd',
          100: '#e6fffc',
          200: '#d1fff9',
          300: '#b3fff6',
          400: '#8efff3',
          500: '#4ecdc4',
          600: '#6ee7df',
          700: '#8ef0e8',
          800: '#aef9f1',
          900: '#cefffa',
        },
        dark: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
          950: '#08090a',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6056ff 0%, #7e75ff 50%, #9b8aff 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 50%, #ffb3b3 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4ecdc4 0%, #6ee7df 50%, #8ef0e8 100%)',
        'gradient-dark': 'linear-gradient(135deg, #08090a 0%, #1a1b1e 50%, #2d2f34 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(96, 86, 255, 0.3)',
        'glow-hover': '0 0 30px rgba(96, 86, 255, 0.5)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        'custom': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
        '4xl': '1920px',
      },
    },
  },
  plugins: [],
}
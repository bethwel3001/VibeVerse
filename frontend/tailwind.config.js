module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spotify-green': '#1DB954',
        'spotify-dark': '#191414',
        'spotify-light': '#B3B3B3',
        'spotify-black': '#000000',
      },
      animation: {
        'fadeIn': 'fadeIn 0.8s ease-out',
        'slideIn': 'slideIn 0.6s ease-out',
        'navDrop': 'navDrop 0.5s ease-out forwards',
        'navSlide': 'navSlide 0.5s ease-out forwards',
        'toastIn': 'toastIn 0.4s ease-out forwards',
        'toastOut': 'toastOut 0.4s ease-in forwards',
        'toastBounce': 'toastBounce 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        navDrop: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          }
        },
        navSlide: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-100%)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          }
        },
        toastIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(100%) scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          }
        },
        toastOut: {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.95)',
          }
        },
        toastBounce: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          }
        }
      }
    },
  },
  plugins: [],
}

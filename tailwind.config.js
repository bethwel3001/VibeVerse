module.exports = {
  content: ["./src/**/*.{js,jsx}"],
 theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          'green-dark': '#1ED760',
          black: '#191414',
          'dark-gray': '#121212',
          'medium-gray': '#282828',
          'light-gray': '#B3B3B3',
          white: '#FFFFFF',
        },
        neon: {
          pink: '#FF10F0',
          blue: '#10D7FF',
          purple: '#8B5CF6',
          yellow: '#F59E0B',
        }
      },
      fontFamily: {
        'spotify': ['Circular', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient': 'gradient 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(29, 185, 84, 0.5)',
        'neon-pink': '0 0 20px rgba(255, 16, 240, 0.5)',
        'neon-blue': '0 0 20px rgba(16, 215, 255, 0.5)',
      }
    },
  },
  plugins: [],
}
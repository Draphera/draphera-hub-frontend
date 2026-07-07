/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        drapera: {
          dark: '#120A20',
          midnight: '#1A0F2E',
          violet: '#2D1B69',
          gold: '#F2C94C',
          'gold-dark': '#D4A92A',
          steel: '#4A4A6A',
          'steel-light': '#6B6B8D',
          surface: '#1E1233',
          border: '#2A1F45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle at 1px 1px, rgba(242, 201, 76, 0.03) 1px, transparent 0)",
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse at center, rgba(45, 27, 105, 0.4) 0%, transparent 70%)',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(242, 201, 76, 0.15), 0 0 40px rgba(242, 201, 76, 0.05)',
        'premium': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

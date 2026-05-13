/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          start: '#7F5AF0',
          end: '#A78BFA',
          DEFAULT: '#7F5AF0',
        },
        accent: '#4ADE80',
        dark: '#1F2937',
        'bg-light': '#F8FAFC',
        navy: {
          DEFAULT: '#0A1628',
          dark: '#0f172a',
          deeper: '#020617',
        },
        neon: {
          blue: '#6366f1',
          purple: '#a855f7',
          teal: '#06b6d4',
          green: '#22c55e',
        },
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 10px 30px -3px rgba(0, 0, 0, 0.08)',
        'glow-blue': '0 0 30px rgba(59,130,246,0.5)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
        'glow-teal': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
        'premium-mesh': 'radial-gradient(at 0% 0%, #0f172a 0, transparent 50%), radial-gradient(at 50% 0%, #020617 0, transparent 50%), radial-gradient(at 100% 0%, #0f172a 0, transparent 50%)',
      }
    },
  },
  plugins: [],
}

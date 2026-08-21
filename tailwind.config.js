/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        background: '#0f1115',
        surface: '#1a1d23',
        'surface-2': '#22262e',
        border: 'rgba(255,255,255,0.08)',
        accent: '#e50914',
        'accent-hover': '#f40612',
        muted: '#9ca3af',
      },
    },
  },
  plugins: [],
}



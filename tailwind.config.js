/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        onyx: '#050505',
        editorial: '#E5E5E5',
        editorialMuted: '#9A9A9A',
        accent: '#C9A227',
      },
      fontFamily: {
        serif: ['"Newsreader"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-fade': 'linear-gradient(180deg, rgba(5,5,5,0.2) 0%, rgba(5,5,5,0.85) 55%, #050505 100%)',
      },
    },
  },
  plugins: [],
};

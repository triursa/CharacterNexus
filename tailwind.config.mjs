/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // we will enforce dark by adding class on <html>
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d12',
        accent: '#6366f1',
      }
    }
  },
  plugins: []
};

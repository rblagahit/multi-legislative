/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    // Dynamic bg-${color}-100 / text-${color}-600 used in analytics stat cards
    // and tier badge icons (colors: blue, emerald, purple, amber, slate)
    { pattern: /^bg-(blue|emerald|purple|amber|slate)-100$/ },
    { pattern: /^text-(blue|emerald|purple|amber|slate)-600$/ },
    // ring-${tierColor}-400 used in pricing tier card highlight
    { pattern: /^ring-(slate|blue|purple)-400$/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

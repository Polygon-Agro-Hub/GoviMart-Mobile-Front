/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./component/**/*.{js,jsx,ts,tsx}", "./services/**/*.{js,jsx,ts,tsx}", "./store/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  safelist: process.env.NODE_ENV === 'development' ? [
    { pattern: /^(p|m|w|h|bg|text|rounded|flex|items|justify|border|opacity)-/ }
  ] : [],
  plugins: [],
};

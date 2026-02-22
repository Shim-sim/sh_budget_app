/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg:           '#F7F3EE',
        card:         '#FFFFFF',
        primary:      '#2D5A4F',
        'primary-light': '#3D7A6A',
        'primary-muted': '#EAF2F0',
        'text-primary':   '#1A1A1A',
        'text-secondary': '#888580',
        'text-muted':     '#B5B0AA',
        income:   '#10B981',
        expense:  '#EF4444',
        transfer: '#F59E0B',
        border:   '#EDEAE5',
      },
    },
  },
  plugins: [],
};

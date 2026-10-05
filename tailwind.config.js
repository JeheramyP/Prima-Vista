/** Controller palette. Stage backgrounds are not defined here. @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sanctuary: {
          950: "#0c0b0a",
          900: "#141311",
          850: "#1b1916",
          800: "#23211d",
          700: "#2f2c27",
          600: "#3d3932",
          500: "#5c564c",
        },
        gold: {
          50: "#fbf6ee",
          200: "#ead7b0",
          400: "#d4a04a",
          500: "#c4892e",
          600: "#a36c1f",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Outfit"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        stage: "0 24px 80px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

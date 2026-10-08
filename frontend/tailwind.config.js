/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wema: {
          50: "#f5f0fa",
          100: "#ede4f6",
          200: "#d9c8ec",
          300: "#bda0dd",
          400: "#9a72c8",
          500: "#7a4fb0",
          600: "#5c2d91",
          700: "#4a2375",
          800: "#3e1c63",
          900: "#2f1549",
        },
      },
    },
  },
  plugins: [],
};

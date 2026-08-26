/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./vendor/hub-ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/hub-ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: "#0b1020",
          panel: "#121830",
          muted: "#8a93b2",
          accent: "#6366f1",
        },
      },
    },
  },
  plugins: [],
};

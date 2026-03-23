/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        ink: "#1f1a16",
        sand: "#f4efe6",
        clay: "#c57a3f",
        pine: "#0f6b5b",
        marigold: "#f0b429",
        slate: "#44515f",
        fog: "#e8e1d5",
        dusk: "#2a2826",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        lift: "0 20px 50px rgba(31, 26, 22, 0.15)",
        inset: "inset 0 0 0 1px rgba(31, 26, 22, 0.08)",
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(31, 26, 22, 0.08) 1px, transparent 0)",
        "hero": "linear-gradient(120deg, rgba(197, 122, 63, 0.18), rgba(15, 107, 91, 0.12))",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

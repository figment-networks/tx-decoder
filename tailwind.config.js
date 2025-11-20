/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f1f8f4",
          100: "#e2f1e8",
          200: "#bfe0ca",
          300: "#9acdaa",
          400: "#52a871",
          500: "#1f7d45",
          600: "#166c38",
          700: "#165430",
          800: "#133e27",
          900: "#0d261a",
        },
        neutral: {
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#cccccc",
          400: "#999999",
          500: "#7a7a7a",
          600: "#5e5e5e",
          700: "#3e3e3e",
          800: "#2a2a2a",
          900: "#171717",
        },
        green: {
          DEFAULT: "#004039",
          1100: "#092b28",
          1000: "#004039",
          800: "#0b703f",
          700: "#359b11",
          600: "#00c708",
          500: "#89e231",
          400: "#14f195",
          300: "#dae7d4",
          100: "#f1f4f3",
        },
        basic: {
          1000: "#111111",
          900: "#3a3d3c",
          800: "#6f7471",
          700: "#8c918e",
          600: "#b3b3b3",
          300: "#d4d6d4",
          200: "#efefef",
          100: "#f9f9f9",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      boxShadow: {
        surface: "0 4px 32px 0 rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0e14",
          900: "#12151d",
          800: "#1a1f2b",
          700: "#252b3a",
          600: "#38415a",
          500: "#535c78",
          400: "#7a8299",
          300: "#a6acbd",
          200: "#d3d6e0",
          100: "#eceef3",
          50: "#f6f7fa",
        },
        brand: {
          950: "#0e1a3d",
          900: "#122456",
          800: "#173072",
          700: "#1c3d94",
          600: "#2650bd",
          500: "#3866e3",
          400: "#6690f0",
          300: "#9bb6f5",
          200: "#c6d6fa",
          100: "#e4ecfd",
          50: "#f2f6fe",
        },
        accent: {
          600: "#0f8f7a",
          500: "#14b090",
          400: "#3fd3ae",
          300: "#8fe8cf",
          100: "#e2faf3",
        },
        warn: {
          600: "#b45309",
          500: "#d97706",
          100: "#fef3c7",
        },
        danger: {
          600: "#c0273c",
          500: "#e0364c",
          100: "#fde2e6",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.08)",
        elevated:
          "0 4px 8px -2px rgb(15 23 42 / 0.08), 0 12px 24px -8px rgb(15 23 42 / 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

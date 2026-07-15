import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C1B29",
        paper: "#FAFAF9",
        accent: "#4F46E5",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
export default config;

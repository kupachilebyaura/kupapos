import type { Config } from "tailwindcss"

const config = {
  content: [
    "./app/**/*.{ts,tsx,jsx,js}",
    "./components/**/*.{ts,tsx,jsx,js}",
    "./lib/**/*.{ts,tsx,jsx,js}",
  ],
  theme: {
    screens: {
      sm: "577px",
      md: "769px",
      lg: "993px",
      xl: "1201px",
      "2xl": "1600px",
    },
    extend: {},
  },
  plugins: [],
} satisfies Config

export default config

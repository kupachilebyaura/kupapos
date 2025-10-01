import type { Config } from "tailwindcss"

const config = {
  content: [
    "./app/**/*.{ts,tsx,jsx,js}",
    "./components/**/*.{ts,tsx,jsx,js}",
    "./lib/**/*.{ts,tsx,jsx,js}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    screens: {
      // Mobile-first breakpoints
      xs: "360px",   // Small mobiles
      sm: "480px",   // Common mobiles
      md: "768px",   // Tablets vertical
      lg: "1024px",  // Tablets horizontal / laptops
      xl: "1280px",  // Desktop standard
      "2xl": "1440px", // Desktop wide
      uhd: "1920px", // 1080p / 2K
      "4k": "2560px", // 1440p / 2160p
    },
    extend: {
      maxWidth: {
        'content': '90rem', // 1440px - main content width
        'prose': '65ch',    // Readable text width
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-right': 'env(safe-area-inset-right)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
      },
      fontSize: {
        'fluid-sm': 'var(--step--1)',
        'fluid-base': 'var(--step-0)',
        'fluid-lg': 'var(--step-1)',
        'fluid-xl': 'var(--step-2)',
        'fluid-2xl': 'var(--step-3)',
        'fluid-3xl': 'var(--step-4)',
        'fluid-4xl': 'var(--step-5)',
      },
      minWidth: {
        'touch': '44px', // Minimum touch target
      },
      minHeight: {
        'touch': '44px', // Minimum touch target
      },
    },
  },
  plugins: [],
} satisfies Config

export default config

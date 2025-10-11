import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // App Router
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Componenti condivisi
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // (se usi ancora /pages)
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-slide-in": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 250ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
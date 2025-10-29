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
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "page-fade": {
          "0%": {
            opacity: "0",
            transform: "translateY(18px) scale(0.985)",
            filter: "blur(2px)",
          },
          "60%": {
            opacity: "1",
            transform: "translateY(0) scale(1.005)",
            filter: "blur(0)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
            filter: "blur(0)",
          },
        },
        "soft-pop": {
          "0%": { transform: "scale(0.98)" },
          "60%": { transform: "scale(1.015)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 240ms ease-out",
        "page-fade": "page-fade 420ms cubic-bezier(0.16,1,0.3,1)",
        "soft-pop": "soft-pop 320ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;

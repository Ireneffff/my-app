import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // App Router
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Componenti condivisi
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // (se usi ancora /pages)
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
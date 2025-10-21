import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tenere vuoto: SW e manifest sono serviti da /public
  // Perché: nessun plugin necessario per questa PWA minimale
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "lucide-react": path.join(__dirname, "lib", "lucide-react.tsx"),
    };

    return config;
  },
};

export default nextConfig;

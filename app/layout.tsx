import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9", // ✅ QUI, non in metadata
};

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Calm mind, strong trade",
  manifest: "/manifest.json",
  icons: [{ rel: "apple-touch-icon", url: "/icon-192x192.png" }],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <div className="pointer-events-none fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        <main id="main">{children}</main>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error);
                });
              }`,
          }}
        />
      </body>
    </html>
  );
}
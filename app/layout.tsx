import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SwUpdateBanner from "@/components/SwUpdateBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" }, // bg chiaro
    { media: "(prefers-color-scheme: dark)",  color: "#111827" }, // bg scuro
  ],
};

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Calm mind, strong trade",
  manifest: "/manifest.json",
  icons: [{ rel: "apple-touch-icon", url: "/icon-192x192.png" }],
  // (facoltativo) PWA installata: status bar scura/trasparente
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-fg antialiased selection:bg-accent/15 selection:text-fg transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>

        {/* Banner "Update available" */}
        <SwUpdateBanner />

        {/* Registra il Service Worker */}
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
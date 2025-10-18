import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SwUpdateBanner from "@/components/SwUpdateBanner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AuthButton from "@/components/auth/AuthButton";

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
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <AuthProvider>
          <div className="relative min-h-dvh">
            <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
              <AuthButton />
            </div>

            <main id="main">{children}</main>

            {/* Banner "Update available" */}
            <SwUpdateBanner />
          </div>
        </AuthProvider>

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
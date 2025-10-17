import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SwUpdateBanner from "@/components/SwUpdateBanner";
import { SupabaseAuthProvider } from "@/components/providers/SupabaseAuthProvider";
import AuthRedirectListener from "@/components/providers/AuthRedirectListener";
import AuthStatusBar from "@/components/AuthStatusBar";

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
        <SupabaseAuthProvider>
          <AuthRedirectListener />
          <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
                <span className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-fg">
                  Trading Journal
                </span>
                <AuthStatusBar />
              </div>
            </header>
            <main id="main" className="flex-1">{children}</main>
          </div>
        </SupabaseAuthProvider>

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
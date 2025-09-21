import "./globals.css";
import type { Metadata } from "next";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Calm mind, strong trade",
  manifest: "/manifest.json",
  themeColor: "#0ea5e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {/* Toggle tema flottante (in alto a destra) */}
        <div className="pointer-events-none fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>

        <main id="main">{children}</main>

        {/* Registra il Service Worker (PWA) */}
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
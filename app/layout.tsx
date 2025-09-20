import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La mia PWA",
  description: "Un sito responsive + PWA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        {/* Per PWA installabile */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Responsive */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* iOS PWA full-screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}

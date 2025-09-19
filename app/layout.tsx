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
        {/* Collegamento al manifest.json */}
        <link rel="manifest" href="/manifest.json" />
        {/* Colore della barra del browser su mobile */}
        <meta name="theme-color" content="#2563eb" />
        {/* Icona per iPhone/iPad quando aggiungi alla Home */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-gray-100">{children}</body>
    </html>
  );
}
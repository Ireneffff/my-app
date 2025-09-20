"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Perché: garantire scope root e visibilità update
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("Service Worker registrato ✅", reg.scope);
        })
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-3">
      <h1 className="text-3xl font-bold text-center">Ciao 👋</h1>
      <p className="text-center max-w-prose">
        Questa è una PWA responsive. Metti il dispositivo in modalità aereo per
        provare l&apos;offline.
      </p>
      <a
        href="/offline.html"
        className="underline"
        aria-label="Vai alla pagina offline di test"
      >
        Test offline
      </a>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export default function SwUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      // Perché: evita loop di reload multipli
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Caso: update già pronta (es. dopo refresh)
      if (reg.waiting) setWaiting(reg.waiting);

      // Osserva nuovi update
      reg.onupdatefound = () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.onstatechange = () => {
          // Mostra banner SOLO se è un update (controller presente)
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(sw);
          }
        };
      };
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  const refresh = () => {
    // Chiede al SW nuovo di prendere il controllo subito
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto w-fit max-w-[calc(100%-1rem)]">
      <div className="mx-auto flex items-center gap-3 rounded-2xl border border-border/60 bg-bg px-4 py-3 shadow-xl">
        <span className="text-sm text-muted-fg">Nuova versione disponibile</span>
        <button
          className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white shadow hover:opacity-90"
          onClick={refresh}
        >
          Aggiorna
        </button>
        <button
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-muted/50"
          onClick={() => setWaiting(null)}
        >
          Più tardi
        </button>
      </div>
    </div>
  );
}
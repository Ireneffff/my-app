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
    <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto w-fit max-w-[calc(100%-1.5rem)] px-2">
      <div className="mx-auto flex items-center gap-3 rounded-full border border-border bg-surface px-5 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
        <span className="text-sm font-medium text-muted-fg">Nuova versione disponibile</span>
        <button
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(0,122,255,0.25)] transition hover:shadow-[0_14px_32px_rgba(0,122,255,0.3)]"
          onClick={refresh}
        >
          Aggiorna
        </button>
        <button
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-fg transition hover:bg-subtle hover:text-fg"
          onClick={() => setWaiting(null)}
        >
          Più tardi
        </button>
      </div>
    </div>
  );
}
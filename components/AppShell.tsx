"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [renderKey, setRenderKey] = useState(() => pathname);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    setRenderKey(pathname);

    const frame = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const pageKey = useMemo(() => `${renderKey}-shell`, [renderKey]);

  return (
    <div className="app-shell">
      <div
        key={pageKey}
        className={`app-shell__page ${isReady ? "app-shell__page--ready" : ""}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}


import Link from "next/link";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0ea5e9", // ✅ necessario qui per togliere l'avviso su /_not-found
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-center text-fg">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-fg">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Link href="/" className="mt-6">
        <span className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-fg transition hover:bg-subtle">Return home</span>
      </Link>
    </div>
  );
}
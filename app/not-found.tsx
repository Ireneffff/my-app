import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0ea5e9", // ✅ necessario qui per togliere l'avviso su /_not-found
};

export default function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
    </div>
  );
}
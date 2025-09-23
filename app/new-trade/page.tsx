"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import BottomNav from "@/components/BottomNav";

export default function NewTradePage() {
  const router = useRouter();

  return (
    <section className="mx-auto flex min-h-dvh max-w-screen-sm flex-col px-4 pb-28 pt-6">
      {/* Header */}
      <h1 className="mb-4 text-center text-4xl font-extrabold tracking-tight text-fg">
        Trading Journal
      </h1>

      {/* Galleria + picker */}
      <ImageGallery />

      {/* Open all images (stub) */}
      <div className="mt-3 flex justify-end">
        <button
          className="text-sm font-medium text-accent hover:underline"
          onClick={() => {
            // Per ora: scrolla all’inizio (o potremmo aprire una nuova route / modal)
            window.alert("TODO: aprire tutte le immagini in una galleria full-screen");
          }}
        >
          Open all images
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom bar */}
      <BottomNav
        onHome={() => router.push("/")}
        onAdd={() => {
          // Re-usa il picker della gallery tramite evento custom
          document.getElementById("image-picker-input")?.click();
        }}
      />
    </section>
  );
}
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ImageGallery from "@/components/ImageGallery";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient"; // perché: verifica connessione lato client

export default function NewTradePage() {
  const router = useRouter();

  useEffect(() => {
    // perché: forzare chiamate a supabase.co e verificare env/connessione
    (async () => {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      console.log("[new-trade] session:", session, "error:", sessionError);

      const { data, error } = await supabase.from("profiles").select("*").limit(5);
      if (error) {
        console.error("[new-trade] profiles error:", error.message);
      } else {
        console.log("[new-trade] profiles data:", data);
      }
    })();
  }, []);

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
          document.getElementById("image-picker-input")?.click();
        }}
      />
    </section>
  );
}
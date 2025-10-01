"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ImageGallery from "@/components/ImageGallery";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient"; // perché: verifica connessione lato client

export default function NewTradePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekDays = useMemo(() => {
    const baseDate = new Date(selectedDate);
    const baseDay = baseDate.getDay();
    // Convert Sunday (0) to 6 to align Monday as the first day
    const diffFromMonday = (baseDay + 6) % 7;
    const monday = new Date(baseDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(baseDate.getDate() - diffFromMonday);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [selectedDate]);

  const dayOfWeekLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
      }),
    [selectedDate]
  );

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
    <section className="mx-auto flex min-h-dvh w-full max-w-screen-lg flex-col gap-6 px-4 pb-28 pt-8">
      <header className="rounded-3xl border border-border bg-subtle px-6 py-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-fg">
              Trading Journal
            </p>
            <h1 className="text-3xl font-black leading-tight text-fg md:text-4xl">
              Register a Trade
            </h1>
          </div>
          <button
            type="button"
            className="self-start rounded-full border border-transparent bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 md:self-center"
            onClick={() => {
              window.alert("TODO: implement save logic");
            }}
          >
            Save
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between gap-2 overflow-x-auto rounded-full border border-border bg-bg px-3 py-4 shadow-inner">
            {weekDays.map((date) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const dayNumber = date.getDate();
              const monthLabel = date
                .toLocaleDateString(undefined, {
                  month: "short",
                })
                .toUpperCase();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`flex min-w-[64px] flex-col items-center rounded-full px-2 py-1 text-xs font-semibold transition md:min-w-[80px] md:text-sm ${
                    isSelected
                      ? "text-fg"
                      : "text-muted-fg hover:text-fg"
                  }`}
                >
                  <span className={`text-lg md:text-xl ${isSelected ? "font-bold" : "font-semibold"}`}>
                    {dayNumber}
                  </span>
                  <span className="mt-1 text-[10px] tracking-wide md:text-xs">
                    {monthLabel}
                  </span>
                  {isSelected && (
                    <span className="mt-2 h-1 w-6 rounded-full bg-accent md:w-8" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              className="ml-auto flex h-12 w-12 flex-none items-center justify-center rounded-full border border-border bg-bg text-muted-fg transition hover:text-fg md:h-14 md:w-14"
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
              }}
              aria-label="Select today"
              title="Select today"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 md:h-7 md:w-7"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="12" cy="16" r="1.5" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-muted-fg md:text-base">
            Day of the week: <span className="font-semibold capitalize">{dayOfWeekLabel}</span>
          </p>
        </div>
      </header>

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
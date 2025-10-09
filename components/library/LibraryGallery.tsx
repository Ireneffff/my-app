"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { LibraryEntry } from "@/lib/libraryGallery";

export type LibraryGalleryProps = {
  entries: LibraryEntry[];
};

export default function LibraryGallery({ entries }: LibraryGalleryProps) {
  const preparedEntries = useMemo(() => entries.filter((entry) => entry.imageSrc), [entries]);
  const [activeId, setActiveId] = useState(() => preparedEntries[0]?.id ?? null);

  const activeEntry = useMemo(
    () => preparedEntries.find((entry) => entry.id === activeId) ?? preparedEntries[0],
    [activeId, preparedEntries],
  );

  if (!preparedEntries.length) {
    return (
      <div className="w-full rounded-3xl border border-dashed border-border/60 bg-surface/40 px-6 py-16 text-center text-sm text-muted-fg">
        Upload or register trades with snapshots to populate your personal inspiration library.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="relative overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br from-surface via-bg to-subtle p-6 shadow-[0_30px_60px_rgba(15,23,42,0.16)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.32em] text-muted-fg">
            <span className="rounded-full border border-border/60 bg-bg/60 px-4 py-1.5 text-[11px] text-muted-fg">
              Library Deck
            </span>
            <span className="hidden text-muted-fg/70 sm:inline">Curated visual notes</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <span className="inline-flex items-center gap-1 rounded-full bg-bg/70 px-3 py-1 font-medium uppercase tracking-[0.24em]">
              {preparedEntries.length} entries
            </span>
            <span className="hidden sm:inline">Tap a card to switch highlight</span>
          </div>
        </div>

        {activeEntry ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="relative min-h-[280px] overflow-hidden rounded-[28px] bg-black/20">
              <Image
                key={activeEntry.id}
                src={activeEntry.imageSrc}
                alt={activeEntry.imageAlt}
                fill
                sizes="(min-width: 1024px) 600px, (min-width: 640px) 80vw, 90vw"
                className="h-full w-full object-cover transition duration-500"
                priority
                unoptimized={activeEntry.imageSrc.startsWith("data:")}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-6 pb-8 pt-16 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
                  {activeEntry.accent}
                </span>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{activeEntry.title}</h3>
                    <p className="text-sm text-white/70 sm:text-base">{activeEntry.subtitle}</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 px-4 py-2 text-right text-xs uppercase tracking-[0.2em]">
                    <span className="block text-[10px] text-white/60">{activeEntry.metricLabel}</span>
                    <span className="text-base font-semibold text-white">{activeEntry.metricValue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-5 rounded-[28px] border border-border/60 bg-surface/90 p-6 text-left shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-fg">
                  {activeEntry.accent}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{activeEntry.title}</h3>
                <p className="text-sm text-muted-fg/80 sm:text-base">{activeEntry.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg/70">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 uppercase tracking-[0.24em]">
                  {activeEntry.subtitle}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 uppercase tracking-[0.24em]">
                  {activeEntry.metricLabel}: {activeEntry.metricValue}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex w-full gap-4 overflow-x-auto pb-2">
        {preparedEntries.map((entry) => {
          const isActive = entry.id === activeEntry?.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setActiveId(entry.id)}
              className={`group relative flex min-w-[240px] max-w-[260px] flex-col gap-4 rounded-[28px] border p-4 text-left transition duration-200 ease-out ${
                isActive
                  ? "border-accent/70 bg-accent/5 shadow-[0_20px_36px_rgba(15,23,42,0.18)]"
                  : "border-border/60 bg-surface/80 hover:-translate-y-1 hover:border-accent/60 hover:bg-surface/90"
              }`}
            >
              <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[22px]">
                <Image
                  src={entry.imageSrc}
                  alt={entry.imageAlt}
                  fill
                  sizes="240px"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  unoptimized={entry.imageSrc.startsWith("data:")}
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white">
                  {entry.accent}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-fg/70">{entry.subtitle}</p>
                  <h4 className="text-lg font-semibold text-fg">{entry.title}</h4>
                </div>
                <p className="text-sm text-muted-fg/80">{entry.description}</p>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-muted-fg/70">
                <span>{entry.metricLabel}</span>
                <span className="text-accent font-semibold">{entry.metricValue}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

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
    return <div className="w-full rounded-3xl border border-dashed border-border/60 bg-surface/40 px-6 py-16" />;
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="relative min-h-[360px] rounded-[32px] border border-border/60 bg-transparent p-6 sm:p-8" />

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
              <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[22px] bg-black/20">
                <span className="absolute left-3 top-3 h-6 w-20 rounded-full bg-black/55" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-muted/40" />
                  <div className="h-5 w-32 rounded-full bg-muted/40" />
                </div>
                <div className="h-12 w-full rounded-2xl bg-muted/20" />
              </div>
              <div className="flex items-center justify-between">
                <span className="h-3 w-16 rounded-full bg-muted/40" />
                <span className="h-3 w-12 rounded-full bg-accent/50" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

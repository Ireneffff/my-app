"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { LibraryEntry } from "@/lib/libraryGallery";

export type LibraryGalleryProps = {
  entries: LibraryEntry[];
};

export default function LibraryGallery({ entries }: LibraryGalleryProps) {
  const preparedEntries = useMemo(
    () => entries.filter((entry) => entry.imageSrc),
    [entries],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [entryUploads, setEntryUploads] = useState<Record<string, string>>({});
  const activeEntry = preparedEntries[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex >= preparedEntries.length) {
      setActiveIndex(preparedEntries.length ? preparedEntries.length - 1 : 0);
    }
  }, [activeIndex, preparedEntries.length]);

  const handleUploadForActiveEntry = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !activeEntry) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        return;
      }

      setEntryUploads((previous) => ({ ...previous, [activeEntry.id]: result }));
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const goToPrevious = () => {
    setActiveIndex((previous) =>
      previous === 0 ? Math.max(preparedEntries.length - 1, 0) : previous - 1,
    );
  };

  const goToNext = () => {
    setActiveIndex((previous) =>
      previous === Math.max(preparedEntries.length - 1, 0)
        ? 0
        : Math.min(previous + 1, preparedEntries.length - 1),
    );
  };

  const activePreview = activeEntry
    ? entryUploads[activeEntry.id] ?? activeEntry.imageSrc ?? null
    : null;

  const visibleEntries = useMemo(() => {
    if (!preparedEntries.length) {
      return [];
    }

    if (preparedEntries.length <= 3) {
      return preparedEntries;
    }

    const start = Math.max(0, activeIndex - 1);
    const end = Math.min(start + 3, preparedEntries.length);

    if (end - start < 3 && start > 0) {
      return preparedEntries.slice(end - 3, end);
    }

    return preparedEntries.slice(start, end);
  }, [activeIndex, preparedEntries]);

  const isUploadDisabled = !activeEntry;

  return (
    <div className="flex w-full flex-col gap-8">
      <label
        htmlFor="library-active-upload"
        className={`group relative flex min-h-[420px] w-full flex-col items-center justify-center rounded-[40px] border border-dashed border-border/40 bg-background/80 text-center transition ${
          isUploadDisabled
            ? "cursor-default opacity-80"
            : "cursor-pointer hover:border-border/60 hover:bg-background"
        }`}
      >
        <input
          id="library-active-upload"
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={!activeEntry}
          onChange={handleUploadForActiveEntry}
        />

        {activePreview ? (
          <div className="flex h-full w-full items-center justify-center p-6 sm:p-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePreview}
              alt="Anteprima immagine"
              className="max-h-[520px] w-full rounded-[32px] object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-foreground/60">
            <span className="rounded-full border border-dashed border-border/40 bg-background px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em]">
              Enter image
            </span>
            <p className="text-xs text-foreground/50">
              Tap to upload a snapshot before entering the trade.
            </p>
          </div>
        )}
      </label>

      <div className="flex flex-col items-center gap-8">
        <div className="relative flex w-full items-center justify-center">
          <div className="h-px w-full bg-border/40" />
          <div className="absolute inset-0 flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevious}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-lg font-semibold text-foreground shadow-sm transition hover:border-accent/50 hover:text-accent disabled:opacity-50"
              aria-label="Previous image"
              disabled={!preparedEntries.length}
            >
              ‹
            </button>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-lg text-background shadow">
                ✓
              </div>
            </div>
            <button
              type="button"
              onClick={goToNext}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-lg font-semibold text-foreground shadow-sm transition hover:border-accent/50 hover:text-accent disabled:opacity-50"
              aria-label="Next image"
              disabled={!preparedEntries.length}
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-6">
          {visibleEntries.length ? (
            visibleEntries.map((entry) => {
              const isActive = entry.id === activeEntry?.id;
              const previewImage = entryUploads[entry.id] ?? entry.imageSrc ?? null;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    const targetIndex = preparedEntries.findIndex(
                      (preparedEntry) => preparedEntry.id === entry.id,
                    );

                    if (targetIndex !== -1) {
                      setActiveIndex(targetIndex);
                    }
                  }}
                  className={`flex h-40 w-[220px] flex-col items-center justify-center rounded-[32px] border bg-background transition ${
                    isActive
                      ? "border-accent/60 shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
                      : "border-border/60 hover:border-accent/50"
                  }`}
                >
                  {previewImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previewImage} alt="" className="h-full w-full rounded-[28px] object-cover" />
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60">
                      Enter image
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex h-40 w-[220px] items-center justify-center rounded-[32px] border border-dashed border-border/60 bg-background/70 text-xs font-semibold uppercase tracking-[0.4em] text-foreground/50">
              Enter image
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

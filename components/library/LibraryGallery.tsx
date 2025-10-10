"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type { LibraryEntry } from "@/lib/libraryGallery";

export type LibraryGalleryProps = {
  entries: LibraryEntry[];
};

export default function LibraryGallery({ entries }: LibraryGalleryProps) {
  const preparedEntries = useMemo(() => entries, [entries]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [entryUploads, setEntryUploads] = useState<Record<string, string>>({});
  const activeEntry = preparedEntries[activeIndex] ?? null;

  useEffect(() => {
    if (activeIndex >= preparedEntries.length) {
      setActiveIndex(preparedEntries.length ? preparedEntries.length - 1 : 0);
    }
  }, [activeIndex, preparedEntries.length]);

  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUploadForEntry =
    (entryId: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;

        if (typeof result !== "string") {
          return;
        }

        setEntryUploads((previous) => ({ ...previous, [entryId]: result }));
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

  const activePreview = activeEntry ? entryUploads[activeEntry.id] ?? null : null;

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

  const heroInputId = activeEntry ? `library-hero-${activeEntry.id}` : null;

  const triggerFilePicker = (input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          return;
        }
      }
    }

    input.click();
  };

  const handleHeroClick = () => {
    triggerFilePicker(heroInputRef.current);
  };

  const handleHeroKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerFilePicker(heroInputRef.current);
    }
  };

  const handleThumbnailClick = (entryId: string) => {
    const targetIndex = preparedEntries.findIndex(
      (preparedEntry) => preparedEntry.id === entryId,
    );

    if (targetIndex !== -1 && targetIndex !== activeIndex) {
      setActiveIndex(targetIndex);
    }

    const input = thumbnailInputRefs.current[entryId];

    triggerFilePicker(input ?? null);
  };

  const handleThumbnailKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    entryId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleThumbnailClick(entryId);
    }
  };

  return (
    <div className="flex w-full flex-col gap-8">
      {activeEntry ? (
        <>
          <input
            ref={heroInputRef}
            id={heroInputId ?? undefined}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleUploadForEntry(activeEntry.id)}
            aria-label="Upload image"
          />
          <div
            onClick={handleHeroClick}
            onKeyDown={handleHeroKeyDown}
            role="button"
            tabIndex={0}
            className="group relative flex min-h-[420px] w-full cursor-pointer flex-col items-center justify-center rounded-[40px] border border-dashed border-border/50 bg-[#f6f7f9] text-center transition hover:border-border/70 focus:outline-none focus-visible:border-border/70"
            aria-label="Upload image"
          >
            <div className="flex h-full w-full flex-col items-center justify-center">
              {activePreview ? (
                <div className="flex h-full w-full items-center justify-center p-6 sm:p-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePreview}
                    alt="Anteprima immagine caricata"
                    className="max-h-[520px] w-full rounded-[32px] object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-10 text-foreground/50">
                  <span className="rounded-full border border-dashed border-border/50 bg-white px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60">
                    Enter image
                  </span>
                  <p className="text-xs text-foreground/50">PNG, JPG or WEBP - max 5 MB</p>
                  <p className="text-xs text-foreground/40">
                    Tap to upload a snapshot of your setup before entering the trade.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="relative flex min-h-[420px] w-full flex-col items-center justify-center rounded-[40px] border border-dashed border-border/50 bg-[#f6f7f9] text-center opacity-80">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-10 text-foreground/50">
            <span className="rounded-full border border-dashed border-border/50 bg-white px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60">
              Enter image
            </span>
            <p className="text-xs text-foreground/50">PNG, JPG or WEBP - max 5 MB</p>
            <p className="text-xs text-foreground/40">
              Tap to upload a snapshot of your setup before entering the trade.
            </p>
          </div>
        </div>
      )}

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
              const previewImage = entryUploads[entry.id] ?? null;

              return (
                <div key={entry.id} className="flex flex-col items-center">
                  <input
                    ref={(element) => {
                      if (element) {
                        thumbnailInputRefs.current[entry.id] = element;
                      } else {
                        delete thumbnailInputRefs.current[entry.id];
                      }
                    }}
                    id={`library-thumb-${entry.id}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    aria-label="Upload image"
                    onChange={handleUploadForEntry(entry.id)}
                  />
                  <div
                    onClick={() => handleThumbnailClick(entry.id)}
                    onKeyDown={(event) => handleThumbnailKeyDown(event, entry.id)}
                    role="button"
                    tabIndex={0}
                    className={`group relative flex h-40 w-[220px] cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed bg-[#f6f7f9] transition hover:border-accent/40 focus:outline-none focus-visible:border-accent/60 ${
                      isActive
                        ? "border-accent/60 shadow-[0_24px_48px_rgba(15,23,42,0.08)]"
                        : "border-border/60"
                    }`}
                    aria-label="Upload image"
                  >
                    <div className="flex h-full w-full items-center justify-center">
                      {previewImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewImage} alt="" className="h-full w-full rounded-[28px] object-cover" />
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60">
                          Enter image
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex h-40 w-[220px] flex-col items-center justify-center gap-2 rounded-[32px] border border-dashed border-border/60 bg-[#f6f7f9] text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60">
                Enter image
              </span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">
                PNG / JPG / WEBP
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

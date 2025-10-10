"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { LibraryEntry } from "@/lib/libraryGallery";

export type LibraryGalleryProps = {
  entries: LibraryEntry[];
};

export default function LibraryGallery({ entries }: LibraryGalleryProps) {
  const preparedEntries = useMemo(() => entries.filter((entry) => entry.imageSrc), [entries]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [entryUploads, setEntryUploads] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!preparedEntries.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((previousIndex) => {
      if (previousIndex < preparedEntries.length) {
        return previousIndex;
      }

      return preparedEntries.length - 1;
    });
  }, [preparedEntries.length]);

  const activeEntry = preparedEntries[activeIndex] ?? null;
  const activeImage = activeEntry ? entryUploads[activeEntry.id] ?? activeEntry.imageSrc ?? null : null;

  const handleEntryImageChange = (entryId: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        setUploadError("Caricamento non riuscito. Riprova con un'altra immagine.");
        return;
      }

      setUploadError(null);
      setEntryUploads((previous) => ({ ...previous, [entryId]: result }));
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleHeroImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeEntry) {
      return;
    }

    handleEntryImageChange(activeEntry.id)(event);
  };

  const showPlaceholder = !activeImage;

  const visibleEntryIndices = useMemo(() => {
    if (!preparedEntries.length) {
      return [];
    }

    if (preparedEntries.length <= 3) {
      return preparedEntries.map((_, index) => index);
    }

    const previousIndex = (activeIndex - 1 + preparedEntries.length) % preparedEntries.length;
    const nextIndex = (activeIndex + 1) % preparedEntries.length;

    return [previousIndex, activeIndex, nextIndex];
  }, [activeIndex, preparedEntries]);

  if (!preparedEntries.length) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-10">
        <div className="flex w-full flex-col items-center justify-center rounded-[48px] border border-dashed border-border/60 bg-background/70 px-12 py-20 text-center">
          <span className="rounded-full border border-border/50 bg-background px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-foreground/70">
            Enter image
          </span>
          <p className="mt-6 text-sm text-foreground/60">Carica il tuo primo scatto per popolare la libreria.</p>
        </div>
        <div className="h-px w-full max-w-2xl bg-border/60" />
        <div className="flex w-full flex-wrap justify-center gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="flex h-44 w-[220px] flex-col items-center justify-center rounded-[32px] border border-dashed border-border/60 bg-background/70 text-xs font-semibold uppercase tracking-[0.4em] text-foreground/60"
            >
              Enter image
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handlePrevious = () => {
    setActiveIndex((current) => {
      if (!preparedEntries.length) {
        return current;
      }

      return (current - 1 + preparedEntries.length) % preparedEntries.length;
    });
  };

  const handleNext = () => {
    setActiveIndex((current) => {
      if (!preparedEntries.length) {
        return current;
      }

      return (current + 1) % preparedEntries.length;
    });
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="relative rounded-[48px] border border-dashed border-border/60 bg-background/70 px-8 py-10 sm:px-12 sm:py-16">
        <label
          htmlFor={activeEntry ? `library-entry-upload-${activeEntry.id}` : "library-hero-upload"}
          className="group flex min-h-[360px] w-full cursor-pointer flex-col items-center justify-center gap-6 text-center"
        >
          <input
            id="library-hero-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleHeroImageChange}
            disabled={!activeEntry}
          />
          <span className="rounded-full border border-border/50 bg-background px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.4em] text-foreground/70">
            Enter image
          </span>

          {showPlaceholder ? (
            <div className="flex max-w-xl flex-col items-center justify-center gap-4 text-foreground/60">
              <p className="text-sm font-medium sm:text-base">Tap to upload a snapshot of your setup.</p>
              <p className="text-xs sm:text-sm">PNG, JPG o WEBP · max 5 MB</p>
            </div>
          ) : (
            <div className="flex w-full max-w-4xl items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImage} alt={activeEntry?.title ?? "Anteprima"} className="max-h-[520px] w-full object-contain" />
            </div>
          )}
        </label>
        {uploadError ? <p className="mt-6 text-sm text-destructive">{uploadError}</p> : null}
      </div>

      <div className="relative flex items-center justify-center">
        <div className="h-px w-full bg-border/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-28 overflow-hidden rounded-full border border-border/60 bg-background shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={handlePrevious}
              className="flex h-full flex-1 items-center justify-center text-foreground transition hover:bg-foreground/5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden
                focusable="false"
              >
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
              <span className="sr-only">Voce precedente</span>
            </button>
            <div className="h-full w-px bg-border/60" />
            <button
              type="button"
              onClick={handleNext}
              className="flex h-full flex-1 items-center justify-center text-foreground transition hover:bg-foreground/5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden
                focusable="false"
              >
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
              <span className="sr-only">Voce successiva</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-wrap justify-center gap-6">
        {visibleEntryIndices.map((entryIndex) => {
          const entry = preparedEntries[entryIndex];
          const isActive = entryIndex === activeIndex;
          const previewImage = entryUploads[entry.id] ?? entry.imageSrc ?? null;

          return (
            <div key={entry.id} className="relative">
              <input
                id={`library-entry-upload-${entry.id}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleEntryImageChange(entry.id)}
              />
              <button
                type="button"
                onClick={() => setActiveIndex(entryIndex)}
                className={`group relative flex h-44 w-[220px] flex-col items-center justify-center overflow-hidden rounded-[32px] border bg-background text-xs font-semibold uppercase tracking-[0.4em] transition duration-200 ease-out ${
                  isActive
                    ? "border-accent/80 text-accent shadow-[0_20px_36px_rgba(15,23,42,0.16)]"
                    : "border-border/60 text-foreground/60 hover:border-accent/60"
                }`}
              >
                {isActive ? (
                  <span className="absolute -top-4 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background bg-accent text-background">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden
                      focusable="false"
                    >
                      <path d="M6 12l4 4 8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span className="sr-only">Elemento selezionato</span>
                  </span>
                ) : null}

                {previewImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={previewImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>Enter image</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

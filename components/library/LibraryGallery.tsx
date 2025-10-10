"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { LibraryEntry } from "@/lib/libraryGallery";

export type LibraryGalleryProps = {
  entries: LibraryEntry[];
};

export default function LibraryGallery({ entries }: LibraryGalleryProps) {
  const preparedEntries = useMemo(() => entries.filter((entry) => entry.imageSrc), [entries]);
  const [activeId, setActiveId] = useState(() => preparedEntries[0]?.id ?? null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [entryUploads, setEntryUploads] = useState<Record<string, string>>({});

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadError(null);

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        setUploadError("Caricamento non riuscito. Riprova con un'altra immagine.");
        return;
      }

      setUploadError(null);
      setUploadedImage(result);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

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

  const activeEntry = useMemo(
    () => preparedEntries.find((entry) => entry.id === activeId) ?? preparedEntries[0],
    [activeId, preparedEntries],
  );

  if (!preparedEntries.length) {
    return <div className="w-full rounded-3xl border border-dashed border-border/60 bg-surface/40 px-6 py-16" />;
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div
        className={`relative min-h-[360px] rounded-[32px] ${
          uploadedImage ? "bg-transparent" : "border border-dashed border-border/60 bg-surface/30 p-2"
        }`}
      >
        <label
          htmlFor="library-hero-upload"
          className={`group flex h-full w-full cursor-pointer flex-col items-center justify-center text-center transition ${
            uploadedImage
              ? "rounded-[32px] bg-transparent"
              : "gap-3 rounded-[28px] bg-background/40 px-6 py-12 hover:bg-background/60"
          }`}
        >
          <input
            id="library-hero-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />
          <span className="sr-only">Carica o sostituisci l&apos;immagine della libreria</span>

          {uploadedImage ? (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div className="flex h-full w-full max-w-5xl items-center justify-center px-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage}
                  alt="Anteprima immagine caricata"
                  className="max-h-[520px] w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <span className="rounded-full border border-dashed border-border/40 bg-background/80 px-6 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-foreground/70">
                Enter Image
              </span>
              <p className="text-xs font-medium text-foreground/60 sm:text-sm">PNG, JPG o WEBP · max 5 MB</p>
              <p className="max-w-[360px] text-xs text-foreground/50 sm:text-sm">
                Tap to upload a snapshot of your setup before entering the trade.
              </p>
              <p className="text-xs text-foreground/40 sm:text-sm">Formato consigliato: 19:6</p>
            </div>
          )}

          {uploadError ? (
            <p className="mt-6 text-sm text-destructive">{uploadError}</p>
          ) : null}
        </label>
      </div>

      <div className="flex w-full gap-4 overflow-x-auto pb-2">
        {preparedEntries.map((entry) => {
          const isActive = entry.id === activeEntry?.id;
          const uploadedEntryImage = entryUploads[entry.id];
          const previewImage = uploadedEntryImage ?? entry.imageSrc ?? null;

          return (
            <div key={entry.id} className="relative">
              <input
                id={`library-entry-upload-${entry.id}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleEntryImageChange(entry.id)}
              />
              <label
                htmlFor={`library-entry-upload-${entry.id}`}
                onClick={() => setActiveId(entry.id)}
                className={`group relative flex h-40 min-w-[320px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border transition duration-200 ease-out ${
                  isActive
                    ? "border-accent/70 shadow-[0_20px_36px_rgba(15,23,42,0.18)]"
                    : "border-border/60 hover:-translate-y-1 hover:border-accent/60"
                }`}
              >
                <span className="sr-only">Carica o sostituisci l&apos;immagine per {entry.title}</span>
                {previewImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={previewImage} alt="" className="h-full w-full object-contain" />
                ) : null}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

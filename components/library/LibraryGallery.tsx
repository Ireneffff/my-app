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

      const image = new Image();

      image.onload = () => {
        const aspectRatio = image.width / image.height;
        const targetAspectRatio = 19 / 6;

        if (Math.abs(aspectRatio - targetAspectRatio) > 0.05) {
          setUploadError("L'immagine deve avere un formato 19:6.");
          return;
        }

        setUploadError(null);
        setUploadedImage(result);
      };

      image.src = result;
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
      <div className="relative min-h-[360px] rounded-[32px] border border-border/60 bg-transparent p-6 sm:p-8">
        <label
          htmlFor="library-hero-upload"
          className="group relative mx-auto flex h-full w-full max-w-4xl cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border/50 bg-surface/30 text-center transition hover:border-accent/50 hover:bg-surface/50"
        >
          <input
            id="library-hero-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleImageChange}
          />

          <div className="relative w-full max-w-4xl px-6 py-10 sm:px-12">
            <div className="relative mx-auto aspect-[19/6] w-full max-w-4xl overflow-hidden rounded-[24px] bg-muted/20 shadow-inner">
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Anteprima immagine caricata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <span className="rounded-full border border-muted/70 bg-background/70 px-5 py-2 text-xs font-medium uppercase tracking-[0.3em] text-foreground/80">
                    Enter Image
                  </span>
                  <p className="text-xs font-medium text-foreground/60 sm:text-sm">PNG, JPG o WEBP · max 5 MB</p>
                  <p className="max-w-[360px] text-xs text-foreground/50 sm:text-sm">
                    Tocca o trascina per caricare una foto nel formato 19:6 da mostrare in questo spazio.
                  </p>
                </div>
              )}
            </div>
          </div>

          {uploadError ? (
            <p className="pb-4 text-sm text-destructive">{uploadError}</p>
          ) : (
            <p className="pb-4 text-xs text-muted-foreground">Rapporto richiesto: 19:6</p>
          )}
        </label>
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

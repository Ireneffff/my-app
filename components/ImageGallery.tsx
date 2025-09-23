"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type LocalImage = {
  id: string;
  file: File;
  url: string;
};

export default function ImageGallery() {
  const [images, setImages] = useState<LocalImage[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // cleanup degli objectURL
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [images]);

  const onPick = (files: FileList | null) => {
    if (!files || !files.length) return;
    const next: LocalImage[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${f.lastModified}-${crypto.randomUUID()}`,
      file: f,
      url: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...next]);
    // scroll a fine lista
    requestAnimationFrame(() => listRef.current?.scrollTo({ left: 99999, behavior: "smooth" }));
  };

  const hasImages = images.length > 0;

  return (
    <div>
      {/* Picker */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => document.getElementById("image-picker-input")?.click()}
          className="rounded-xl border border-border bg-bg px-4 py-2 text-sm font-medium shadow hover:bg-subtle"
        >
          Add photos
        </button>

        <input
          id="image-picker-input"
          type="file"
          accept="image/*"
          multiple
          // Suggerisce fotocamera su iOS PWA
          capture="environment"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />

        <span className="text-sm text-muted-fg">{images.length} selected</span>
      </div>

      {/* Carosello */}
      <div
        ref={listRef}
        className="no-scrollbar -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-2"
        aria-label="Image carousel"
      >
        {hasImages ? (
          images.map((img) => (
            <figure
              key={img.id}
              className="snap-start rounded-2xl border border-border bg-bg shadow-xl"
              style={{ minWidth: 480, maxWidth: 480 }}
            >
              {/* immagine */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.file.name}
                className="h-64 w-full rounded-2xl object-cover"
              />
            </figure>
          ))
        ) : (
          <EmptyCard />
        )}
      </div>
    </div>
  );
}

function EmptyCard() {
  return (
    <div
      className="grid h-64 place-items-center rounded-2xl border border-dashed border-border text-center text-muted-fg"
      style={{ minWidth: 480, maxWidth: 480 }}
    >
      <div>
        <p className="text-sm">Nessuna immagine</p>
        <p className="text-xs">Tocca “Add photos” o il “+” in basso</p>
      </div>
    </div>
  );
}
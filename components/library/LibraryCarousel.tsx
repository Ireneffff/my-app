"use client";

import { useMemo } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibraryCarouselItem extends LibraryCardProps {
  id: string;
}

interface LibraryCarouselProps {
  items: LibraryCarouselItem[];
  selectedId?: string;
  onSelectItem?: (itemId: string) => void;
  onAddItem?: () => void;
}

export function LibraryCarousel({ items, selectedId, onSelectItem, onAddItem }: LibraryCarouselProps) {
  const hasItems = items.length > 0;
  const selectedIndex = useMemo(() => {
    if (!hasItems) {
      return -1;
    }

    const explicitIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : 0;
    return explicitIndex >= 0 ? explicitIndex : 0;
  }, [hasItems, items, selectedId]);

  const selectedItem = hasItems && selectedIndex >= 0 ? items[selectedIndex] : undefined;

  const goToOffset = (offset: number) => {
    if (!hasItems || items.length < 2) {
      return;
    }

    const nextIndex = (selectedIndex + offset + items.length) % items.length;
    const target = items[nextIndex];
    if (!target) {
      return;
    }

    onSelectItem?.(target.id);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goToOffset(-1)}
          disabled={!hasItems || items.length < 2}
          aria-label="Mostra card precedente"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
        >
          <ArrowIcon direction="left" />
        </button>

        {selectedItem ? (
          <LibraryCard
            key={selectedItem.id}
            {...selectedItem}
            isActive
            className={`w-[220px] sm:w-[240px] ${selectedItem.className ?? ""}`}
            onClick={(event) => {
              onSelectItem?.(selectedItem.id);
              selectedItem.onClick?.(event);
            }}
          />
        ) : (
          <div className="flex h-[180px] w-[220px] items-center justify-center rounded-2xl border border-dashed border-muted/40 bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg sm:h-[200px] sm:w-[240px]">
            Nessuna card
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goToOffset(1)}
            disabled={!hasItems || items.length < 2}
            aria-label="Mostra card successiva"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="right" />
          </button>

          {onAddItem ? (
            <button
              type="button"
              onClick={onAddItem}
              aria-label="Aggiungi una nuova card libreria"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 sm:h-12 sm:w-12"
            >
              <PlusIcon />
            </button>
          ) : null}
        </div>
      </div>

      {items.length > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {items.map((item, index) => {
            const isActive = item.id === (selectedItem?.id ?? selectedId);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem?.(item.id)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  isActive ? "bg-accent" : "bg-muted/40 hover:bg-muted"
                }`}
                aria-label={`Mostra card ${index + 1}`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  const rotation = direction === "left" ? "rotate-180" : "";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 transition-transform ${rotation}`}
      aria-hidden="true"
    >
      <path d="m8 4 8 8-8 8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

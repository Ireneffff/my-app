"use client";

import { useMemo, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasItems = items.length > 0;

  const selectedIndex = useMemo(() => {
    if (!hasItems) {
      return -1;
    }

    if (!selectedId) {
      return 0;
    }

    const explicitIndex = items.findIndex((item) => item.id === selectedId);
    return explicitIndex >= 0 ? explicitIndex : 0;
  }, [hasItems, items, selectedId]);

  const goToAdjacent = (direction: -1 | 1) => {
    if (!hasItems || items.length < 2) {
      return;
    }

    const baseIndex = selectedIndex === -1 ? 0 : selectedIndex;
    const nextIndex = (baseIndex + direction + items.length) % items.length;
    const target = items[nextIndex];

    if (target) {
      onSelectItem?.(target.id);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-start gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToAdjacent(-1)}
            disabled={!hasItems || items.length < 2}
            aria-label="Mostra card precedente"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="left" />
          </button>

          <button
            type="button"
            onClick={() => goToAdjacent(1)}
            disabled={!hasItems || items.length < 2}
            aria-label="Mostra card successiva"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>

      </div>

      <div
        ref={containerRef}
        className="flex max-h-[520px] flex-col gap-4 overflow-y-auto pb-2 pt-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.accent)_transparent]"
      >
        {hasItems ? (
          items.map((item) => {
            const isActive = item.id === (selectedId ?? items[0]?.id);

            return (
              <LibraryCard
                key={item.id}
                {...item}
                isActive={isActive}
                data-library-carousel-item={item.id}
                className={item.className ?? ""}
                onClick={(event) => {
                  onSelectItem?.(item.id);
                  item.onClick?.(event);
                }}
              />
            );
          })
        ) : (
          <div className="flex h-[180px] w-full items-center justify-center rounded-2xl border border-dashed border-muted/40 bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Nessuna card
          </div>
        )}

        {onAddItem ? (
          <LibraryCard
            key="library-add-card"
            label="Nuova immagine"
            aria-label="Aggiungi una nuova card libreria"
            isActive={false}
            data-library-carousel-item="add"
            onClick={() => {
              onAddItem?.();
            }}
            visual={<PlusIcon className="h-10 w-10 text-accent" />}
          />
        ) : null}
      </div>
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

function PlusIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

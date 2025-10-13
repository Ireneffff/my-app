"use client";

import { useRef } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibraryCarouselItem extends LibraryCardProps {
  id: string;
}

interface LibraryCarouselProps {
  items: LibraryCarouselItem[];
  selectedId?: string;
  onSelectItem?: (itemId: string) => void;
  onAddItem?: () => void;
  onRemoveItem?: (itemId: string) => void;
}

export function LibraryCarousel({
  items,
  selectedId,
  onSelectItem,
  onAddItem,
  onRemoveItem,
}: LibraryCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasItems = items.length > 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 pb-2 pt-1"
    >
      {hasItems ? (
        items.map((item) => {
          const isActive = item.id === (selectedId ?? items[0]?.id);
          const { className: itemClassName, onClick: itemOnClick, ...restItem } = item;
          const combinedClassName = itemClassName
            ? `${itemClassName} w-full`
            : "w-full";
          const shouldDim = hasItems && !isActive;

          return (
            <div key={item.id} className="relative">
              {onRemoveItem ? (
                <button
                  type="button"
                  aria-label={`Rimuovi ${item.label}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="absolute right-4 top-4 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/95 text-neutral-500 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <CloseIcon />
                </button>
              ) : null}

              <LibraryCard
                {...restItem}
                isActive={isActive}
                isDimmed={shouldDim}
                data-library-carousel-item={item.id}
                className={combinedClassName}
                onClick={(event) => {
                  onSelectItem?.(item.id);
                  itemOnClick?.(event);
                }}
              />
            </div>
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
          isDimmed={false}
          data-library-carousel-item="add"
          className="w-full"
          onClick={() => {
            onAddItem?.();
          }}
          visual={<PlusIcon className="h-10 w-10 text-accent" />}
        />
      ) : null}
    </div>
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

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m16.5 7.5-9 9" />
      <path d="m7.5 7.5 9 9" />
    </svg>
  );
}

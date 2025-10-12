"use client";

import { useRef } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibraryCarouselItem extends LibraryCardProps {
  id: string;
  note?: string;
  onNoteChange?: (nextNote: string) => void;
  notePlaceholder?: string;
  isNoteReadOnly?: boolean;
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
      className="flex flex-col gap-6 pb-3 pt-2"
    >
      {hasItems ? (
        items.map((item) => {
          const isActive = item.id === (selectedId ?? items[0]?.id);
          const {
            className: itemClassName,
            onClick: itemOnClick,
            note,
            onNoteChange,
            notePlaceholder,
            isNoteReadOnly,
            ...restItem
          } = item;
          const combinedClassName = itemClassName
            ? `${itemClassName} w-full`
            : "w-full";
          const shouldDim = hasItems && !isActive;
          const noteId = `library-note-${item.id}`;
          const noteValue = note ?? "";
          const canEditNote = typeof onNoteChange === "function" && !isNoteReadOnly;
          const noteFieldPlaceholder = notePlaceholder ?? "Aggiungi note";

          return (
            <div key={item.id} className="relative flex flex-col gap-3">
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
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={noteId}
                  className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg"
                >
                  Note
                </label>
                <textarea
                  id={noteId}
                  value={noteValue}
                  onChange={(event) => {
                    if (canEditNote) {
                      onNoteChange?.(event.target.value);
                    }
                  }}
                  placeholder={noteFieldPlaceholder}
                  readOnly={!canEditNote}
                  aria-readonly={!canEditNote}
                  className={`min-h-[92px] w-full resize-none rounded-2xl border border-white/70 bg-[#eef2ff] px-4 py-3 text-xs font-medium text-fg shadow-[0_22px_60px_-45px_rgba(15,23,42,0.55)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    canEditNote ? "" : "cursor-default opacity-80"
                  }`}
                />
              </div>
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

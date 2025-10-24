"use client";

import { useEffect, useRef, useState } from "react";

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
  onReorderItem?: (draggedItemId: string, targetItemId: string | null) => void;
}

export function LibraryCarousel({
  items,
  selectedId,
  onSelectItem,
  onAddItem,
  onRemoveItem,
  onReorderItem,
}: LibraryCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const hasItems = items.length > 0;
  const activeItemId = selectedId ?? items[0]?.id;
  const canReorderItems = typeof onReorderItem === "function";

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeItemId) {
      return;
    }

    const escapedId = (() => {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(activeItemId);
      }

      return activeItemId.replace(/['"\\]/g, "\\$&");
    })();

    const target = container.querySelector<HTMLElement>(
      `[data-library-carousel-item="${escapedId}"]`,
    );

    if (!target) {
      return;
    }

    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeItemId, items.length]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col"
    >
      <div
        className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto scroll-smooth snap-y snap-mandatory py-3 scroll-py-6"
        onDragOver={(event) => {
          if (!draggingId || !canReorderItems) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          if (!canReorderItems) {
            return;
          }

          event.preventDefault();
          const draggedItemId = event.dataTransfer.getData("text/plain") || draggingId;

          if (!draggedItemId) {
            setDraggingId(null);
            return;
          }

          onReorderItem?.(draggedItemId, null);
          setDraggingId(null);
        }}
      >
        {hasItems ? (
          items.map((item) => {
            const isActive = item.id === activeItemId;
            const isDragging = item.id === draggingId;
            const { className: itemClassName, onClick: itemOnClick, ...restItem } = item;
            const combinedClassName = itemClassName
              ? `${itemClassName} w-full max-w-[calc(100%-1rem)]`
              : "w-full max-w-[calc(100%-1rem)]";
            const shouldDim = hasItems && !isActive;

            return (
              <div
                key={item.id}
                className="relative flex snap-start justify-center"
                draggable={canReorderItems}
                onDragStart={(event) => {
                  if (!canReorderItems) {
                    return;
                  }

                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                  setDraggingId(item.id);
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                }}
                onDragOver={(event) => {
                  if (!canReorderItems || draggingId === item.id) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  if (!canReorderItems) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  const draggedItemId = event.dataTransfer.getData("text/plain") || draggingId;

                  if (!draggedItemId || draggedItemId === item.id) {
                    setDraggingId(null);
                    return;
                  }

                  onReorderItem?.(draggedItemId, item.id);
                  setDraggingId(null);
                }}
              >
                {onRemoveItem ? (
                  <button
                    type="button"
                    aria-label={`Rimuovi ${item.label}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="absolute right-4 top-4 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/95 text-neutral-500 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-colors hover:text-neutral-900 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  >
                    <CloseIcon />
                  </button>
                ) : null}

                <LibraryCard
                  {...restItem}
                  isActive={isActive}
                  isDimmed={shouldDim}
                  data-library-carousel-item={item.id}
                  aria-grabbed={isDragging}
                  className={`${combinedClassName} mx-auto ${
                    isDragging
                      ? "scale-[1.08] shadow-[0_32px_80px_-48px_rgba(15,23,42,0.55)]"
                      : ""
                  }`}
                  onClick={(event) => {
                    onSelectItem?.(item.id);
                    itemOnClick?.(event);
                  }}
                />
              </div>
            );
          })
        ) : (
          <div className="mx-auto flex h-[180px] w-full max-w-[calc(100%-1rem)] snap-start items-center justify-center rounded-2xl border border-dashed border-muted/40 bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
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
            className="mx-auto w-full max-w-[calc(100%-1rem)] snap-start"
            hideLabel
            visualWrapperClassName="h-32 w-full overflow-visible bg-transparent"
            onClick={() => {
              onAddItem?.();
            }}
            visual={
              <span className="flex h-full w-full items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_22px_48px_-34px_rgba(15,23,42,0.45)]">
                  <PlusIcon className="h-5 w-5 text-accent" />
                </span>
              </span>
            }
          />
        ) : null}
      </div>
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

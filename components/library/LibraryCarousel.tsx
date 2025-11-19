"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibraryCarouselItem extends LibraryCardProps {
  id: string;
}

type MoveDirection = "up" | "down";

interface LibraryCarouselProps {
  items: LibraryCarouselItem[];
  selectedId?: string;
  onSelectItem?: (itemId: string) => void;
  onAddItem?: () => void;
  onRemoveItem?: (itemId: string) => void;
  onMoveItem?: (itemId: string, direction: MoveDirection) => void;
}

export function LibraryCarousel({
  items,
  selectedId,
  onSelectItem,
  onAddItem,
  onRemoveItem,
  onMoveItem,
}: LibraryCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const hasItems = items.length > 0;
  const activeItemId = selectedId ?? items[0]?.id;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const previousPositions = positionsRef.current;
    const currentPositions = new Map<string, DOMRect>();
    const carouselItems = container.querySelectorAll<HTMLElement>(
      "[data-library-carousel-item]",
    );

    carouselItems.forEach((element) => {
      const itemId = element.dataset.libraryCarouselItem;
      if (!itemId) {
        return;
      }

      const rect = element.getBoundingClientRect();
      currentPositions.set(itemId, rect);

      const previous = previousPositions.get(itemId);
      if (!previous) {
        return;
      }

      const deltaX = previous.left - rect.left;
      const deltaY = previous.top - rect.top;

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });

    positionsRef.current = currentPositions;
  }, [items]);

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

    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeItemId, items.length]);

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col rounded-2xl border border-[color:rgb(var(--border-strong))] bg-gradient-to-br from-white to-neutral-50/70 p-3 shadow-[0_28px_60px_-36px_rgba(15,23,42,0.32)] sm:p-4 lg:p-5"
    >
      <div
        className="flex h-full min-h-0 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden rounded-xl bg-neutral-100/70 px-3 py-3 scroll-smooth shadow-inner ring-1 ring-[color:rgb(var(--border))] sm:gap-4 sm:px-4 lg:flex-col lg:gap-4 lg:overflow-x-hidden lg:overflow-y-auto lg:scroll-py-6 lg:snap-y"
      >
        {hasItems ? (
          items.map((item, index) => {
            const isActive = item.id === activeItemId;
            const { className: itemClassName, onClick: itemOnClick, ...restItem } = item;
            const baseSizingClasses =
              "w-[220px] max-w-[220px] sm:w-[252px] sm:max-w-[252px] lg:w-full lg:max-w-[calc(100%-1rem)]";
            const combinedClassName = itemClassName
              ? `${itemClassName} ${baseSizingClasses}`
              : baseSizingClasses;
            const shouldDim = hasItems && !isActive;
            const showReorderControls = Boolean(onMoveItem) && items.length > 1;
            const showRemoveControl = Boolean(onRemoveItem);
            const showControls = showReorderControls || showRemoveControl;
            const canMoveUp = index > 0;
            const canMoveDown = index < items.length - 1;

            return (
              <div
                key={item.id}
                className="group relative flex snap-start justify-start lg:justify-center"
              >
                {showControls ? (
                  <div
                    className="pointer-events-auto absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 opacity-100 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
                  >
                    {showRemoveControl ? (
                      <button
                        type="button"
                        aria-label={`Rimuovi ${item.label}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRemoveItem?.(item.id);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/95 text-neutral-500 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.55)] transition-all hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--accent)/0.24)]"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                    {showReorderControls ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Sposta in alto ${item.label}`}
                          disabled={!canMoveUp}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!canMoveUp) {
                              return;
                            }
                            onMoveItem?.(item.id, "up");
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[color:rgb(var(--accent)/0.08)] text-accent shadow-[0_22px_48px_-24px_rgba(15,23,42,0.55)] transition-all hover:bg-[color:rgb(var(--accent)/0.12)] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--accent)/0.32)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUpIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Sposta in basso ${item.label}`}
                          disabled={!canMoveDown}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!canMoveDown) {
                              return;
                            }
                            onMoveItem?.(item.id, "down");
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[color:rgb(var(--accent)/0.08)] text-accent shadow-[0_22px_48px_-24px_rgba(15,23,42,0.55)] transition-all hover:bg-[color:rgb(var(--accent)/0.12)] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--accent)/0.32)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDownIcon />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <LibraryCard
                  {...restItem}
                  isActive={isActive}
                  isDimmed={shouldDim}
                  data-library-carousel-item={item.id}
                  className={`${combinedClassName} shrink-0 lg:shrink lg:mx-auto`}
                  onClick={(event) => {
                    onSelectItem?.(item.id);
                    itemOnClick?.(event);
                  }}
                />
              </div>
            );
          })
        ) : (
          <div className="flex h-[180px] w-[220px] max-w-[220px] shrink-0 snap-start items-center justify-center rounded-2xl border border-dashed border-muted/40 bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg sm:w-[252px] sm:max-w-[252px] lg:mx-auto lg:w-full lg:max-w-[calc(100%-1rem)]">
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
            className="w-[220px] max-w-[220px] shrink-0 snap-start sm:w-[252px] sm:max-w-[252px] lg:mx-auto lg:w-full lg:max-w-[calc(100%-1rem)]"
            hideLabel
            visualWrapperClassName="h-32 w-full overflow-visible bg-transparent ring-0 shadow-none"
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

function CloseIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="m16.5 7.5-9 9" />
      <path d="m7.5 7.5 9 9" />
    </svg>
  );
}

function ArrowUpIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

function ArrowDownIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="m18 13-6 6-6-6" />
    </svg>
  );
}

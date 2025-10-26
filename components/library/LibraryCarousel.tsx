"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

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
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositionsRef = useRef(new Map<string, DOMRect>());
  const [isMobile, setIsMobile] = useState(false);

  const cardFrameStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {
      aspectRatio: "4 / 3",
    };

    if (isMobile) {
      baseStyle.width = "100%";
      baseStyle.maxWidth = "360px";
    }

    return baseStyle;
  }, [isMobile]);

  const hasItems = items.length > 0;
  const activeItemId = useMemo(
    () => selectedId ?? items[0]?.id,
    [items, selectedId],
  );
  const canReorderItems = typeof onReorderItem === "function";

  const setItemRef = useCallback((itemId: string, node: HTMLDivElement | null) => {
    if (!node) {
      itemRefs.current.delete(itemId);
      return;
    }

    itemRefs.current.set(itemId, node);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateIsMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  useLayoutEffect(() => {
    if (!hasItems) {
      previousPositionsRef.current.clear();
      return;
    }

    const entries = Array.from(itemRefs.current.entries());
    const newPositions = new Map<string, DOMRect>();
    const frameIds: number[] = [];

    for (const [id, element] of entries) {
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      newPositions.set(id, rect);

      const previousRect = previousPositionsRef.current.get(id);

      if (!previousRect) {
        continue;
      }

      const deltaX = previousRect.left - rect.left;
      const deltaY = previousRect.top - rect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        continue;
      }

      element.style.transition = "none";
      element.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      element.getBoundingClientRect();

      const frameId = window.requestAnimationFrame(() => {
        element.style.transition =
          "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)";
        element.style.transform = "";
      });

      frameIds.push(frameId);

      const handleTransitionEnd = () => {
        element.style.transition = "";
        element.removeEventListener("transitionend", handleTransitionEnd);
      };

      element.addEventListener("transitionend", handleTransitionEnd);
    }

    previousPositionsRef.current = newPositions;

    return () => {
      frameIds.forEach((id) => window.cancelAnimationFrame(id));
    };
  }, [items, hasItems]);

  return (
    <div className="relative flex h-full min-h-[45vh] w-full flex-col overflow-hidden rounded-3xl border border-[#E6E6E6] bg-[#F7F7F7] p-4 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.45)] md:min-h-0">
      <div
        ref={containerRef}
        className="flex h-full flex-col"
      >
        <div
          className="flex h-full min-h-0 snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth py-3 md:flex-col md:snap-y md:overflow-x-hidden md:overflow-y-auto md:scroll-py-6"
        >
          {hasItems ? (
            items.map((item, index) => {
              const isActive = item.id === activeItemId;
              const {
                className: itemClassName,
                onClick: itemOnClick,
                hideLabel: itemHideLabel,
                visualWrapperClassName: itemVisualWrapperClassName,
                ["aria-label"]: itemAriaLabel,
                ...restItem
              } = item;
              const baseWidthClasses =
                "h-full w-full basis-full flex-shrink-0 md:h-auto md:basis-auto md:flex-shrink md:max-w-[calc(100%-1rem)]";
              const combinedClassName = itemClassName
                ? `${itemClassName} ${baseWidthClasses}`
                : baseWidthClasses;
              const shouldDim = hasItems && !isActive;
              const canMoveUp = canReorderItems && index > 0;
              const canMoveDown = canReorderItems && index < items.length - 1;
              const shouldHideLabel = isMobile ? true : Boolean(itemHideLabel);
              const shouldRenderOverlayLabel = isMobile && !itemHideLabel;

              const mergedVisualWrapperClassName = isMobile
                ? [itemVisualWrapperClassName, "h-full w-full"].filter(Boolean).join(" ")
                : itemVisualWrapperClassName;
              const resolvedAriaLabel =
                itemAriaLabel ??
                (shouldHideLabel && !itemHideLabel ? item.label : undefined);

              const handleMoveUp = (event: ReactMouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();

                if (!canReorderItems || !canMoveUp) {
                  return;
                }

                const targetItem = items[index - 1];

                if (!targetItem) {
                  return;
                }

                onReorderItem?.(item.id, targetItem.id);
              };

              const handleMoveDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();

                if (!canReorderItems || !canMoveDown) {
                  return;
                }

                const targetAfterItem = items[index + 2];
                onReorderItem?.(item.id, targetAfterItem?.id ?? null);
              };

              return (
                <div
                  key={item.id}
                  ref={(node) => setItemRef(item.id, node)}
                  data-library-carousel-wrapper={item.id}
                  className="group/item relative flex h-full w-full snap-center items-stretch justify-center md:w-auto md:snap-start"
                >
                  <div className="absolute right-3 top-3 z-40 flex flex-col items-end gap-2 md:right-4 md:top-4">
                    {onRemoveItem ? (
                      <button
                        type="button"
                        aria-label={`Rimuovi ${item.label}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRemoveItem(item.id);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/95 text-neutral-500 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] transition-colors hover:text-neutral-900 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                      >
                        <CloseIcon />
                      </button>
                    ) : null}

                    {canReorderItems ? (
                      <div className="pointer-events-none hidden flex-col items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100 md:flex">
                        <ReorderArrowButton
                          direction="up"
                          ariaLabel={`Sposta ${item.label} in alto`}
                          onClick={handleMoveUp}
                          disabled={!canMoveUp}
                        />
                        <ReorderArrowButton
                          direction="down"
                          ariaLabel={`Sposta ${item.label} in basso`}
                          onClick={handleMoveDown}
                          disabled={!canMoveDown}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="absolute inset-y-3 left-3 z-40 flex items-center md:hidden">
                    {canReorderItems ? (
                      <ReorderArrowButton
                        direction="left"
                        ariaLabel={`Sposta ${item.label} a sinistra`}
                        onClick={handleMoveUp}
                        disabled={!canMoveUp}
                      />
                    ) : null}
                  </div>

                  <div className="absolute inset-y-3 right-3 z-40 flex items-center md:hidden">
                    {canReorderItems ? (
                      <ReorderArrowButton
                        direction="right"
                        ariaLabel={`Sposta ${item.label} a destra`}
                        onClick={handleMoveDown}
                        disabled={!canMoveDown}
                      />
                    ) : null}
                  </div>

                  <div
                    className="relative flex w-full items-stretch justify-center md:block"
                    style={cardFrameStyle}
                  >
                    <LibraryCard
                      {...restItem}
                      isActive={isActive}
                      isDimmed={shouldDim}
                      data-library-carousel-item={item.id}
                      className={`${combinedClassName} mx-0 md:mx-auto`}
                      hideLabel={shouldHideLabel}
                      aria-label={resolvedAriaLabel}
                      visualWrapperClassName={mergedVisualWrapperClassName || undefined}
                      onClick={(event) => {
                        onSelectItem?.(item.id);
                        itemOnClick?.(event);
                      }}
                    />
                    {shouldRenderOverlayLabel ? (
                      <span className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-full bg-white/90 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]">
                        {item.label}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className="flex w-full max-w-full snap-center items-center justify-center rounded-2xl border border-dashed border-muted/40 bg-white/60 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg md:mx-auto md:max-w-[calc(100%-1rem)] md:snap-start"
              style={cardFrameStyle}
            >
              Nessuna card
            </div>
          )}

          {onAddItem ? (
            <div
              key="library-add-card-wrapper"
              className="flex w-full items-center justify-center snap-center md:mx-auto md:block md:max-w-[calc(100%-1rem)] md:snap-start"
              style={cardFrameStyle}
            >
              <LibraryCard
                label="Nuova immagine"
                aria-label="Aggiungi una nuova card libreria"
                isActive={false}
                isDimmed={false}
                data-library-carousel-item="add"
                className="h-full w-full max-w-full md:mx-auto md:h-auto"
                hideLabel
                visualWrapperClassName="aspect-[4/3] w-full overflow-visible bg-transparent"
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface ReorderArrowButtonProps {
  direction: "up" | "down" | "left" | "right";
  ariaLabel: string;
  disabled?: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

function ReorderArrowButton({
  direction,
  ariaLabel,
  disabled = false,
  onClick,
}: ReorderArrowButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/95 text-neutral-500 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] transition-colors hover:text-neutral-900 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:opacity-40 disabled:hover:text-neutral-500 md:h-7 md:w-7"
    >
      <ArrowIcon direction={direction} />
    </button>
  );
}

function ArrowIcon({ direction }: { direction: "up" | "down" | "left" | "right" }) {
  const rotation = {
    up: "rotate(0deg)",
    right: "rotate(90deg)",
    down: "rotate(180deg)",
    left: "rotate(270deg)",
  }[direction];

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
      style={{ transform: rotation }}
      aria-hidden="true"
    >
      <path d="m6 15 6-6 6 6" />
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

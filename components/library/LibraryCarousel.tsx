"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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

type ReorderPreview = {
  targetId: string;
  position: "before" | "after";
};

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
  const dropTargetIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    originLeft: number;
    originTop: number;
    offsetX: number;
    offsetY: number;
    translateX: number;
    translateY: number;
  } | null>(null);
  const [reorderPreview, setReorderPreview] = useState<ReorderPreview | null>(
    null,
  );
  const hasItems = items.length > 0;
  const activeItemId = selectedId ?? items[0]?.id;
  const canReorderItems = typeof onReorderItem === "function";
  const emptyDragImage = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const image = new Image();
    image.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    return image;
  }, []);

  const commitReorderPreview = useCallback((next: ReorderPreview | null) => {
    setReorderPreview((previous) => {
      if (
        previous?.targetId === next?.targetId &&
        previous?.position === next?.position
      ) {
        return previous;
      }

      return next;
    });
  }, []);

  const renderedItems = useMemo(() => {
    if (!draggingId) {
      return items;
    }

    const draggedItem = items.find((item) => item.id === draggingId);

    if (!draggedItem) {
      return items;
    }

    const remainingItems = items.filter((item) => item.id !== draggingId);

    if (!reorderPreview) {
      const originalIndex = items.findIndex((item) => item.id === draggingId);
      const safeIndex = Math.max(
        0,
        Math.min(originalIndex, remainingItems.length),
      );
      const nextItems = [...remainingItems];
      nextItems.splice(safeIndex, 0, draggedItem);
      return nextItems;
    }

    const nextItems = [...remainingItems];

    const targetIndex = nextItems.findIndex(
      (item) => item.id === reorderPreview.targetId,
    );

    if (targetIndex === -1) {
      nextItems.push(draggedItem);
      return nextItems;
    }

    const insertIndex =
      reorderPreview.position === "before" ? targetIndex : targetIndex + 1;
    const boundedIndex = Math.max(0, Math.min(insertIndex, nextItems.length));
    nextItems.splice(boundedIndex, 0, draggedItem);
    return nextItems;
  }, [draggingId, items, reorderPreview]);

  const dropTargetId = useMemo(() => {
    if (!draggingId) {
      return null;
    }

    const previewIndex = renderedItems.findIndex(
      (item) => item.id === draggingId,
    );

    if (previewIndex === -1) {
      return null;
    }

    return renderedItems[previewIndex + 1]?.id ?? null;
  }, [draggingId, renderedItems]);

  useEffect(() => {
    dropTargetIdRef.current = dropTargetId;
  }, [dropTargetId]);

  const updatePreviewFromPointer = useCallback(
    (clientY: number | null) => {
      if (!draggingId || !canReorderItems) {
        return;
      }

      if (typeof clientY !== "number" || Number.isNaN(clientY)) {
        return;
      }

      const pointerY = clientY;

      const entries = Array.from(itemRefs.current.entries())
        .filter(([id]) => id !== draggingId)
        .map(([id, element]) => ({ id, rect: element.getBoundingClientRect() }))
        .sort((a, b) => a.rect.top - b.rect.top);

      if (entries.length === 0) {
        commitReorderPreview(null);
        return;
      }

      const firstEntry = entries[0];
      if (pointerY < firstEntry.rect.top + firstEntry.rect.height / 2) {
        commitReorderPreview({ targetId: firstEntry.id, position: "before" });
        return;
      }

      for (let index = 0; index < entries.length - 1; index += 1) {
        const current = entries[index];
        const next = entries[index + 1];

        if (pointerY > current.rect.bottom && pointerY < next.rect.top) {
          commitReorderPreview({ targetId: next.id, position: "before" });
          return;
        }
      }

      for (const entry of entries) {
        if (pointerY >= entry.rect.top && pointerY <= entry.rect.bottom) {
          const isBefore = pointerY < entry.rect.top + entry.rect.height / 2;
          commitReorderPreview({
            targetId: entry.id,
            position: isBefore ? "before" : "after",
          });
          return;
        }
      }

      const lastEntry = entries[entries.length - 1];
      if (pointerY > lastEntry.rect.top + lastEntry.rect.height / 2) {
        commitReorderPreview({ targetId: lastEntry.id, position: "after" });
        return;
      }

      commitReorderPreview(null);
    },
    [canReorderItems, commitReorderPreview, draggingId],
  );

  useEffect(() => {
    if (!draggingId) {
      commitReorderPreview(null);
    }
  }, [draggingId, commitReorderPreview]);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>();

    itemRefs.current.forEach((element, id) => {
      if (!element) {
        return;
      }

      nextPositions.set(id, element.getBoundingClientRect());
    });

    const previousPositions = previousPositionsRef.current;

    nextPositions.forEach((rect, id) => {
      if (id === draggingId) {
        return;
      }

      const element = itemRefs.current.get(id);
      const previousRect = previousPositions.get(id);

      if (!element || !previousRect) {
        return;
      }

      const deltaX = previousRect.left - rect.left;
      const deltaY = previousRect.top - rect.top;

      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        return;
      }

      element.style.transition = "none";
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      requestAnimationFrame(() => {
        element.style.transition = "transform 200ms ease";
        element.style.transform = "";
      });

      element.addEventListener(
        "transitionend",
        () => {
          element.style.transition = "";
        },
        { once: true },
      );
    });

    previousPositionsRef.current = nextPositions;
  }, [draggingId, renderedItems]);

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
          updatePreviewFromPointer(event.clientY);
        }}
        onDrop={(event) => {
          if (!canReorderItems) {
            return;
          }

          event.preventDefault();
          const draggedItemId =
            event.dataTransfer.getData("text/plain") || draggingId;

          if (!draggedItemId) {
            setDraggingId(null);
            setDragPreview(null);
            commitReorderPreview(null);
            return;
          }

          const finalTargetId = dropTargetIdRef.current ?? null;

          onReorderItem?.(draggedItemId, finalTargetId);
          setDraggingId(null);
          setDragPreview(null);
          commitReorderPreview(null);
        }}
      >
        {hasItems ? (
          renderedItems.map((item) => {
            const isActive = item.id === activeItemId;
            const isDragging = item.id === draggingId;
            const isPreviewing = dragPreview?.id === item.id;
            const { className: itemClassName, onClick: itemOnClick, ...restItem } = item;
            const combinedClassName = itemClassName
              ? `${itemClassName} w-full max-w-[calc(100%-1rem)]`
              : "w-full max-w-[calc(100%-1rem)]";
            const shouldDim = hasItems && !isActive;
            const dragTranslation =
              isDragging && isPreviewing
                ? `translate3d(${dragPreview.translateX}px, ${dragPreview.translateY}px, 0)`
                : undefined;

            return (
              <div
                key={item.id}
                ref={(element) => {
                  if (!element) {
                    itemRefs.current.delete(item.id);
                    return;
                  }

                  itemRefs.current.set(item.id, element);
                }}
                data-library-carousel-wrapper={item.id}
                className={`relative flex snap-start justify-center ${
                  isDragging
                    ? "z-50 cursor-grabbing"
                    : canReorderItems
                      ? "cursor-grab"
                      : ""
                }`}
                style={
                  dragTranslation
                    ? {
                        transform: `${dragTranslation}`,
                        transition: "none",
                      }
                    : undefined
                }
                draggable={canReorderItems}
                onDragStart={(event) => {
                  if (!canReorderItems) {
                    return;
                  }

                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                  if (emptyDragImage) {
                    event.dataTransfer.setDragImage(emptyDragImage, 0, 0);
                  }
                  const rect = event.currentTarget.getBoundingClientRect();
                  const offsetX = event.clientX - rect.left;
                  const offsetY = event.clientY - rect.top;
                  setDraggingId(item.id);
                  commitReorderPreview(null);
                  setDragPreview({
                    id: item.id,
                    originLeft: rect.left,
                    originTop: rect.top,
                    offsetX,
                    offsetY,
                    translateX: 0,
                    translateY: 0,
                  });
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragPreview(null);
                  commitReorderPreview(null);
                }}
                onDrag={(event) => {
                  if (!canReorderItems || draggingId !== item.id) {
                    return;
                  }

                  if (event.clientX === 0 && event.clientY === 0) {
                    return;
                  }

                  setDragPreview((previous) => {
                    if (!previous || previous.id !== item.id) {
                      return previous;
                    }

                    const translateX = event.clientX - previous.originLeft - previous.offsetX;
                    const translateY = event.clientY - previous.originTop - previous.offsetY;

                    return {
                      ...previous,
                      translateX,
                      translateY,
                    };
                  });
                  updatePreviewFromPointer(event.clientY);
                }}
                onDragOver={(event) => {
                  if (!canReorderItems || draggingId === item.id) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  updatePreviewFromPointer(event.clientY);
                }}
                onDrop={(event) => {
                  if (!canReorderItems) {
                    return;
                  }

                  event.preventDefault();
                  event.stopPropagation();
                  const draggedItemId =
                    event.dataTransfer.getData("text/plain") || draggingId;

                  if (!draggedItemId) {
                    setDraggingId(null);
                    setDragPreview(null);
                    commitReorderPreview(null);
                    return;
                  }

                  if (draggedItemId === item.id) {
                    setDraggingId(null);
                    setDragPreview(null);
                    commitReorderPreview(null);
                    return;
                  }

                  const finalTargetId = dropTargetIdRef.current ?? null;

                  onReorderItem?.(draggedItemId, finalTargetId);
                  setDraggingId(null);
                  setDragPreview(null);
                  commitReorderPreview(null);
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
                      ? "scale-[1.08] opacity-90 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.55)]"
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

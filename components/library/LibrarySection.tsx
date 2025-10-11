"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibrarySectionItem extends LibraryCardProps {
  id: string;
}

interface LibrarySectionProps {
  title: string;
  subtitle?: string;
  preview: ReactNode;
  items: LibrarySectionItem[];
  selectedItemId?: string;
  onSelectItem?: (itemId: string) => void;
  onAddItem?: () => void;
  footer?: ReactNode;
  errorMessage?: string | null;
}

export function LibrarySection({
  title,
  subtitle,
  preview,
  items,
  selectedItemId,
  onSelectItem,
  onAddItem,
  footer,
  errorMessage,
}: LibrarySectionProps) {
  const [internalSelection, setInternalSelection] = useState<string | undefined>(
    () => items[0]?.id,
  );

  useEffect(() => {
    if (items.length === 0) {
      setInternalSelection(undefined);
      return;
    }

    if (!items.some((item) => item.id === internalSelection)) {
      setInternalSelection(items[0]?.id);
    }
  }, [internalSelection, items]);

  const resolvedSelectedId = selectedItemId ?? internalSelection;

  const activeIndex = useMemo(() => {
    if (!resolvedSelectedId) {
      return items.length > 0 ? 0 : -1;
    }

    return items.findIndex((item) => item.id === resolvedSelectedId);
  }, [items, resolvedSelectedId]);

  const activeItem = activeIndex >= 0 ? items[activeIndex] : items[0];

  const selectItem = (itemId: string) => {
    if (selectedItemId === undefined) {
      setInternalSelection(itemId);
    }

    onSelectItem?.(itemId);
  };

  const goToPrevious = () => {
    if (items.length <= 1) {
      return;
    }

    const nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
    const target = items[nextIndex];
    if (target) {
      selectItem(target.id);
    }
  };

  const goToNext = () => {
    if (items.length <= 1) {
      return;
    }

    const nextIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
    const target = items[nextIndex];
    if (target) {
      selectItem(target.id);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-[32px] bg-neutral-50 px-5 py-10 text-center shadow-sm sm:px-8 md:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{title}</p>
            {subtitle ? <p className="text-sm text-muted-fg">{subtitle}</p> : null}
          </header>

          <div className="w-full">{preview}</div>

          {footer ? <div className="w-full text-left text-xs text-muted-fg">{footer}</div> : null}
        </div>
      </div>

      <div className="rounded-[28px] bg-neutral-50 px-5 py-6 shadow-sm sm:px-6">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Mostra la card precedente"
            disabled={items.length <= 1}
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:flex"
          >
            <ArrowIcon direction="left" />
          </button>

          <div className="flex w-full max-w-xs flex-1 justify-center">
            {activeItem ? (
              <LibraryCard
                key={activeItem.id}
                {...activeItem}
                isActive
                onClick={(event) => {
                  selectItem(activeItem.id);
                  activeItem.onClick?.(event);
                }}
                className={`w-full max-w-xs sm:max-w-sm ${activeItem.className ?? ""}`}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Mostra la card successiva"
            disabled={items.length <= 1}
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:flex"
          >
            <ArrowIcon direction="right" />
          </button>

          {onAddItem ? (
            <button
              type="button"
              onClick={onAddItem}
              aria-label="Aggiungi nuova card"
              className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white text-lg font-semibold text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50"
            >
              <span className="-mt-[2px]">+</span>
            </button>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{errorMessage}</p>
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
      className={`h-6 w-6 transition-transform ${rotation}`}
      aria-hidden="true"
    >
      <path d="m8 4 8 8-8 8" />
    </svg>
  );
}

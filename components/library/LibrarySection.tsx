"use client";

import type { ReactNode } from "react";

import { useMemo } from "react";

import { LibraryCarousel, type LibraryCarouselItem } from "./LibraryCarousel";

interface LibrarySectionProps {
  title: string;
  subtitle?: string;
  preview: ReactNode;
  actions: LibraryCarouselItem[];
  selectedActionId?: string;
  onSelectAction?: (actionId: string) => void;
  onAddAction?: () => void;
  onRemoveAction?: (actionId: string) => void;
  footer?: ReactNode;
  errorMessage?: string | null;
}

export function LibrarySection({
  title,
  subtitle,
  preview,
  actions,
  selectedActionId,
  onSelectAction,
  onAddAction,
  onRemoveAction,
  footer,
  errorMessage,
}: LibrarySectionProps) {
  const hasActions = actions.length > 0;
  const fallbackId = hasActions ? actions[0]?.id : undefined;
  const activeActionId = selectedActionId ?? fallbackId;

  const activeIndex = useMemo(() => {
    if (!activeActionId) {
      return -1;
    }

    const explicitIndex = actions.findIndex((item) => item.id === activeActionId);
    return explicitIndex >= 0 ? explicitIndex : 0;
  }, [actions, activeActionId]);

  const canNavigate = hasActions && actions.length > 1;

  const handleNavigate = (direction: -1 | 1) => {
    if (!canNavigate) {
      return;
    }

    const baseIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = (baseIndex + direction + actions.length) % actions.length;
    const target = actions[nextIndex];

    if (target) {
      onSelectAction?.(target.id);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <div className="rounded-[40px] border border-white/60 bg-[#fafbfe] px-6 py-12 text-center shadow-[0_36px_120px_-70px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{title}</p>
            {subtitle ? <p className="text-sm text-muted-fg">{subtitle}</p> : null}
          </header>

          <div className="flex w-full flex-col items-stretch gap-10 lg:flex-row lg:items-start">
            <div className="w-full lg:flex-1">{preview}</div>

            <div className="flex w-full justify-center lg:w-auto lg:flex lg:flex-col lg:items-center lg:justify-center lg:self-stretch">
              <LibraryNavigationControls
                onSelectPrevious={() => handleNavigate(-1)}
                onSelectNext={() => handleNavigate(1)}
                disabled={!canNavigate}
              />
            </div>

            <div className="w-full lg:w-[320px] xl:w-[360px]">
              <LibraryCarousel
                items={actions}
                selectedId={selectedActionId}
                onSelectItem={onSelectAction}
                onAddItem={onAddAction}
                onRemoveItem={onRemoveAction}
              />
            </div>
          </div>

          {footer ? <div className="w-full text-left text-xs text-muted-fg">{footer}</div> : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}

interface LibraryNavigationControlsProps {
  onSelectPrevious: () => void;
  onSelectNext: () => void;
  disabled: boolean;
}

function LibraryNavigationControls({
  onSelectPrevious,
  onSelectNext,
  disabled,
}: LibraryNavigationControlsProps) {
  return (
    <div className="relative flex w-full justify-center py-4 lg:w-28 lg:py-0">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-muted/40"
      />
      <div className="pointer-events-auto relative z-10 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onSelectPrevious}
          disabled={disabled}
          aria-label="Mostra card precedente"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
        >
          <ArrowIcon direction="up" />
        </button>

        <button
          type="button"
          onClick={onSelectNext}
          disabled={disabled}
          aria-label="Mostra card successiva"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-12 sm:w-12"
        >
          <ArrowIcon direction="down" />
        </button>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  const rotation = direction === "up" ? "-rotate-90" : "rotate-90";

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

"use client";

import type { ReactNode } from "react";

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
  return (
    <div className="flex flex-col gap-12">
      <div className="rounded-[40px] border border-white/60 bg-[#f6f7fb] px-6 py-12 text-center shadow-[0_36px_120px_-70px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{title}</p>
            {subtitle ? <p className="text-sm text-muted-fg">{subtitle}</p> : null}
          </header>

          <div className="flex w-full flex-col items-stretch gap-10 lg:flex-row lg:items-start">
            <div className="w-full lg:flex-1">{preview}</div>

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

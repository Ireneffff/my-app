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
  footer,
  errorMessage,
}: LibrarySectionProps) {
  return (
    <div className="flex flex-col gap-10">
      <div className="rounded-[32px] border border-neutral-200 bg-white px-5 py-10 text-center sm:px-8 md:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{title}</p>
            {subtitle ? <p className="text-sm text-muted-fg">{subtitle}</p> : null}
          </header>

          <div className="w-full">{preview}</div>

          {footer ? <div className="w-full text-left text-xs text-muted-fg">{footer}</div> : null}
        </div>
      </div>

      <div className="rounded-[28px] border border-neutral-200 bg-white px-4 py-6">
        <LibraryCarousel
          items={actions}
          selectedId={selectedActionId}
          onSelectItem={onSelectAction}
          onAddItem={onAddAction}
        />
      </div>

      {errorMessage ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}

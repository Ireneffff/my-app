"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LibraryCarousel, type LibraryCarouselItem } from "./LibraryCarousel";

interface LibrarySectionProps {
  highlight: ReactNode;
  items: LibraryCarouselItem[];
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function LibrarySection({
  highlight,
  items,
  title,
  description,
  className,
}: LibrarySectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-12 rounded-3xl bg-neutral-50/95 px-4 py-10 text-fg shadow-sm ring-1 ring-border/50 sm:px-6 md:px-10",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        {title ? <div className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</div> : null}
        {description ? (
          <div className="max-w-2xl text-sm text-muted-fg md:text-base">{description}</div>
        ) : null}
        <div className="mt-4 flex w-full justify-center">
          <div className="w-full max-w-3xl">{highlight}</div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 px-2 text-sm text-muted-fg/90 sm:px-3">
          <span>Esplora la tua libreria visiva</span>
          <span className="hidden text-xs uppercase tracking-[0.28em] sm:inline">Scroll</span>
        </div>
        <LibraryCarousel items={items} />
      </div>
    </section>
  );
}

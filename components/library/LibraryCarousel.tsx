"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

interface LibraryCarouselProps {
  items: Array<LibraryCardProps & { id: string }>;
}

export function LibraryCarousel({ items }: LibraryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;

    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleResize = () => {
      updateScrollState();
    };

    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [items.length, updateScrollState]);

  const scrollByOffset = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const scrollAmount = container.clientWidth * 0.7;
    const left = direction === "left" ? -scrollAmount : scrollAmount;

    container.scrollBy({ left, behavior: "smooth" });
  }, []);

  const leftArrowDisabled = useMemo(() => items.length === 0 || !canScrollLeft, [canScrollLeft, items.length]);
  const rightArrowDisabled = useMemo(() => items.length === 0 || !canScrollRight, [canScrollRight, items.length]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-neutral-50 via-neutral-50/80 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-neutral-50 via-neutral-50/80 to-transparent" />

      <button
        type="button"
        onClick={() => scrollByOffset("left")}
        disabled={leftArrowDisabled}
        aria-label="Scroll library options backward"
        className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:flex"
      >
        <ArrowIcon direction="left" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-1 py-2 sm:px-4"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map(({ id, ...card }) => (
          <LibraryCard key={id} {...card} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByOffset("right")}
        disabled={rightArrowDisabled}
        aria-label="Scroll library options forward"
        className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:flex"
      >
        <ArrowIcon direction="right" />
      </button>
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

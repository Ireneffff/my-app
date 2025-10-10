"use client";

import { type SVGProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { LibraryCard, type LibraryCardProps } from "./LibraryCard";

export interface LibraryCarouselItem extends Omit<LibraryCardProps, "className"> {
  id: string;
}

interface LibraryCarouselProps {
  items: LibraryCarouselItem[];
  className?: string;
}

export function LibraryCarousel({ items, className }: LibraryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollLimits = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = node;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollLimits();

    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }

    const handleScroll = () => {
      updateScrollLimits();
    };

    node.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollLimits);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollLimits);
    };
  }, [updateScrollLimits]);

  useEffect(() => {
    updateScrollLimits();
  }, [items, updateScrollLimits]);

  const scrollByAmount = useMemo(() => 320, []);

  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const node = scrollContainerRef.current;
      if (!node) {
        return;
      }

      const delta = direction === "left" ? -scrollByAmount : scrollByAmount;
      node.scrollBy({ left: delta, behavior: "smooth" });
    },
    [scrollByAmount],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollContainerRef}
        className="scroll-smooth"
        onScroll={updateScrollLimits}
      >
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 py-1 sm:px-3">
          {items.map(({ id, ...item }) => (
            <div key={id} className="snap-start">
              <LibraryCard {...item} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={cn(
          "absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-accent",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40",
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-40",
        )}
        onClick={() => handleScroll("left")}
        aria-label="Scroll left"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </button>

      <button
        type="button"
        className={cn(
          "absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-muted-fg shadow-md transition hover:text-accent",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40",
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-40",
        )}
        onClick={() => handleScroll("right")}
        aria-label="Scroll right"
      >
        <ArrowRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

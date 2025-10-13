"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const wrapper = previewWrapperRef.current;
    if (!wrapper) {
      setPreviewHeight(null);
      return;
    }

    const findPreviewStack = () =>
      wrapper.querySelector<HTMLElement>("[data-library-preview-stack]");

    let currentTarget = findPreviewStack();

    const updateHeight = () => {
      const target = currentTarget ?? findPreviewStack();
      if (!target) {
        setPreviewHeight(null);
        return;
      }

      const { height } = target.getBoundingClientRect();
      setPreviewHeight((previousHeight) =>
        Math.abs((previousHeight ?? 0) - height) < 0.5 ? previousHeight : height,
      );
    };

    updateHeight();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });

      if (currentTarget) {
        resizeObserver.observe(currentTarget);
      }
    }

    const mutationObserver = new MutationObserver(() => {
      const nextTarget = findPreviewStack();
      if (nextTarget && nextTarget !== currentTarget) {
        if (resizeObserver && currentTarget) {
          resizeObserver.unobserve(currentTarget);
        }
        currentTarget = nextTarget;
        if (resizeObserver) {
          resizeObserver.observe(nextTarget);
        }
      } else if (!nextTarget && currentTarget && resizeObserver) {
        resizeObserver.unobserve(currentTarget);
        currentTarget = null;
      } else if (!nextTarget) {
        currentTarget = null;
      }

      updateHeight();
    });

    mutationObserver.observe(wrapper, { childList: true, subtree: true });

    const handleWindowResize = () => updateHeight();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      mutationObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [actions.length, selectedActionId]);

  const carouselInsetTop = 16;
  const carouselInsetBottom = 10;

  const carouselHeightStyle = previewHeight
    ? {
        height: `${previewHeight + carouselInsetTop + carouselInsetBottom}px`,
        maxHeight: `${previewHeight + carouselInsetTop + carouselInsetBottom}px`,
        minHeight: `${previewHeight + carouselInsetTop + carouselInsetBottom}px`,
        paddingTop: `${carouselInsetTop}px`,
        paddingBottom: `${carouselInsetBottom}px`,
        marginTop: `-${carouselInsetTop}px`,
        marginBottom: `-${carouselInsetBottom}px`,
      }
    : undefined;

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
      <div className="w-full rounded-[40px] border border-[#E6E6E6] bg-white px-6 py-12 text-center shadow-[0_32px_80px_-60px_rgba(15,23,42,0.25)]">
        <div className="flex w-full flex-col items-center gap-10 lg:items-stretch">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{title}</p>
            {subtitle ? <p className="text-sm text-muted-fg">{subtitle}</p> : null}
          </header>

          <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,7.1fr)_minmax(0,2.2fr)] lg:items-start xl:gap-6">
            <div ref={previewWrapperRef} className="w-full">{preview}</div>

            <div className="flex w-full flex-col items-stretch gap-4 lg:h-full lg:flex-row lg:items-stretch lg:justify-end lg:gap-3">
              <div
                className="w-full min-w-0 lg:h-full lg:max-w-[344px]"
                style={carouselHeightStyle}
              >
                <LibraryCarousel
                  items={actions}
                  selectedId={selectedActionId}
                  onSelectItem={onSelectAction}
                  onAddItem={onAddAction}
                  onRemoveItem={onRemoveAction}
                />
              </div>

              <LibraryNavigationControls
                onSelectPrevious={() => handleNavigate(-1)}
                onSelectNext={() => handleNavigate(1)}
                disabled={!canNavigate}
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
    <div className="flex justify-center lg:h-full">
      <div className="flex h-full items-center justify-center">
        <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-full border border-[#E6E6E6] bg-white px-2 py-3 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.25)]">
          <button
            type="button"
            onClick={onSelectPrevious}
            disabled={disabled}
            aria-label="Mostra card precedente"
            className="flex h-9 w-9 items-center justify-center text-[#666666] transition hover:text-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="up" />
          </button>
          <button
            type="button"
            onClick={onSelectNext}
            disabled={disabled}
            aria-label="Mostra card successiva"
            className="flex h-9 w-9 items-center justify-center text-[#666666] transition hover:text-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:w-10"
          >
            <ArrowIcon direction="down" />
          </button>
        </div>
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

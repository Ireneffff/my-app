"use client";

import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { LibraryCarousel, type LibraryCarouselItem } from "./LibraryCarousel";

interface LibrarySectionProps {
  title?: string;
  subtitle?: string;
  preview: ReactNode;
  actions: LibraryCarouselItem[];
  selectedActionId?: string;
  onSelectAction?: (actionId: string) => void;
  onAddAction?: () => void;
  onRemoveAction?: (actionId: string) => void;
  footer?: ReactNode;
  errorMessage?: string | null;
  notes?: ReactNode;
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
  notes,
}: LibrarySectionProps) {
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

    const findPreviewImage = () =>
      wrapper.querySelector<HTMLElement>("[data-library-preview-image]");

    let currentTarget = findPreviewImage();

    const updateHeight = () => {
      const target = currentTarget ?? findPreviewImage();
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
      const nextTarget = findPreviewImage();
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

  const carouselHeightStyle = previewHeight
    ? {
        height: `${previewHeight}px`,
        maxHeight: `${previewHeight}px`,
        minHeight: `${previewHeight}px`,
      }
    : undefined;

  const titleText = title?.trim() ?? "";
  const subtitleText = subtitle?.trim() ?? "";
  const shouldRenderHeader = titleText.length > 0 || subtitleText.length > 0;

  return (
    <div className="flex w-full flex-col gap-12">
      <div className="w-full max-w-[1600px] mx-auto rounded-[40px] border border-[#E6E6E6] bg-white px-6 py-12 text-center shadow-[0_32px_80px_-60px_rgba(15,23,42,0.25)]">
        <div className="flex w-full flex-col items-center gap-10 lg:items-stretch">
          {shouldRenderHeader ? (
            <header className="space-y-1">
              {titleText ? (
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{titleText}</p>
              ) : null}
              {subtitleText ? <p className="text-sm text-muted-fg">{subtitleText}</p> : null}
            </header>
          ) : null}

          <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_344px] lg:grid-rows-[minmax(0,1fr)_auto] lg:items-start xl:gap-6">
            <div ref={previewWrapperRef} className="w-full lg:row-span-2">
              {preview}
            </div>

            <div
              className="box-border flex w-full min-w-0 flex-col lg:row-span-2 lg:h-full"
              style={carouselHeightStyle}
            >
              <div className="flex-1 min-h-0">
                <LibraryCarousel
                  items={actions}
                  selectedId={selectedActionId}
                  onSelectItem={onSelectAction}
                  onAddItem={onAddAction}
                  onRemoveItem={onRemoveAction}
                />
              </div>

              {notes ? <div className="mt-4 w-full">{notes}</div> : null}
            </div>
          </div>

          {footer ? <div className="w-full text-left text-xs text-muted-fg">{footer}</div> : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <p className="w-full rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
            {errorMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}


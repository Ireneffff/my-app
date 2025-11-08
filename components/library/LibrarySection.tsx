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
  onMoveAction?: (actionId: string, direction: "up" | "down") => void;
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
  onMoveAction,
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
    <div className="mx-auto w-full max-w-5xl space-y-6 sm:max-w-6xl sm:space-y-8 lg:max-w-[90rem] xl:max-w-[100rem] 2xl:max-w-[110rem]">
      <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
        <div className="flex w-full flex-col gap-8">
          {shouldRenderHeader ? (
            <header className="space-y-1 text-center lg:text-left">
              {titleText ? (
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-fg">{titleText}</p>
              ) : null}
              {subtitleText ? <p className="text-sm text-muted-fg">{subtitleText}</p> : null}
            </header>
          ) : null}

          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,2.8fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:items-start xl:grid-cols-[minmax(0,8.6fr)_minmax(0,3.4fr)]">
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
                  onMoveItem={onMoveAction}
                />
              </div>

              {notes ? <div className="mt-4 w-full">{notes}</div> : null}
            </div>
          </div>

          {footer ? <div className="w-full text-left text-xs text-muted-fg">{footer}</div> : null}
        </div>
      </div>

      {errorMessage ? (
        <p className="mx-auto w-full max-w-5xl rounded-2xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600 sm:max-w-6xl lg:max-w-[90rem] xl:max-w-[100rem] 2xl:max-w-[110rem]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}


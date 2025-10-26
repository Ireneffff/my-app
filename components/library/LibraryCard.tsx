"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface LibraryCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  label: string;
  visual: ReactNode;
  disabled?: boolean;
  isActive?: boolean;
  isDimmed?: boolean;
  visualWrapperClassName?: string;
  hideLabel?: boolean;
}

export function LibraryCard({
  label,
  visual,
  disabled = false,
  isActive = false,
  isDimmed = false,
  visualWrapperClassName,
  hideLabel = false,
  className = "",
  ...buttonProps
}: LibraryCardProps) {
  const baseVisualWrapperClassName =
    "relative aspect-[4/3] w-full flex-none overflow-hidden rounded-xl bg-white p-4 shadow-[0_16px_48px_-36px_rgba(15,23,42,0.35)] transition-colors duration-300 flex items-center justify-center [&>img]:h-full [&>img]:w-full [&>img]:object-cover";
  const resolvedVisualWrapperClassName = visualWrapperClassName
    ? `${baseVisualWrapperClassName} ${visualWrapperClassName}`
    : baseVisualWrapperClassName;

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled}
      aria-pressed={isActive}
      data-active={isActive ? "true" : "false"}
      className={`group relative flex w-full min-w-[200px] flex-col items-stretch gap-4 rounded-2xl border border-[#E6E6E6] bg-[#F7F7F7] p-4 text-center text-xs font-semibold text-fg shadow-[0_20px_50px_-35px_rgba(15,23,42,0.25)] transition-all duration-300 ease-out focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 sm:min-w-[220px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.05] bg-white shadow-[0_28px_64px_-36px_rgba(15,23,42,0.35)]"
          : "hover:scale-[1.02]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.94] opacity-70 filter brightness-95 saturate-75 hover:opacity-95 hover:brightness-100 hover:saturate-100"
          : ""
      } ${className}`}
    >
      <div className={resolvedVisualWrapperClassName}>{visual}</div>
      {!hideLabel ? (
        <span className="mt-auto pt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg transition-colors group-hover:text-fg">
          {label}
        </span>
      ) : null}
    </button>
  );
}

export type { LibraryCardProps };

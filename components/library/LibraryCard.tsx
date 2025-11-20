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
    "flex items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white/80 shadow-[0_18px_36px_-26px_rgba(15,23,42,0.3)] transition-colors duration-300";
  const resolvedVisualWrapperClassName = visualWrapperClassName
    ? `${baseVisualWrapperClassName} ${visualWrapperClassName}`
    : `${baseVisualWrapperClassName} h-32 w-full bg-white/70`;

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled}
      aria-pressed={isActive}
      data-active={isActive ? "true" : "false"}
      className={`group relative flex min-w-[160px] flex-col items-center gap-4 rounded-2xl border border-white/60 bg-white/80 p-4 text-center text-xs font-semibold text-fg shadow-[0_28px_70px_-40px_rgba(15,23,42,0.32)] transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 sm:min-w-[180px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.04] bg-white shadow-[0_32px_82px_-44px_rgba(15,23,42,0.42)] ring-1 ring-black/5"
          : "hover:scale-[1.02] hover:shadow-[0_26px_74px_-48px_rgba(15,23,42,0.28)]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.94] opacity-75 filter brightness-95 saturate-80 hover:opacity-95 hover:brightness-100 hover:saturate-100"
          : ""
      } ${className}`}
    >
      {!hideLabel ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg transition-colors group-hover:text-fg">
          {label}
        </span>
      ) : null}
      <div className={resolvedVisualWrapperClassName}>
        {visual}
      </div>
    </button>
  );
}

export type { LibraryCardProps };

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
    "flex items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-white via-white to-[#f5f7fb] ring-1 ring-black/5 transition-all duration-400";
  const resolvedVisualWrapperClassName = visualWrapperClassName
    ? `${baseVisualWrapperClassName} ${visualWrapperClassName}`
    : `${baseVisualWrapperClassName} h-32 w-full`;

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled}
      aria-pressed={isActive}
      data-active={isActive ? "true" : "false"}
      className={`group relative flex min-w-[160px] flex-col items-center gap-3.5 rounded-sm border border-[color:rgb(148_163_184/0.58)] bg-gradient-to-b from-white via-white to-[rgb(var(--subtle))] px-4 pb-4 pt-4 text-center text-xs font-semibold text-fg shadow-[0_18px_48px_-28px_rgba(15,23,42,0.28)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 sm:min-w-[180px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.04] bg-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.32)]"
          : "hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-36px_rgba(15,23,42,0.26)] hover:brightness-105"
      } ${
        isDimmed && !isActive
          ? "scale-[0.95] opacity-75 saturate-80 transition-none"
          : ""
      } ${className}`}
    >
      {!hideLabel ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg transition-colors duration-300 group-hover:text-fg">
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

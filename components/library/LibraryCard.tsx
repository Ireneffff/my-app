"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface LibraryCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  label: string;
  visual: ReactNode;
  disabled?: boolean;
  isActive?: boolean;
  isDimmed?: boolean;
}

export function LibraryCard({
  label,
  visual,
  disabled = false,
  isActive = false,
  isDimmed = false,
  className = "",
  ...buttonProps
}: LibraryCardProps) {
  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled}
      aria-pressed={isActive}
      data-active={isActive ? "true" : "false"}
      className={`group relative flex min-w-[140px] flex-col items-center gap-2 rounded-xl bg-white/80 p-2.5 text-center text-sm font-medium text-fg shadow-md transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 sm:min-w-[160px] transform-gpu will-change-transform ${
        isActive
          ? "z-10 scale-[1.05] bg-white opacity-100 filter-none shadow-xl"
          : "hover:scale-[1.02]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.95] opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
          : ""
      } ${className}`}
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-white/90 shadow-inner">
        {visual}
      </div>
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-muted-fg group-hover:text-fg">
        {label}
      </span>
    </button>
  );
}

export type { LibraryCardProps };

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
      className={`group relative flex min-w-[160px] flex-col items-center gap-4 rounded-[26px] border border-[#E6E6E6] bg-[#F7F7F7] p-4 text-center text-xs font-semibold text-fg shadow-[0_20px_50px_-35px_rgba(15,23,42,0.25)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 sm:min-w-[180px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.05] bg-white shadow-[0_28px_64px_-36px_rgba(15,23,42,0.35)]"
          : "hover:scale-[1.02]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.94] opacity-70 filter brightness-95 saturate-75 hover:opacity-95 hover:brightness-100 hover:saturate-100"
          : ""
      } ${className}`}
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-inner">
        {visual}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg transition-colors group-hover:text-fg">
        {label}
      </span>
    </button>
  );
}

export type { LibraryCardProps };

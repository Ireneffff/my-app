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
      className={`group relative flex min-w-[220px] flex-col items-center gap-5 rounded-[30px] border border-white/60 bg-white/90 p-5 text-center text-sm font-medium text-fg shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 sm:min-w-[240px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.08] bg-white shadow-[0_32px_90px_-40px_rgba(15,23,42,0.55)]"
          : "hover:scale-[1.02]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.94] opacity-70 filter brightness-95 saturate-75 hover:opacity-95 hover:brightness-100 hover:saturate-100"
          : ""
      } ${className}`}
    >
      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-[24px] bg-neutral-50/90 shadow-inner">
        {visual}
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-fg transition-colors group-hover:text-fg">
        {label}
      </span>
    </button>
  );
}

export type { LibraryCardProps };

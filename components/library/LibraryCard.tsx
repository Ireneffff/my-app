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
    "flex items-center justify-center overflow-hidden rounded-xl bg-white/80 ring-1 ring-[color:rgb(var(--border))] shadow-[0_16px_42px_-34px_rgba(15,23,42,0.35)] transition-all duration-300";
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
      className={`group relative flex min-w-[160px] flex-col items-center gap-3 rounded-xl border border-[color:rgb(var(--border))] bg-white/85 p-4 text-center text-xs font-semibold text-fg shadow-[0_22px_62px_-40px_rgba(15,23,42,0.32)] backdrop-blur-sm transition-all duration-[420ms] ease-[var(--easing-standard)] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgb(var(--accent)/0.32)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 sm:min-w-[180px] transform-gpu will-change-transform ${
        isActive
          ? "z-30 scale-[1.04] bg-white shadow-[0_30px_72px_-38px_rgba(15,23,42,0.42)] ring-1 ring-[color:rgb(var(--accent)/0.18)]"
          : "hover:scale-[1.02] hover:shadow-[0_26px_70px_-44px_rgba(15,23,42,0.4)]"
      } ${
        isDimmed && !isActive
          ? "scale-[0.96] opacity-80 blur-[0.2px] saturate-[0.9]"
          : ""
      } ${className}`}
    >
      {!hideLabel ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-fg transition-colors duration-300 group-hover:text-fg">
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

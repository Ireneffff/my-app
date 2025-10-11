"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface LibraryCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  label: string;
  visual: ReactNode;
  disabled?: boolean;
  isActive?: boolean;
}

export function LibraryCard({
  label,
  visual,
  disabled = false,
  isActive = false,
  className = "",
  ...buttonProps
}: LibraryCardProps) {
  const hoverClasses = isActive ? "shadow-lg" : "hover:-translate-y-1 hover:shadow-lg";
  const activeClasses = isActive
    ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-neutral-100 bg-white"
    : "bg-white/70";

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled}
      aria-pressed={isActive}
      data-active={isActive ? "true" : undefined}
      className={`group flex min-w-[200px] flex-col items-center gap-4 rounded-2xl p-5 text-center text-sm font-medium text-fg shadow-md transition-transform duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 sm:min-w-[220px] ${hoverClasses} ${activeClasses} ${className}`}
    >
      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-white/90 shadow-inner transition-all duration-300 ease-out group-data-[active=true]:scale-[1.02] group-data-[active=true]:shadow-md">
        {visual}
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg group-hover:text-fg group-data-[active=true]:text-fg">
        {label}
      </span>
    </button>
  );
}

export type { LibraryCardProps };

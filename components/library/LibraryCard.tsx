"use client";

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface LibraryCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  description?: string;
  icon: ReactNode;
  active?: boolean;
}

export const LibraryCard = forwardRef<HTMLButtonElement, LibraryCardProps>(
  ({ title, description, icon, active = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "group flex min-h-[220px] min-w-[220px] max-w-[280px] flex-col justify-between rounded-2xl bg-white/90 p-5 text-left shadow-md transition duration-200 ease-out",
          "hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40",
          "disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none",
          "md:min-w-[260px]",
          active ? "ring-2 ring-accent/40" : "ring-1 ring-transparent",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent transition duration-200 group-hover:bg-accent/20"
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-1">
          <span className="text-base font-semibold text-fg">{title}</span>
          {description ? (
            <span className="text-sm text-muted-fg/80">{description}</span>
          ) : null}
        </div>
      </button>
    );
  },
);

LibraryCard.displayName = "LibraryCard";

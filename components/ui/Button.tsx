"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary:
    "border border-transparent bg-accent text-white shadow-[0_14px_30px_rgba(0,122,255,0.25)] hover:shadow-[0_18px_40px_rgba(0,122,255,0.3)]",
  secondary: "border border-border bg-surface text-fg hover:bg-subtle",
  ghost: "border border-transparent bg-transparent text-muted-fg hover:bg-subtle hover:text-fg",
};
const sizes: Record<Size, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-5 py-2 text-base",
  lg: "px-6 py-2.5 text-lg",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
};

export default function Button({
  className = "",
  variant = "secondary",
  size = "md",
  leftIcon,
  children,
  ...props
}: ButtonProps) {
  const cls = [base, variants[variant], sizes[size], className].join(" ").trim();
  return (
    <button className={cls} {...props}>
      {leftIcon ? <span className="mr-2">{leftIcon}</span> : null}
      {children}
    </button>
  );
}
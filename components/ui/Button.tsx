"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary:
    "border border-transparent bg-accent text-white shadow-[0_14px_30px_rgba(0,122,255,0.25)] hover:shadow-[0_18px_40px_rgba(0,122,255,0.3)]",
  secondary:
    "border border-border bg-surface text-fg shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-subtle hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]",
  ghost:
    "border border-transparent bg-transparent text-muted-fg shadow-[0_10px_20px_rgba(15,23,42,0.05)] hover:bg-subtle hover:text-fg hover:shadow-[0_18px_32px_rgba(15,23,42,0.12)]",
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
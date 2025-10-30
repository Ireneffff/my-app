"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))] active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:translate-y-0 disabled:scale-100 disabled:pointer-events-none motion-reduce:transition-none";
const variants: Record<Variant, string> = {
  primary:
    "border border-transparent bg-[color:rgb(var(--accent))] text-white shadow-[0_20px_45px_rgba(0,122,255,0.35)] hover:brightness-[1.04] hover:shadow-[0_26px_52px_rgba(0,122,255,0.4)] active:shadow-[0_18px_36px_rgba(0,122,255,0.32)]",
  secondary:
    "border border-border bg-[color:rgb(var(--surface)/0.92)] text-fg shadow-[0_16px_36px_rgba(15,23,42,0.1)] hover:bg-[color:rgb(var(--surface))] hover:shadow-[0_24px_52px_rgba(15,23,42,0.16)]",
  ghost:
    "border border-transparent bg-transparent text-muted-fg shadow-none hover:border-border hover:bg-[color:rgb(var(--surface)/0.7)] hover:text-fg hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)]",
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
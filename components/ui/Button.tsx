"use client";
import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-xl font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:opacity-90 border border-transparent",
  secondary: "border border-border bg-bg hover:bg-subtle",
  ghost: "hover:bg-subtle border border-transparent",
};
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
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
import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", ...props }: CardProps) {
  // Perché: contenitore con bordo/ombra coerenti
  const cls =
    "mx-auto w-full rounded-2xl border border-border bg-bg p-6 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.2)] " +
    className;
  return <div className={cls} {...props} />;
}
import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export default function Card({ className = "", ...props }: CardProps) {
  const cls = ["mx-auto w-full surface-panel--compact p-6", className].join(" ").trim();
  return <div className={cls} {...props} />;
}
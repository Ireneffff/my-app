"use client";

import { useEffect, useState } from "react";

// Perché: salva preferenza e evita flicker alla prima render
const getInitial = () => {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("theme:dark");
  if (saved !== null) return saved === "1";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme:dark", dark ? "1" : "0");
  }, [dark]);

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setDark((v) => !v)}
      className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2 text-muted-fg shadow-[0_14px_36px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:text-fg hover:shadow-[0_20px_40px_rgba(15,23,42,0.16)]"
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-full border border-border"
        style={{ borderColor: dark ? "transparent" : "rgb(var(--accent) / 0.4)" }}
      >
        {/* sun */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 14.32l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 12H1v0h3v0zm19 0h-3v0h3v0zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zM19.16 6.76l1.41-1.41-1.79-1.8-1.41 1.41 1.79 1.8zM12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      </span>
      <span
        className="grid h-6 w-6 place-items-center rounded-full border border-border"
        style={{ borderColor: dark ? "rgb(var(--accent) / 0.4)" : "transparent" }}
      >
        {/* moon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M21.75 15.5A9.75 9.75 0 1111 2.25a8 8 0 1010.75 13.25z" />
        </svg>
      </span>
    </button>
  );
}
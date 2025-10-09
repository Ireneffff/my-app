"use client";
type Props = { onHome: () => void; onAdd: () => void };

export default function BottomNav({ onHome, onAdd }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-screen-sm px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto relative flex items-center justify-center gap-6 rounded-3xl border border-border bg-surface px-6 py-4 shadow-[0_-18px_40px_rgba(15,23,42,0.08)] backdrop-blur">
        {/* Home */}
        <button
          aria-label="Home"
          onClick={onHome}
          className="absolute left-6 grid h-10 w-10 place-items-center rounded-full border border-transparent text-muted-fg transition hover:border-border hover:bg-subtle hover:text-fg"
        >
          <HomeIcon className="h-5 w-5" />
        </button>

        {/* FAB */}
        <button
          aria-label="Add"
          onClick={onAdd}
          className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface text-fg shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.18)]"
        >
          <span className="text-2xl leading-none">+</span>
        </button>
      </div>
    </div>
  );
}

function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path strokeWidth="1.5" d="M3 10.5 12 3l9 7.5" />
      <path strokeWidth="1.5" d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
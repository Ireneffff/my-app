"use client";
type Props = { onHome: () => void; onAdd: () => void };

export default function BottomNav({ onHome, onAdd }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-screen-sm px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto relative flex items-center justify-center rounded-t-2xl border border-border bg-bg/95 px-6 py-4 shadow-[0_-10px_25px_-10px_rgba(0,0,0,0.2)] backdrop-blur">
        {/* Home */}
        <button
          aria-label="Home"
          onClick={onHome}
          className="absolute left-6 grid h-10 w-10 place-items-center rounded-full hover:bg-subtle"
        >
          <HomeIcon className="h-6 w-6 opacity-70" />
        </button>

        {/* FAB */}
        <button
          aria-label="Add"
          onClick={onAdd}
          className="grid h-14 w-14 place-items-center rounded-full border border-border bg-bg shadow-xl"
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
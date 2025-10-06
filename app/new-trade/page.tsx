"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SymbolOption = {
  code: string;
  flag: string;
};

const availableSymbols: SymbolOption[] = [
  { code: "EURUSD", flag: "🇪🇺🇺🇸" },
  { code: "GBPUSD", flag: "🇬🇧🇺🇸" },
  { code: "EURGBP", flag: "🇪🇺🇬🇧" },
  { code: "EURCAD", flag: "🇪🇺🇨🇦" },
  { code: "USDCAD", flag: "🇺🇸🇨🇦" },
  { code: "AUDUSD", flag: "🇦🇺🇺🇸" },
];

export default function NewTradePage() {
  const router = useRouter();
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const currentWeekDays = useMemo(() => {
    const baseDate = new Date(today);
    const baseDay = baseDate.getDay();
    const diffFromMonday = (baseDay + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - diffFromMonday);

    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [today]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
    const initialDate = currentWeekDays.at(dayIndex) ?? currentWeekDays[0] ?? today;
    return new Date(initialDate);
  });

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[0]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);

  const dayOfWeekLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
      }),
    [selectedDate]
  );

  const handleSelectSymbol = (symbol: SymbolOption) => {
    setSelectedSymbol(symbol);
    setIsSymbolListOpen(false);
  };

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-6 py-10 text-fg">
      <button
        type="button"
        className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-white/70 text-lg font-semibold text-muted-fg shadow-sm transition hover:scale-105 hover:text-fg"
        onClick={() => {
          router.back();
        }}
        aria-label="Close"
      >
        ×
      </button>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-12 text-center">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-black tracking-tight text-fg drop-shadow-sm md:text-5xl">
            Register a Trade
          </h1>
        </header>

        <div className="flex flex-col items-center gap-8">
          <nav className="flex items-center gap-3 rounded-full border border-border/60 bg-white/60 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur">
            {[
              { label: "Main data", isActive: true },
              { label: "Performance", isActive: false },
              { label: "Mindset", isActive: false },
            ].map(({ label, isActive }) => (
              <button
                key={label}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-accent text-white shadow"
                    : "text-muted-fg hover:text-fg"
                }`}
                aria-pressed={isActive}
                disabled={!isActive}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="w-full rounded-[2.5rem] border border-border/60 bg-white/80 px-4 py-8 shadow-lg shadow-black/10 backdrop-blur">
            <div className="mx-auto flex max-w-xl items-center gap-2 overflow-x-auto rounded-full bg-transparent px-2 py-1">
              {currentWeekDays.map((date) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const dayNumber = date.getDate();
                const monthLabel = date
                  .toLocaleDateString(undefined, {
                    month: "short",
                  })
                  .toUpperCase();

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(new Date(date))}
                    className={`flex min-w-[66px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition md:min-w-[88px] md:text-sm ${
                      isSelected
                        ? "bg-accent text-white shadow"
                        : "text-muted-fg hover:text-fg"
                    }`}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-black" : "font-bold"}`}>
                      {dayNumber}
                    </span>
                    <span className="text-[10px] tracking-[0.3em] md:text-xs">
                      {monthLabel}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                className="ml-auto flex h-14 w-14 flex-none items-center justify-center rounded-full border border-border/70 bg-white text-muted-fg shadow-sm transition hover:text-fg"
                onClick={() => {
                  const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
                  const targetDate = currentWeekDays.at(dayIndex) ?? currentWeekDays[0] ?? today;
                  setSelectedDate(new Date(targetDate));
                }}
                aria-label="Select today"
                title="Select today"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="16" r="1.5" />
                </svg>
              </button>
            </div>

            <p className="mt-6 text-sm font-medium text-muted-fg md:text-base">
              Day of the week: <span className="font-semibold capitalize text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full rounded-[2.5rem] border border-border/60 bg-white/80 px-6 py-8 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col items-start gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</span>
                <button
                  type="button"
                  onClick={() => setIsSymbolListOpen((prev) => !prev)}
                  className="flex items-center gap-4 rounded-full border border-border/60 bg-white/70 px-6 py-4 text-left shadow-sm transition hover:shadow md:min-w-[220px]"
                  aria-haspopup="listbox"
                  aria-expanded={isSymbolListOpen}
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold tracking-[0.2em] text-muted-fg">{selectedSymbol.code}</span>
                    <span className="text-sm text-muted-fg">Tap to choose</span>
                  </div>
                  <span className="ml-auto text-4xl leading-none" aria-hidden="true">
                    {selectedSymbol.flag}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-5 w-5 text-muted-fg transition-transform ${isSymbolListOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div
                className={`grid w-full transition-[grid-template-rows] duration-300 ease-out md:w-auto ${
                  isSymbolListOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex flex-col gap-2 rounded-3xl border border-border/50 bg-white/70 p-2 shadow-inner shadow-black/5"
                    role="listbox"
                    aria-activedescendant={`symbol-${selectedSymbol.code}`}
                  >
                    {availableSymbols.map((symbol) => {
                      const isActive = symbol.code === selectedSymbol.code;

                      return (
                        <button
                          key={symbol.code}
                          id={`symbol-${symbol.code}`}
                          type="button"
                          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "bg-accent text-white shadow"
                              : "bg-transparent text-fg hover:bg-muted/40"
                          }`}
                          onClick={() => handleSelectSymbol(symbol)}
                          aria-selected={isActive}
                          role="option"
                        >
                          <span className="tracking-[0.2em]">{symbol.code}</span>
                          <span className="text-2xl" aria-hidden="true">
                            {symbol.flag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
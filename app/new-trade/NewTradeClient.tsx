"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import {
  appendStoredTrade,
  findStoredTrade,
  type StoredTrade,
  type SymbolOption,
  updateStoredTrade,
} from "@/lib/tradesStorage";
import { SYMBOL_OPTIONS } from "@/lib/symbols";

const availableSymbols: SymbolOption[] = SYMBOL_OPTIONS;

function getWeekDays(baseDate: Date) {
  const reference = new Date(baseDate);
  reference.setHours(0, 0, 0, 0);
  const diffFromMonday = (reference.getDay() + 6) % 7;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - diffFromMonday);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export default function NewTradeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [weekReference, setWeekReference] = useState<Date>(() => today);
  const currentWeekDays = useMemo(() => getWeekDays(weekReference), [weekReference]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const initialWeek = getWeekDays(today);
    const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
    const initialDate = initialWeek.at(dayIndex) ?? initialWeek[0] ?? today;
    return new Date(initialDate);
  });

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[2]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingTrade, setExistingTrade] = useState<StoredTrade | null>(null);
  const [isEditing, setIsEditing] = useState(() => !searchParams.get("tradeId"));

  const tradeId = searchParams.get("tradeId");

  useEffect(() => {
    if (!tradeId) {
      setExistingTrade(null);
      setIsEditing(true);
      setWeekReference(today);
      return;
    }

    const storedTrade = findStoredTrade(tradeId);
    if (storedTrade) {
      const storedDate = new Date(storedTrade.date);
      if (!Number.isNaN(storedDate.getTime())) {
        storedDate.setHours(0, 0, 0, 0);
        setWeekReference(storedDate);
        setSelectedDate(new Date(storedDate));
      }
      setSelectedSymbol(storedTrade.symbol);
      setExistingTrade(storedTrade);
      setIsEditing(false);
    } else {
      setExistingTrade(null);
      setIsEditing(true);
      setWeekReference(today);
    }
  }, [tradeId, today]);

  const dayOfWeekLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
      }),
    [selectedDate]
  );

  const handleSelectSymbol = (symbol: SymbolOption) => {
    setSelectedSymbol(symbol);
  };

  const handleSaveTrade = () => {
    if (isSaving) return;
    setIsSaving(true);

    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    if (existingTrade) {
      updateStoredTrade(existingTrade.id, {
        date: normalizedDate.toISOString(),
        symbol: selectedSymbol,
      });
    } else {
      const trade: StoredTrade = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Date.now().toString(),
        date: normalizedDate.toISOString(),
        symbol: selectedSymbol,
      };

      appendStoredTrade(trade);
    }

    router.push("/");
    setIsSaving(false);
  };

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-6 py-10 text-fg">
      <div className="absolute right-6 top-6 flex flex-col items-end gap-3">
        {existingTrade ? (
          <button
            type="button"
            onClick={() => {
              setIsEditing((prev) => {
                if (prev && existingTrade) {
                  const storedDate = new Date(existingTrade.date);
                  if (!Number.isNaN(storedDate.getTime())) {
                    storedDate.setHours(0, 0, 0, 0);
                    setWeekReference(storedDate);
                    setSelectedDate(new Date(storedDate));
                  }
                  setSelectedSymbol(existingTrade.symbol);
                }
                return !prev;
              });
            }}
            className="flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm font-semibold text-muted-fg shadow-sm transition hover:border-border hover:text-fg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 3 21l.5-4.5Z" />
            </svg>
            {isEditing ? "Cancel" : "Edit"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-4 py-2 text-sm font-semibold text-muted-fg shadow-sm transition hover:border-border hover:text-fg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6 15 0 9m0 0 6-6M0 9h18" />
          </svg>
          Home
        </button>
      </div>

      <header className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 pt-10 text-center">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-white/70 text-[0.7rem]">
            04
          </span>
          Journal Entry
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">Trade new positions</h1>
          <p className="max-w-2xl text-balance text-base text-muted-fg sm:text-lg">
            Select the day, choose your symbol, and jot down the key details for your next move.
          </p>
        </div>

        <nav className="flex w-full max-w-xl items-center justify-center gap-2 rounded-full border border-white/70 bg-white/50 p-1 shadow-sm">
          {[
            { label: "Overview", href: "#" },
            { label: "History", href: "#" },
            { label: "Insights", href: "#" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-fg transition hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto mt-12 flex w-full max-w-4xl flex-col gap-8">
        <section className="rounded-3xl border border-border/70 bg-white/80 p-6 shadow-xl shadow-black/5">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Select day</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Current trading week</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const previousWeekStart = new Date(weekReference);
                  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
                  setWeekReference(previousWeekStart);
                  setSelectedDate(getWeekDays(previousWeekStart)[0]);
                }}
                className="rounded-full border border-border/70 bg-white/80 p-2 text-muted-fg shadow-sm transition hover:border-border hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                aria-label="Previous week"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWeekReference(today);
                  const currentWeek = getWeekDays(today);
                  const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
                  const currentDate = currentWeek.at(dayIndex) ?? currentWeek[0] ?? today;
                  setSelectedDate(new Date(currentDate));
                }}
                className="rounded-full border border-border/70 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextWeekStart = new Date(weekReference);
                  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
                  setWeekReference(nextWeekStart);
                  setSelectedDate(getWeekDays(nextWeekStart)[0]);
                }}
                className="rounded-full border border-border/70 bg-white/80 p-2 text-muted-fg shadow-sm transition hover:border-border hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                aria-label="Next week"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-5 gap-3">
            {currentWeekDays.map((date) => {
              const isActive = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === today.toDateString();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(new Date(date));
                  }}
                  className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600 shadow"
                      : "border-border/70 bg-white/70 text-muted-fg hover:border-border hover:text-fg"
                  }`}
                  aria-pressed={isActive}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="text-2xl font-semibold">{date.getDate()}</span>
                  {isToday ? (
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                      Today
                    </span>
                  ) : (
                    <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-fg/70">
                      Weekday
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-white/80 p-6 shadow-xl shadow-black/5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Choose your pair</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsSymbolListOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-white/70 px-4 py-2 text-sm font-semibold text-muted-fg shadow-sm transition hover:border-border hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {isSymbolListOpen ? "Hide symbols" : "Show symbols"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform ${isSymbolListOpen ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </header>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm font-semibold text-indigo-600">
              <span className="flex items-center gap-3">
                <span className="text-xl" aria-hidden="true">
                  {selectedSymbol.flag}
                </span>
                {selectedSymbol.code}
              </span>
              <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">
                Selected
              </span>
            </div>

            {isSymbolListOpen ? (
              <div
                role="listbox"
                aria-label="Available symbols"
                className="grid gap-3 sm:grid-cols-2"
              >
                {availableSymbols.map((symbol) => {
                  const isActive = symbol.code === selectedSymbol.code;
                  return (
                    <button
                      key={symbol.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelectSymbol(symbol)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                        isActive
                          ? "border-indigo-300 bg-indigo-50 text-indigo-600 shadow"
                          : "border-border/70 bg-white/70 text-muted-fg hover:border-border hover:text-fg"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden="true">
                          {symbol.flag}
                        </span>
                        {symbol.code}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`}
                        aria-hidden="true"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-white/80 p-6 shadow-xl shadow-black/5">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Summary</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Review your entry</h2>
            </div>
          </header>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <dl className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Selected day</dt>
                <dd className="mt-2 text-lg font-semibold text-fg">
                  {selectedDate.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
                <dd className="text-sm font-medium uppercase tracking-[0.3em] text-muted-fg/70">{dayOfWeekLabel}</dd>
              </div>

              <div className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trading pair</dt>
                <dd className="mt-2 flex items-center gap-3 text-lg font-semibold text-fg">
                  <span className="text-2xl" aria-hidden="true">
                    {selectedSymbol.flag}
                  </span>
                  {selectedSymbol.code}
                </dd>
                <dd className="text-sm font-medium text-muted-fg">{selectedSymbol.label}</dd>
              </div>
            </dl>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-5">
              <p className="text-sm text-muted-fg">
                Make sure all your details look good before saving. You can always edit this trade later from your
                dashboard.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={handleSaveTrade}
                  disabled={!isEditing && !!existingTrade ? false : isSaving}
                  className="flex-1 rounded-full bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  Save
                </Button>

                {existingTrade && !isEditing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 rounded-full border border-border/70 bg-white/80 px-6 py-3 text-base font-semibold text-fg shadow-sm transition hover:border-border hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:flex-none"
                  >
                    Edit trade
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

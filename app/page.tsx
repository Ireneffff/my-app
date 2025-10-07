"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  readStoredTrades,
  TRADES_STORAGE_KEY,
  type StoredTrade,
  updateStoredTrade,
} from "@/lib/tradesStorage";
import { SYMBOL_OPTIONS } from "@/lib/symbols";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCalendarDays(activeDate: Date) {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const days: Date[] = [];
  const startWeekday = (startOfMonth.getDay() + 6) % 7; // Monday as first day

  for (let i = startWeekday; i > 0; i -= 1) {
    days.push(new Date(year, month, 1 - i));
  }

  for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  const trailingDays = (7 - (days.length % 7)) % 7;

  for (let i = 1; i <= trailingDays; i += 1) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [trades, setTrades] = useState<StoredTrade[]>([]);
  const [editingTrade, setEditingTrade] = useState<StoredTrade | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editSymbolCode, setEditSymbolCode] = useState<string>("");
  const [isUpdatingTrade, setIsUpdatingTrade] = useState(false);

  const dateToInputValue = (isoDate: string) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
    const day = `${parsed.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const inputValueToISODate = (value: string) => {
    if (!value) return "";
    const normalized = new Date(`${value}T00:00:00`);
    if (Number.isNaN(normalized.getTime())) return "";
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString();
  };

  useEffect(() => {
    setTrades(readStoredTrades());
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TRADES_STORAGE_KEY) {
        setTrades(readStoredTrades());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      setTrades(readStoredTrades());
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const monthDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);
  const todayKey = new Date().toDateString();
  const activeMonth = currentDate.getMonth();
  const activeYear = currentDate.getFullYear();
  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const tradeDates = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((trade) => {
      const parsed = new Date(trade.date);
      if (!Number.isNaN(parsed.getTime())) {
        set.add(parsed.toDateString());
      }
    });
    return set;
  }, [trades]);

  const orderedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });
  }, [trades]);

  const activeEditSymbol = useMemo(() => {
    return SYMBOL_OPTIONS.find((symbol) => symbol.code === editSymbolCode) ?? null;
  }, [editSymbolCode]);

  const beginEditingTrade = (trade: StoredTrade) => {
    setEditingTrade(trade);
    setEditDate(dateToInputValue(trade.date));
    setEditSymbolCode(trade.symbol.code);
  };

  const closeEditing = () => {
    setEditingTrade(null);
    setEditDate("");
    setEditSymbolCode("");
    setIsUpdatingTrade(false);
  };

  const requestCloseEditing = () => {
    if (isUpdatingTrade) return;
    closeEditing();
  };

  const handleUpdateTrade = () => {
    if (!editingTrade || !editDate || !activeEditSymbol) return;
    const isoDate = inputValueToISODate(editDate);
    if (!isoDate) return;

    setIsUpdatingTrade(true);
    updateStoredTrade(editingTrade.id, {
      date: isoDate,
      symbol: activeEditSymbol,
    });
    const latestTrades = readStoredTrades();
    setTrades(latestTrades);
    setIsUpdatingTrade(false);
    closeEditing();
  };

  const formatTradeDate = (isoDate: string) => {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return "--/--/----";

    return parsed.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-10">
      <div className="flex justify-end">
        <Link href="/new-trade">
          <Button variant="primary" className="rounded-full px-5">
            Add new
          </Button>
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
            Trading Journal
          </h1>
          <p className="mt-3 text-lg text-muted-fg">Calm mind, strong trade</p>
        </div>

        <Card className="mt-12 w-full max-w-lg bg-subtle p-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-fg transition hover:bg-bg"
              aria-label="Previous month"
            >
              ‹
            </button>
            <div className="text-lg font-semibold capitalize text-fg">{monthLabel}</div>
            <button
              type="button"
              onClick={() =>
                setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
              className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-fg transition hover:bg-bg"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
            {monthDays.map((day) => {
              const isCurrentMonth =
                day.getMonth() === activeMonth && day.getFullYear() === activeYear;
              const isToday = day.toDateString() === todayKey;
              const hasTrade = tradeDates.has(day.toDateString());

              const baseClasses =
                "flex h-12 flex-col items-center justify-center gap-1 rounded-xl transition";
              const stateClasses = isCurrentMonth
                ? "text-fg hover:bg-bg"
                : "text-muted-fg";
              const todayClasses = isToday
                ? "bg-accent/10 text-accent font-semibold"
                : "";

              return (
                <div
                  key={day.toISOString()}
                  className={[baseClasses, stateClasses, todayClasses].join(" ").trim()}
                >
                  {day.getDate()}
                  {hasTrade ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-16 w-full max-w-lg text-left">
          <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">
            Registered Trades
          </h2>
          {orderedTrades.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {orderedTrades.map((trade, index) => (
                <li
                  key={trade.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-white/80 px-5 py-4 shadow-sm shadow-black/5"
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-subtle text-sm font-semibold text-muted-fg">
                    {index + 1}
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-3 text-base font-semibold text-fg">
                      <span className="text-2xl" aria-hidden="true">
                        {trade.symbol.flag}
                      </span>
                      <span className="tracking-[0.3em]">{trade.symbol.code}</span>
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-muted-fg">
                      {formatTradeDate(trade.date)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => beginEditingTrade(trade)}
                    className="ml-auto flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg transition hover:border-border hover:text-fg"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-fg">
              No trades saved yet. Click “Add new” to register your first trade.
            </p>
          )}
        </div>
      </div>
      {editingTrade ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm"
          onClick={requestCloseEditing}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-trade-title"
            className="w-full max-w-lg rounded-3xl border border-border/60 bg-white p-6 shadow-2xl shadow-black/20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
                  Edit trade
                </p>
                <h3 id="edit-trade-title" className="text-2xl font-bold text-fg">
                  Update registered data
                </h3>
              </div>
              <button
                type="button"
                onClick={requestCloseEditing}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border/70 text-lg font-semibold text-muted-fg transition hover:border-border hover:text-fg"
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <label className="flex flex-col gap-2 text-left">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
                  Date
                </span>
                <input
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                  className="rounded-2xl border border-border/70 px-4 py-3 text-sm font-semibold text-fg shadow-inner shadow-black/5"
                />
              </label>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
                    Symbol
                  </span>
                  {activeEditSymbol ? (
                    <div className="flex items-center gap-2 rounded-full bg-subtle px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
                      <span className="text-lg" aria-hidden="true">
                        {activeEditSymbol.flag}
                      </span>
                      {activeEditSymbol.code}
                    </div>
                  ) : null}
                </div>

                <div
                  className="flex flex-col gap-2 rounded-[1.75rem] border border-border/40 bg-white/80 p-2 shadow-inner shadow-black/5"
                  role="listbox"
                  aria-activedescendant={activeEditSymbol ? `edit-symbol-${activeEditSymbol.code}` : undefined}
                >
                  {SYMBOL_OPTIONS.map((symbol) => {
                    const isActive = symbol.code === editSymbolCode;
                    return (
                      <button
                        key={symbol.code}
                        id={`edit-symbol-${symbol.code}`}
                        type="button"
                        onClick={() => setEditSymbolCode(symbol.code)}
                        className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3 text-sm font-semibold transition md:text-base ${
                          isActive
                            ? "bg-accent text-white shadow-lg shadow-accent/30"
                            : "bg-transparent text-fg hover:bg-muted/40"
                        }`}
                        aria-selected={isActive}
                        role="option"
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {symbol.flag}
                        </span>
                        <span className="tracking-[0.2em]">{symbol.code}</span>
                        {isActive ? (
                          <span className="ml-auto text-xs font-bold uppercase tracking-[0.3em] text-white/80">
                            Selected
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={requestCloseEditing}
                className="rounded-full border border-border/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-fg transition hover:border-border hover:text-fg"
                disabled={isUpdatingTrade}
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="primary"
                className="rounded-full px-6"
                onClick={handleUpdateTrade}
                disabled={isUpdatingTrade || !editDate || !activeEditSymbol}
              >
                {isUpdatingTrade ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

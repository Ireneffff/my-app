"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  readStoredTrades,
  TRADES_STORAGE_KEY,
  type StoredTrade,
} from "@/lib/tradesStorage";

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
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  loadTrades,
  REGISTERED_TRADES_UPDATED_EVENT,
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

  const refreshTrades = useCallback(async () => {
    const nextTrades = await loadTrades();
    setTrades(nextTrades);
  }, []);

  useEffect(() => {
    refreshTrades();
  }, [refreshTrades]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleUpdate = () => {
      refreshTrades();
    };

    window.addEventListener(REGISTERED_TRADES_UPDATED_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(REGISTERED_TRADES_UPDATED_EVENT, handleUpdate);
    };
  }, [refreshTrades]);

  const monthDays = useMemo(() => getCalendarDays(currentDate), [currentDate]);
  const todayKey = new Date().toDateString();
  const activeMonth = currentDate.getMonth();
  const activeYear = currentDate.getFullYear();
  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totalTrades = trades.length;

  return (
    <section className="page-shell flex min-h-dvh flex-col pb-20 pt-28 text-fg sm:pt-32">
      <header className="section-heading min-h-[54vh] flex-1 items-center justify-center sm:min-h-[60vh]">
        <p>Calm mind, strong trade</p>
        <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Trading Journal
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/new-trade" className="group">
            <Button variant="primary" size="md" className="px-6">
              <span className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5">
                Add trade
              </span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="mt-16 flex w-full flex-col items-center gap-12 pb-16">
        <Card className="w-full max-w-3xl self-center p-8 sm:max-w-4xl sm:p-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="interactive-area grid h-11 w-11 place-items-center rounded-full border border-border bg-[color:rgb(var(--surface)/0.92)] text-lg text-muted-fg shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:text-fg hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)]"
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
              className="interactive-area grid h-11 w-11 place-items-center rounded-full border border-border bg-[color:rgb(var(--surface)/0.92)] text-lg text-muted-fg shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:text-fg hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)]"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-muted-fg opacity-80">
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

              const baseClasses =
                "flex h-10 items-center justify-center rounded-full transition";
              const stateClasses = isCurrentMonth
                ? "text-fg hover:bg-subtle"
                : "text-muted-fg opacity-60";
              const todayClasses = isToday
                ? "bg-accent/10 text-accent font-semibold"
                : "";

              return (
                <div
                  key={day.toISOString()}
                  className={[baseClasses, stateClasses, todayClasses, "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"].join(" ").trim()}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="w-full max-w-3xl self-center text-left sm:max-w-4xl">
          <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">
            Registered Trades
          </h2>

          {trades.length === 0 ? (
            <p
              className="mt-4 rounded-2xl border border-dashed bg-[color:rgb(var(--surface)/0.75)] px-6 py-8 text-center text-sm text-muted-fg backdrop-blur"
              style={{ borderColor: "color-mix(in srgb, rgba(var(--border)) 60%, transparent)" }}
            >
              No trades saved yet. Use the Add trade button to register your first trade.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {trades.map((trade, index) => {
                const formattedDate = new Date(trade.date).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                return (
                  <li key={trade.id}>
                    <Link
                      href={`/registered-trades/${trade.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-[color:rgb(var(--surface)/0.92)] px-5 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-border hover:shadow-[0_26px_46px_rgba(15,23,42,0.16)]"
                    >
                      <span
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[color:rgb(var(--accent)/0.12)] text-sm font-semibold text-accent"
                      >
                        {totalTrades - index}
                      </span>
                      <span className="text-2xl" aria-hidden="true">
                        {trade.symbolFlag}
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold tracking-[0.18em] text-fg">
                          {trade.symbolCode}
                        </span>
                      </div>
                      <time className="text-sm font-medium text-muted-fg transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-fg" dateTime={trade.date}>
                        {formattedDate}
                      </time>
                      <span className="ml-2 text-lg text-muted-fg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-fg" aria-hidden="true">
                        ↗
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

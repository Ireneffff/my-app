"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";
import {
  loadTrades,
  REGISTERED_TRADES_UPDATED_EVENT,
  type StoredTrade,
} from "@/lib/tradesStorage";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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

  return days.filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  });
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [trades, setTrades] = useState<StoredTrade[]>([]);

  useEffect(() => {
    async function checkSupabase() {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();
      console.log("Supabase session:", session, "Error:", sessionError);

      const { data, error } = await supabase.from("profiles").select("*").limit(5);
      if (error) {
        console.error("Supabase error:", error.message);
      } else {
        console.log("Supabase profiles:", data);
      }
    }

    checkSupabase();
  }, []);

  useEffect(() => {
    function refreshTrades() {
      setTrades(loadTrades());
    }

    refreshTrades();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrades);

    return () => {
      window.removeEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrades);
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

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 pb-16 pt-24 sm:px-8 sm:pt-28">
      <header className="flex min-h-[58vh] flex-1 flex-col items-center justify-center gap-4 text-center sm:min-h-[62vh]">
        <p className="text-sm text-muted-fg">Calm mind, strong trade</p>
        <h1 className="text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Trading Journal
        </h1>
        <Link href="/new-trade" className="mt-2">
          <Button variant="primary" size="md">
            Add trade
          </Button>
        </Link>
      </header>

      <div className="mt-16 flex w-full flex-col items-center gap-12 pb-16">
        <Card className="w-full max-w-3xl self-center p-8 sm:max-w-4xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-fg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-subtle hover:text-fg hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
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
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-fg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-subtle hover:text-fg hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2 text-xs font-medium uppercase tracking-[0.28em] text-muted-fg opacity-80">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-5 gap-2 text-sm">
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
                  className={[baseClasses, stateClasses, todayClasses].join(" ").trim()}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="w-full max-w-3xl self-center text-left sm:max-w-4xl">
          <h2 className="text-sm font-medium uppercase tracking-[0.28em] text-muted-fg">
            Registered Trades
          </h2>

          {trades.length === 0 ? (
            <p
              className="mt-4 rounded-2xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-fg"
              style={{ borderColor: "color-mix(in srgb, rgba(var(--border)) 100%, transparent)" }}
            >
              No trades saved yet. Use the Add new button to register your first trade.
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
                      className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]"
                    >
                      <span
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-semibold text-accent"
                        style={{ backgroundColor: "rgb(var(--accent) / 0.12)" }}
                      >
                        {index + 1}
                      </span>
                      <span className="text-2xl" aria-hidden="true">
                        {trade.symbolFlag}
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold tracking-[0.18em] text-fg">
                          {trade.symbolCode}
                        </span>
                      </div>
                      <time className="text-sm font-medium text-muted-fg" dateTime={trade.date}>
                        {formattedDate}
                      </time>
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

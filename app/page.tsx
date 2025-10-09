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
              className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-fg transition hover:bg-black/10 interactive-surface"
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
              className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-fg transition hover:bg-black/10 interactive-surface"
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

              const baseClasses =
                "flex h-10 items-center justify-center rounded-xl transition";
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
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-10 w-full max-w-lg text-left">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">
            Registered Trades
          </h2>

          {trades.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-dashed border-border/70 bg-white/50 px-6 py-8 text-center text-sm font-medium text-muted-fg">
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
                      className="flex items-center gap-4 rounded-3xl border border-border/60 bg-white/80 px-5 py-4 shadow-sm shadow-black/5 transition hover:-translate-y-0.5 interactive-surface"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                        {index + 1}
                      </span>
                      <span className="text-2xl" aria-hidden="true">
                        {trade.symbolFlag}
                      </span>
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-semibold tracking-[0.2em] text-fg">
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

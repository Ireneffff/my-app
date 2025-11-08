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

function getTradeTimestamp(trade: StoredTrade) {
  const candidates = [trade.date, trade.openTime, trade.closeTime, trade.createdAt];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const parsed = new Date(candidate);
    const timestamp = parsed.getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
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
  const orderedTrades = useMemo(
    () => [...trades].sort((a, b) => getTradeTimestamp(b) - getTradeTimestamp(a)),
    [trades],
  );

  const totalTrades = orderedTrades.length;

  const outcomesByDay = useMemo(() => {
    const map = new Map<string, { outcome: "profit" | "loss"; timestamp: number }[]>();

    for (const trade of trades) {
      if (!trade.tradeOutcome) {
        continue;
      }

      const referenceDate = trade.openTime ?? trade.date;

      if (!referenceDate) {
        continue;
      }

      const parsed = new Date(referenceDate);

      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      const key = parsed.toDateString();
      const existing = map.get(key);
      const entry = { outcome: trade.tradeOutcome, timestamp: getTradeTimestamp(trade) };

      if (existing) {
        existing.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }

    const sorted = new Map<string, ("profit" | "loss")[]>();

    for (const [key, entries] of map.entries()) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      sorted.set(
        key,
        entries.map((entry) => entry.outcome),
      );
    }

    return sorted;
  }, [trades]);

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
              const dayOutcomes = outcomesByDay.get(day.toDateString());
              const getIndicatorClasses = (outcome: "profit" | "loss") =>
                outcome === "profit"
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                  : "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.12)]";

              const baseClasses =
                "flex h-10 flex-col items-center justify-center rounded-full transition";
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
                  <span>{day.getDate()}</span>
                  {dayOutcomes ? (
                    <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {dayOutcomes.map((outcome, index) => (
                        <span
                          key={`${day.toISOString()}-${index}`}
                          className={["h-2 w-2 rounded-full", getIndicatorClasses(outcome)]
                            .join(" ")
                            .trim()}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="w-full max-w-3xl self-center text-left sm:max-w-4xl">
          <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">
            Registered Trades
          </h2>

          {orderedTrades.length === 0 ? (
            <p
              className="mt-4 rounded-2xl border border-dashed bg-[color:rgb(var(--surface)/0.75)] px-6 py-8 text-center text-sm text-muted-fg backdrop-blur"
              style={{ borderColor: "color-mix(in srgb, rgba(var(--border)) 60%, transparent)" }}
            >
              No trades saved yet. Use the Add trade button to register your first trade.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {orderedTrades.map((trade, index) => {
                const formattedDate = new Date(trade.date).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const outcomeLabel =
                  trade.tradeOutcome === "profit"
                    ? "Profit"
                    : trade.tradeOutcome === "loss"
                      ? "Loss"
                      : null;
                const takeProfitDescriptions =
                  trade.takeProfitOutcomes
                    ?.map((outcome, tpIndex) => {
                      if (!outcome) {
                        return null;
                      }

                      const label = outcome === "profit" ? "Profit" : "Loss";
                      return `Position ${tpIndex + 1} • ${label}`;
                    })
                    .filter((description): description is string => Boolean(description)) ?? [];
                const shouldRenderOutcomes = Boolean(outcomeLabel) || takeProfitDescriptions.length > 0;

                return (
                  <li key={trade.id}>
                    <Link
                      href={`/registered-trades/${trade.id}`}
                      className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-[color:rgb(var(--surface)/0.92)] px-4 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-border hover:shadow-[0_26px_46px_rgba(15,23,42,0.16)] md:flex-row md:items-center md:gap-5 md:px-5 md:py-4"
                    >
                      <time
                        className="order-1 self-end pr-1 text-sm font-medium text-muted-fg transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-fg md:order-4 md:ml-auto md:self-auto"
                        dateTime={trade.date}
                      >
                        {formattedDate}
                      </time>
                      <div className="order-2 grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 text-center md:order-1 md:flex md:flex-1 md:items-center md:gap-5 md:text-left">
                        <div className="flex items-center justify-start md:order-1 md:justify-start">
                          <span
                            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[color:rgb(var(--accent)/0.12)] text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-accent md:h-10 md:w-10 md:text-sm md:tracking-[0.24em]"
                          >
                            {totalTrades - index}
                          </span>
                        </div>
                        <div className="order-2 flex flex-col items-center gap-1 justify-self-center md:order-2 md:flex-row md:items-center md:gap-3 md:justify-self-start">
                          <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-[1.7rem] leading-none md:text-2xl" aria-hidden="true">
                              {trade.symbolFlag}
                            </span>
                            <div className="flex min-w-0 flex-col items-center md:items-start">
                              <span className="truncate text-base font-semibold tracking-[0.14em] text-fg md:text-lg md:tracking-[0.16em]">
                                {trade.symbolCode}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="order-3 flex items-center justify-end md:order-3 md:hidden md:justify-start">
                          {outcomeLabel ? (
                            <span
                              className={`flex h-9 items-center justify-center rounded-full border px-3 text-[0.64rem] font-semibold uppercase tracking-[0.24em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                trade.tradeOutcome === "profit"
                                  ? "border-[#A6E8B0]/80 bg-[#E6F9EC]/90 text-[#2E7D32] group-hover:border-[#A6E8B0] group-hover:bg-[#E6F9EC]"
                                  : "border-[#F5B7B7]/80 bg-[#FCE8E8]/90 text-[#C62828] group-hover:border-[#F5B7B7] group-hover:bg-[#FCE8E8]"
                              }`}
                            >
                              {outcomeLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {shouldRenderOutcomes ? (
                        <div className="order-3 flex flex-col items-center gap-2 text-center md:order-2 md:flex-row md:items-center md:gap-3 md:text-left">
                          {outcomeLabel ? (
                            <span
                              className={`hidden h-8 items-center justify-center rounded-full border px-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex ${
                                trade.tradeOutcome === "profit"
                                  ? "border-[#A6E8B0]/80 bg-[#E6F9EC]/90 text-[#2E7D32] group-hover:border-[#A6E8B0] group-hover:bg-[#E6F9EC]"
                                  : "border-[#F5B7B7]/80 bg-[#FCE8E8]/90 text-[#C62828] group-hover:border-[#F5B7B7] group-hover:bg-[#FCE8E8]"
                              }`}
                            >
                              {outcomeLabel}
                            </span>
                          ) : null}
                          {takeProfitDescriptions.length > 0 ? (
                            <div className="flex flex-col items-center gap-1 text-[0.6rem] font-medium text-muted-fg md:items-start md:text-left">
                              {takeProfitDescriptions.map((description) => (
                                <span key={description} className="tracking-[0.08em]">
                                  {description}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <span className="order-4 ml-auto text-lg text-muted-fg transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-fg md:order-5 md:ml-2" aria-hidden="true">
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

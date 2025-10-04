"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";

type TradeResult = "Profit" | "Loss" | "Breakeven";
type TradeDirection = "Long" | "Short";

type Trade = {
  id: string;
  symbol: string;
  strategy: string;
  direction: TradeDirection;
  result: TradeResult;
  riskReward: string;
  riskRewardValue: number | null;
  executedAt: string;
  executedAtKey: string;
  notes?: string | null;
};

type RawTrade = {
  id?: unknown;
  symbol?: unknown;
  pair?: unknown;
  strategy?: unknown;
  setup?: unknown;
  direction?: unknown;
  side?: unknown;
  position?: unknown;
  result?: unknown;
  outcome?: unknown;
  status?: unknown;
  risk_reward?: unknown;
  riskReward?: unknown;
  rr?: unknown;
  risk_reward_ratio?: unknown;
  executed_at?: unknown;
  executedAt?: unknown;
  date?: unknown;
  opened_at?: unknown;
  notes?: unknown;
  comment?: unknown;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RESULT_BADGE_STYLES: Record<TradeResult, string> = {
  Profit: "bg-emerald-100 text-emerald-700",
  Loss: "bg-rose-100 text-rose-700",
  Breakeven: "bg-slate-200 text-slate-700",
};

const DIRECTION_BADGE_STYLES: Record<TradeDirection, string> = {
  Long: "bg-sky-100 text-sky-700",
  Short: "bg-orange-100 text-orange-700",
};

function parseRiskRewardValue(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  const str = String(input).trim();
  if (!str) return null;
  if (str.includes(":")) {
    const [riskPart, rewardPart] = str.split(":");
    const risk = Number.parseFloat(riskPart || "1");
    const reward = Number.parseFloat(rewardPart || "0");
    if (!Number.isFinite(risk) || risk === 0 || !Number.isFinite(reward)) {
      return null;
    }
    return reward / risk;
  }
  const value = Number.parseFloat(str);
  return Number.isFinite(value) ? value : null;
}

function normaliseResult(value: unknown): TradeResult {
  const normalised = String(value ?? "profit").toLowerCase();
  if (normalised.includes("loss")) return "Loss";
  if (normalised.includes("break")) return "Breakeven";
  if (normalised.includes("flat")) return "Breakeven";
  return "Profit";
}

function normaliseDirection(value: unknown): TradeDirection {
  const normalised = String(value ?? "long").toLowerCase();
  if (normalised.includes("short")) return "Short";
  return "Long";
}

function formatDateKey(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTrade(row: RawTrade): Trade | null {
  const executedAtRaw = row.executed_at ?? row.executedAt ?? row.date ?? row.opened_at;
  if (!executedAtRaw) return null;
  const executedDate = new Date(executedAtRaw);
  if (Number.isNaN(executedDate.getTime())) return null;
  const executedAt = executedDate.toISOString();
  const executedAtKey = formatDateKey(executedDate);
  if (!executedAtKey) return null;

  const riskRewardRaw = row.risk_reward ?? row.riskReward ?? row.rr ?? row.risk_reward_ratio;
  const riskRewardValue = parseRiskRewardValue(riskRewardRaw);
  const riskReward = riskRewardRaw ? String(riskRewardRaw) : riskRewardValue ? `1:${riskRewardValue.toFixed(2)}` : "—";

  const symbol = row.symbol ?? row.pair ?? "—";
  const strategy = row.strategy ?? row.setup ?? "—";

  return {
    id: row.id ? String(row.id) : `${symbol}-${executedAt}`,
    symbol,
    strategy,
    direction: normaliseDirection(row.direction ?? row.side ?? row.position),
    result: normaliseResult(row.result ?? row.outcome ?? row.status),
    riskReward,
    riskRewardValue,
    executedAt,
    executedAtKey,
    notes: row.notes ?? row.comment ?? null,
  };
}

const FALLBACK_TRADES: Trade[] = [
  {
    id: "1",
    symbol: "EURUSD",
    strategy: "Fvg",
    direction: "Long",
    result: "Profit",
    riskReward: "1:4",
    riskRewardValue: parseRiskRewardValue("1:4"),
    executedAt: new Date("2025-09-03T09:15:00Z").toISOString(),
    executedAtKey: formatDateKey("2025-09-03T09:15:00Z"),
  },
  {
    id: "2",
    symbol: "EURUSD",
    strategy: "Fvg",
    direction: "Short",
    result: "Loss",
    riskReward: "1:2",
    riskRewardValue: parseRiskRewardValue("1:2"),
    executedAt: new Date("2025-09-02T13:40:00Z").toISOString(),
    executedAtKey: formatDateKey("2025-09-02T13:40:00Z"),
  },
  {
    id: "3",
    symbol: "GBPUSD",
    strategy: "Breakout",
    direction: "Long",
    result: "Profit",
    riskReward: "1:3",
    riskRewardValue: parseRiskRewardValue("1:3"),
    executedAt: new Date("2025-09-01T07:05:00Z").toISOString(),
    executedAtKey: formatDateKey("2025-09-01T07:05:00Z"),
  },
  {
    id: "4",
    symbol: "EURUSD",
    strategy: "Fvg",
    direction: "Long",
    result: "Breakeven",
    riskReward: "1:1",
    riskRewardValue: parseRiskRewardValue("1:1"),
    executedAt: new Date("2025-08-29T10:25:00Z").toISOString(),
    executedAtKey: formatDateKey("2025-08-29T10:25:00Z"),
  },
].sort((a, b) => (a.executedAt < b.executedAt ? 1 : -1));

function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Stats = {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  avgRiskReward: number | null;
};

function calculateStats(tradeList: Trade[]): Stats {
  if (tradeList.length === 0) {
    return { total: 0, wins: 0, losses: 0, breakeven: 0, winRate: 0, avgRiskReward: null };
  }
  const wins = tradeList.filter((trade) => trade.result === "Profit").length;
  const losses = tradeList.filter((trade) => trade.result === "Loss").length;
  const breakeven = tradeList.filter((trade) => trade.result === "Breakeven").length;
  const avgRiskRewardValues = tradeList
    .map((trade) => trade.riskRewardValue)
    .filter((value): value is number => value !== null && !Number.isNaN(value));
  const avgRiskReward =
    avgRiskRewardValues.length > 0
      ? avgRiskRewardValues.reduce((acc, value) => acc + value, 0) /
        avgRiskRewardValues.length
      : null;

  return {
    total: tradeList.length,
    wins,
    losses,
    breakeven,
    winRate: Math.round((wins / tradeList.length) * 100),
    avgRiskReward,
  };
}

type CalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function buildCalendarDays(month: Date): CalendarDay[] {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthIndex = startOfMonth.getMonth();
  const startOffset = (startOfMonth.getDay() + 6) % 7; // Monday as first day
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - startOffset + 1;
    const date = new Date(month.getFullYear(), month.getMonth(), dayOffset);
    return {
      key: formatDateKey(date),
      date,
      isCurrentMonth: date.getMonth() === monthIndex,
      isToday: isSameDay(date, new Date()),
    };
  });
}

function mostFrequentDirection(tradeList: Trade[]): TradeDirection | null {
  if (tradeList.length === 0) return null;
  const longCount = tradeList.filter((trade) => trade.direction === "Long").length;
  const shortCount = tradeList.length - longCount;
  if (longCount === shortCount) return null;
  return longCount > shortCount ? "Long" : "Short";
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>(FALLBACK_TRADES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState<boolean>(true);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("all");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("all");

  useEffect(() => {
    let ignore = false;

    async function loadTrades() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .order("executed_at", { ascending: false });

        if (error) {
          throw error;
        }

        const normalisedTrades = (data ?? [])
          .map((row) => normalizeTrade(row))
          .filter((trade): trade is Trade => Boolean(trade));

        if (!ignore) {
          if (normalisedTrades.length > 0) {
            setTrades(normalisedTrades);
            setUsingFallback(false);
          } else {
            setTrades(FALLBACK_TRADES);
            setUsingFallback(true);
          }
          setErrorMessage(null);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load trades";
        if (!ignore) {
          setErrorMessage(message);
          setTrades(FALLBACK_TRADES);
          setUsingFallback(true);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTrades();

    return () => {
      ignore = true;
    };
  }, []);

  const tradesByDate = useMemo(() => {
    return trades.reduce<Map<string, Trade[]>>((map, trade) => {
      if (!map.has(trade.executedAtKey)) {
        map.set(trade.executedAtKey, []);
      }
      map.get(trade.executedAtKey)!.push(trade);
      return map;
    }, new Map());
  }, [trades]);

  const symbolOptions = useMemo(() => {
    const unique = new Set<string>();
    trades.forEach((trade) => {
      if (trade.symbol && trade.symbol !== "—") {
        unique.add(trade.symbol);
      }
    });
    return ["all", ...Array.from(unique).sort()];
  }, [trades]);

  const strategyOptions = useMemo(() => {
    const unique = new Set<string>();
    trades.forEach((trade) => {
      if (trade.strategy && trade.strategy !== "—") {
        unique.add(trade.strategy);
      }
    });
    return ["all", ...Array.from(unique).sort()];
  }, [trades]);

  const symbolStats = useMemo(() => {
    const baseTrades = selectedSymbol === "all"
      ? trades
      : trades.filter((trade) => trade.symbol === selectedSymbol);
    return calculateStats(baseTrades);
  }, [trades, selectedSymbol]);

  const strategyStats = useMemo(() => {
    const baseTrades = selectedStrategy === "all"
      ? trades
      : trades.filter((trade) => trade.strategy === selectedStrategy);
    return calculateStats(baseTrades);
  }, [trades, selectedStrategy]);

  const globalStats = useMemo(() => calculateStats(trades), [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesSymbol = selectedSymbol === "all" || trade.symbol === selectedSymbol;
      const matchesStrategy = selectedStrategy === "all" || trade.strategy === selectedStrategy;
      const matchesDate = !selectedDate || trade.executedAtKey === selectedDate;
      return matchesSymbol && matchesStrategy && matchesDate;
    });
  }, [trades, selectedSymbol, selectedStrategy, selectedDate]);

  const selectedStrategyDirection = useMemo(() => {
    const baseTrades = selectedStrategy === "all"
      ? trades
      : trades.filter((trade) => trade.strategy === selectedStrategy);
    return mostFrequentDirection(baseTrades);
  }, [trades, selectedStrategy]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "All trades";
    return formatDisplayDate(selectedDate);
  }, [selectedDate]);

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:pb-20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Trading Journal
          </h1>
          <p className="mt-1 text-sm text-muted-fg sm:text-base">
            Calm mind, strong trade
          </p>
        </div>
        <Link href="/new-trade" className="shrink-0">
          <Button variant="primary" size="md" leftIcon={<span className="text-lg">+</span>}>
            Add new
          </Button>
        </Link>
      </header>

      {(errorMessage || usingFallback) && (
        <Card className="border-dashed border-border bg-subtle p-4 text-sm text-muted-fg">
          {errorMessage ? <p>Supabase error: {errorMessage}</p> : null}
          {usingFallback ? (
            <p className={errorMessage ? "mt-2" : undefined}>
              Showing demo data. Add new trades to see your real performance.
            </p>
          ) : null}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
        <div className="grid gap-6">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-fg">Analysis by symbol</p>
                  <h2 className="text-xl font-semibold text-fg">
                    {selectedSymbol === "all" ? "All symbols" : selectedSymbol}
                  </h2>
                </div>
                <select
                  className="rounded-xl border border-border bg-subtle px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                  value={selectedSymbol}
                  onChange={(event) => setSelectedSymbol(event.target.value)}
                >
                  {symbolOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All symbols" : option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-fg">Win rate</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">
                    {symbolStats.total > 0 ? `${symbolStats.winRate}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-fg">Total trades</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">{symbolStats.total}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Avg R:R</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">
                    {symbolStats.avgRiskReward ? symbolStats.avgRiskReward.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-xl bg-subtle p-3 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-fg">Wins</p>
                  <p className="mt-1 font-medium text-fg">{symbolStats.wins}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Losses</p>
                  <p className="mt-1 font-medium text-fg">{symbolStats.losses}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Breakeven</p>
                  <p className="mt-1 font-medium text-fg">{symbolStats.breakeven}</p>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-fg">Analysis by strategy</p>
                  <h2 className="text-xl font-semibold text-fg">
                    {selectedStrategy === "all" ? "All strategies" : selectedStrategy}
                  </h2>
                </div>
                <select
                  className="rounded-xl border border-border bg-subtle px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                  value={selectedStrategy}
                  onChange={(event) => setSelectedStrategy(event.target.value)}
                >
                  {strategyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All strategies" : option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-fg">Win rate</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">
                    {strategyStats.total > 0 ? `${strategyStats.winRate}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-fg">Total trades</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">{strategyStats.total}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Avg R:R</p>
                  <p className="mt-1 text-2xl font-semibold text-fg">
                    {strategyStats.avgRiskReward ? strategyStats.avgRiskReward.toFixed(2) : "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 rounded-xl bg-subtle p-3 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-fg">Wins</p>
                  <p className="mt-1 font-medium text-fg">{strategyStats.wins}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Losses</p>
                  <p className="mt-1 font-medium text-fg">{strategyStats.losses}</p>
                </div>
                <div>
                  <p className="text-muted-fg">Direction focus</p>
                  <p className="mt-1 font-medium text-fg">
                    {selectedStrategyDirection ?? "Balanced"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-fg">Overview</p>
              <h2 className="text-xl font-semibold text-fg">Performance snapshot</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-muted-fg">Total trades</p>
                <p className="mt-2 text-2xl font-semibold text-fg">{globalStats.total}</p>
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-muted-fg">Win rate</p>
                <p className="mt-2 text-2xl font-semibold text-fg">
                  {globalStats.total > 0 ? `${globalStats.winRate}%` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-muted-fg">Profitable</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">{globalStats.wins}</p>
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-muted-fg">Losing</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">{globalStats.losses}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-fg">September</p>
              <h2 className="text-xl font-semibold text-fg">
                {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-lg text-muted-fg hover:bg-subtle"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-lg text-muted-fg hover:bg-subtle"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-muted-fg">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid flex-1 grid-cols-7 gap-2">
            {calendarDays.map(({ key, date, isCurrentMonth, isToday }) => {
              const hasTrades = tradesByDate.get(key)?.length ?? 0;
              const isSelected = selectedDate === key;
              return (
                <button
                  key={key || date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate((prev) => (prev === key ? null : key))}
                  className={[
                    "flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm transition",
                    isSelected
                      ? "border-transparent bg-accent/10 text-accent"
                      : "border-border bg-subtle text-fg",
                    !isCurrentMonth ? "opacity-40" : "",
                    isToday && !isSelected ? "ring-1 ring-accent/40" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="text-base font-semibold">{date.getDate()}</span>
                  <span
                    className={[
                      "mt-1 h-1.5 w-1.5 rounded-full",
                      hasTrades > 0 ? "bg-accent" : "bg-transparent",
                    ].join(" ")}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-fg">
            <p>{selectedDateLabel}</p>
            {selectedDate ? (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="font-medium text-accent hover:underline"
              >
                Clear selection
              </button>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-fg">Registered trades</p>
            <h2 className="text-xl font-semibold text-fg">{selectedDateLabel}</h2>
          </div>
          {isLoading ? (
            <span className="text-xs text-muted-fg">Updating…</span>
          ) : (
            <span className="text-xs text-muted-fg">
              {filteredTrades.length} trade{filteredTrades.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Strategy</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">R:R</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-fg">
                    No trades found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr key={trade.id} className="transition hover:bg-subtle/60">
                    <td className="px-4 py-3 font-medium text-fg">{trade.symbol}</td>
                    <td className="px-4 py-3 text-muted-fg">{trade.strategy}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${DIRECTION_BADGE_STYLES[trade.direction]}`}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${RESULT_BADGE_STYLES[trade.result]}`}
                      >
                        {trade.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg">{trade.riskReward}</td>
                    <td className="px-4 py-3 text-muted-fg">{formatDisplayDate(trade.executedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

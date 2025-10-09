"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import {
  deleteTrade,
  loadTrades,
  REGISTERED_TRADES_UPDATED_EVENT,
  type StoredTrade,
} from "@/lib/tradesStorage";

type TradeState = {
  status: "loading" | "ready" | "missing";
  trade: StoredTrade | null;
};

const availableSymbols = [
  { code: "EURUSD", flag: "🇪🇺 🇺🇸" },
  { code: "GBPUSD", flag: "🇬🇧 🇺🇸" },
  { code: "USDJPY", flag: "🇺🇸 🇯🇵" },
  { code: "AUDUSD", flag: "🇦🇺 🇺🇸" },
  { code: "USDCAD", flag: "🇺🇸 🇨🇦" },
  { code: "EURGBP", flag: "🇪🇺 🇬🇧" },
] as const;

function getDateTimeDisplay(isoValue?: string | null) {
  if (!isoValue) {
    return { dateLabel: "-- ---", timeLabel: "--:--" };
  }

  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return { dateLabel: "-- ---", timeLabel: "--:--" };
  }

  const dayLabel = parsed.toLocaleDateString(undefined, { day: "numeric" });
  const monthLabel = parsed
    .toLocaleDateString(undefined, { month: "short" })
    .toUpperCase();
  const timeLabel = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return { dateLabel: `${dayLabel} ${monthLabel}`, timeLabel };
}

function getWorkWeekDays(referenceDate: Date) {
  const baseDate = new Date(referenceDate);
  baseDate.setHours(0, 0, 0, 0);

  const baseDay = baseDate.getDay();
  const diffFromMonday = (baseDay + 6) % 7;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - diffFromMonday);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatOptionalText(value?: string | null) {
  if (!value) {
    return "—";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

export default function RegisteredTradePage() {
  const params = useParams<{ tradeId: string }>();
  const router = useRouter();

  const [state, setState] = useState<TradeState>({ status: "loading", trade: null });
  const [activeTab, setActiveTab] = useState<"main" | "library">("main");

  const rawTradeId = params.tradeId;
  const tradeId = Array.isArray(rawTradeId) ? rawTradeId[0] : rawTradeId;

  useEffect(() => {
    if (!tradeId) {
      setState({ status: "missing", trade: null });
      return;
    }

    function refreshTrade() {
      const trades = loadTrades();
      const match = trades.find((storedTrade) => storedTrade.id === tradeId) ?? null;

      setState({ status: match ? "ready" : "missing", trade: match });
    }

    refreshTrade();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrade);

    return () => {
      window.removeEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrade);
    };
  }, [tradeId]);

  const selectedDate = useMemo(() => {
    if (state.trade?.date) {
      const parsed = new Date(state.trade.date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }, [state.trade]);

  const currentWeekDays = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return getWorkWeekDays(selectedDate);
  }, [selectedDate]);

  const dayOfWeekLabel = useMemo(() => {
    if (!selectedDate) {
      return "";
    }

    return selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
    });
  }, [selectedDate]);

  if (state.status === "loading") {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-fg">
        <p className="text-sm font-medium text-muted-fg">Loading trade…</p>
      </section>
    );
  }

  if (state.status === "missing" || !state.trade || !selectedDate) {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-fg">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">Trade not found</h1>
          <p className="max-w-md text-sm text-muted-fg md:text-base">
            We couldn&apos;t find the requested trade in your saved entries. It may have been removed or the link is incorrect.
          </p>
          <Link href="/">
            <Button variant="primary" size="md">Back to dashboard</Button>
          </Link>
        </div>
      </section>
    );
  }

  const activeSymbol =
    availableSymbols.find((symbol) => symbol.code === state.trade?.symbolCode) ?? {
      code: state.trade.symbolCode,
      flag: state.trade.symbolFlag,
    };

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const openTimeDisplay = getDateTimeDisplay(state.trade.openTime);
  const closeTimeDisplay = getDateTimeDisplay(state.trade.closeTime);
  const imageData = state.trade.imageData ?? null;
  const positionLabel = state.trade.position === "SHORT" ? "Short" : "Long";
  const riskRewardValue = formatOptionalText(state.trade.riskReward);
  const riskValue = formatOptionalText(state.trade.risk);
  const pipsValue = formatOptionalText(state.trade.pips);

  const handleEditTrade = () => {
    if (!state.trade) {
      return;
    }

    router.push(`/new-trade?tradeId=${state.trade.id}`);
  };

  const handleDeleteTrade = () => {
    if (!state.trade) {
      return;
    }

    const shouldDelete = window.confirm("Sei sicuro di voler eliminare questa operazione?");
    if (!shouldDelete) {
      return;
    }

    deleteTrade(state.trade.id);
    setState({ status: "missing", trade: null });
    router.push("/");
  };

  return (
    <section
      className="relative flex min-h-dvh flex-col gap-12 bg-bg px-4 pb-16 text-fg sm:px-6 md:px-10"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 sm:max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-11 flex-none rounded-full p-0 text-lg text-muted-fg hover:text-fg"
          onClick={() => {
            router.back();
          }}
          aria-label="Close"
        >
          ×
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleEditTrade}>
            Edit trade
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-transparent text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleDeleteTrade}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 sm:max-w-4xl">
        <header className="space-y-2">
          <p className="text-sm text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
            Trade details
          </h1>
          <p className="text-sm text-muted-fg md:text-base">Registered on {formattedDate}</p>
        </header>

        <div className="flex w-full flex-col gap-8">
          <nav className="flex w-full flex-wrap items-center justify-center gap-2 px-1 py-2 text-sm text-muted-fg">
            {[
              { label: "Main Data", value: "main" as const },
              { label: "Library", value: "library" as const },
            ].map(({ label, value }) => {
              const isActive = activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full border px-4 py-2 transition ${
                    isActive
                      ? "border-border bg-surface text-fg"
                      : "border-transparent text-muted-fg hover:border-border hover:text-fg"
                  }`}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value)}
                  disabled={isActive}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {activeTab === "main" ? (
            <>
          <div className="w-full surface-panel px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-x-auto rounded-full border border-border bg-surface px-1 py-1">
              {currentWeekDays.map((date) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const dayNumber = date.getDate();
                const monthLabel = date
                  .toLocaleDateString(undefined, {
                    month: "short",
                  })
                  .toUpperCase();

                return (
                  <div
                    key={date.toISOString()}
                    className={`flex min-w-[62px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium md:min-w-[88px] md:text-sm ${
                      isSelected ? "text-accent" : "text-muted-fg"
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: "rgb(var(--accent) / 0.1)" }
                        : undefined
                    }
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-semibold" : "font-medium"}`}>{dayNumber}</span>
                    <span className="text-[10px] tracking-[0.3em] md:text-xs">{monthLabel}</span>
                  </div>
                );
              })}

              <div className="ml-auto hidden h-12 w-12 flex-none items-center justify-center rounded-full border border-border text-muted-fg md:flex">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="16" r="1.5" />
                </svg>
              </div>
            </div>

            <p className="mt-5 text-sm text-muted-fg md:text-base">
              Day of the week: <span className="font-semibold text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Symbol</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="text-2xl" aria-hidden="true">
                    {activeSymbol.flag}
                  </span>
                  <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                    {activeSymbol.code}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Open Time</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      {openTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                      {openTimeDisplay.timeLabel}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto h-6 w-6 text-muted-fg"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Close Time</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      {closeTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                      {closeTimeDisplay.timeLabel}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto h-6 w-6 text-muted-fg"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Conditions</span>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Position</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{positionLabel}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">R/R</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{riskRewardValue}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Risk</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{riskValue}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Nr. Pips</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{pipsValue}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Images</span>
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg opacity-80">
                  Before the position
                </span>
              </div>

              {imageData ? (
                <div className="flex flex-col gap-3">
                  <div className="relative flex min-h-[240px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface aspect-video">
                    <Image
                      src={imageData}
                      alt="Trade context attachment"
                      fill
                      sizes="(min-width: 768px) 560px, 90vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-muted-fg">
                    This is the snapshot you saved when registering the trade.
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed bg-subtle px-5 py-6 text-center text-xs text-muted-fg">
                  No image was attached to this trade.
                </p>
              )}
            </div>
          </div>
            </>
          ) : (
            <div className="w-full surface-panel px-5 py-6 text-center text-sm text-muted-fg md:px-6 md:py-8">
              Library gallery will be available soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

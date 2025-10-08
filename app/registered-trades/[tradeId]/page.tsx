"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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

export default function RegisteredTradePage() {
  const params = useParams<{ tradeId: string }>();
  const router = useRouter();

  const [state, setState] = useState<TradeState>({ status: "loading", trade: null });

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
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-6 py-10 text-fg">
        <p className="text-sm font-medium text-muted-fg">Loading trade…</p>
      </section>
    );
  }

  if (state.status === "missing" || !state.trade || !selectedDate) {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-6 py-10 text-fg">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">Trade not found</h1>
          <p className="max-w-md text-sm text-muted-fg md:text-base">
            We couldn&apos;t find the requested trade in your saved entries. It may have been removed or the link is incorrect.
          </p>
          <Link
            href="/"
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:scale-105"
          >
            Back to dashboard
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
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-4 pb-10 text-fg sm:px-6 md:px-10"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-full bg-transparent px-3 py-2">
        <button
          type="button"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/80 text-lg font-semibold text-muted-fg shadow-[0_10px_24px_-16px_rgba(15,23,42,0.3)] transition hover:scale-105 hover:text-fg"
          onClick={() => {
            router.back();
          }}
          aria-label="Close"
        >
          ×
        </button>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleEditTrade}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-[0_14px_32px_-18px_rgba(15,23,42,0.3)] transition hover:scale-105"
          >
            Modifica
          </button>
          <button
            type="button"
            onClick={handleDeleteTrade}
            className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-600 shadow-[0_14px_32px_-18px_rgba(220,38,38,0.25)] transition hover:scale-105"
          >
            Elimina
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-black tracking-tight text-fg drop-shadow-sm md:text-5xl">
            Trade details
          </h1>
          <p className="text-sm font-medium text-muted-fg md:text-base">Registered on {formattedDate}</p>
        </header>

        <div className="flex w-full flex-col items-center gap-8">
          <nav className="flex w-full flex-wrap items-center justify-center gap-2 px-2 py-2">
            {[{ label: "Main data", isActive: true }, { label: "Performance", isActive: false }, { label: "Mindset", isActive: false }].map((tab) => (
              <span
                key={tab.label}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab.isActive ? "text-fg" : "text-muted-fg"
                }`}
              >
                {tab.label}
              </span>
            ))}
          </nav>

          <div className="w-full rounded-[2.5rem] bg-white/85 px-4 py-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.32)] backdrop-blur md:px-6 md:py-8">
            <div className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-x-auto rounded-full bg-transparent px-1 py-1">
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
                    className={`flex min-w-[62px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold md:min-w-[88px] md:text-sm ${
                      isSelected ? "bg-accent text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.3)]" : "text-muted-fg"
                    }`}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-black" : "font-bold"}`}>{dayNumber}</span>
                    <span className="text-[10px] tracking-[0.3em] md:text-xs">{monthLabel}</span>
                  </div>
                );
              })}

              <div className="ml-auto hidden h-14 w-14 flex-none items-center justify-center rounded-full bg-white/90 text-muted-fg shadow-[0_12px_30px_-20px_rgba(15,23,42,0.3)] md:flex">
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

            <p className="mt-5 text-sm font-medium text-muted-fg md:text-base">
              Day of the week: <span className="font-semibold capitalize text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full rounded-[2.5rem] bg-white/85 px-5 py-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.32)] backdrop-blur md:px-6 md:py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</span>
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]">
                  <span className="text-2xl" aria-hidden="true">
                    {activeSymbol.flag}
                  </span>
                  <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
                    {activeSymbol.code}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Open Time</span>
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-fg">
                      {openTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
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
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Close Time</span>
                <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-fg">
                      {closeTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
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
          </div>

          <div className="w-full rounded-[2.5rem] bg-white/85 px-5 py-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.32)] backdrop-blur md:px-6 md:py-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Images</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-fg/80">
                  Before the position
                </span>
              </div>

              {imageData ? (
                <div className="flex flex-col gap-3">
                  <div className="relative flex items-center justify-center overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]" style={{ minHeight: "240px" }}>
                    <Image
                      src={imageData}
                      alt="Trade context attachment"
                      fill
                      sizes="(min-width: 768px) 560px, 90vw"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-muted-fg">
                    This is the snapshot you saved when registering the trade.
                  </p>
                </div>
              ) : (
                <p className="rounded-3xl border border-dashed border-border/70 bg-white/60 px-5 py-6 text-center text-xs font-medium text-muted-fg">
                  No image was attached to this trade.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deleteTrade, loadTrades, type StoredTrade } from "@/lib/tradesStorage";

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

    const trades = loadTrades();
    const match = trades.find((storedTrade) => storedTrade.id === tradeId) ?? null;

    setState({ status: match ? "ready" : "missing", trade: match });
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
    router.push("/");
  };

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-6 py-10 text-fg">
      <div className="absolute right-6 top-6 flex flex-col items-end gap-3 text-right md:flex-row md:items-center md:gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-border/60 bg-white/70 px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-muted-fg shadow-sm transition hover:scale-105 hover:text-fg"
          >
            Back
          </Link>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-white/70 text-lg font-semibold text-muted-fg shadow-sm transition hover:scale-105 hover:text-fg"
            onClick={() => {
              router.back();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-border/70 bg-white px-4 py-2 text-sm font-semibold text-muted-fg">
            Saved trade
          </span>
          <button
            type="button"
            onClick={handleEditTrade}
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:scale-105"
          >
            Modifica
          </button>
          <button
            type="button"
            onClick={handleDeleteTrade}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-600 shadow-sm transition hover:scale-105"
          >
            Elimina
          </button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-12 text-center">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-black tracking-tight text-fg drop-shadow-sm md:text-5xl">
            Trade details
          </h1>
          <p className="text-sm font-medium text-muted-fg md:text-base">Registered on {formattedDate}</p>
        </header>

        <div className="flex flex-col items-center gap-8">
          <nav className="flex items-center gap-3 rounded-full border border-border/60 bg-white/60 px-2 py-2 shadow-lg shadow-black/5 backdrop-blur">
            {[{ label: "Main data", isActive: true }, { label: "Performance", isActive: false }, { label: "Mindset", isActive: false }].map((tab) => (
              <span
                key={tab.label}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tab.isActive ? "bg-accent text-white shadow" : "text-muted-fg"}`}
              >
                {tab.label}
              </span>
            ))}
          </nav>

          <div className="w-full rounded-[2.5rem] border border-border/60 bg-white/80 px-4 py-8 shadow-lg shadow-black/10 backdrop-blur">
            <div className="mx-auto flex max-w-xl items-center gap-2 overflow-x-auto rounded-full bg-transparent px-2 py-1">
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
                    className={`flex min-w-[66px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold md:min-w-[88px] md:text-sm ${
                      isSelected ? "bg-accent text-white shadow" : "text-muted-fg"
                    }`}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-black" : "font-bold"}`}>{dayNumber}</span>
                    <span className="text-[10px] tracking-[0.3em] md:text-xs">{monthLabel}</span>
                  </div>
                );
              })}

              <div className="ml-auto flex h-14 w-14 flex-none items-center justify-center rounded-full border border-border/70 bg-white text-muted-fg shadow-sm">
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

            <p className="mt-6 text-sm font-medium text-muted-fg md:text-base">
              Day of the week: <span className="font-semibold capitalize text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full rounded-[2.5rem] border border-border/60 bg-white/80 px-6 py-8 shadow-lg shadow-black/10 backdrop-blur">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white px-4 py-3 shadow-sm">
                    <span className="text-2xl" aria-hidden="true">
                      {activeSymbol.flag}
                    </span>
                    <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
                      {activeSymbol.code}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-border/40 bg-white/80 p-4 text-left shadow-inner shadow-black/5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-fg">Notes</h2>
                <p className="mt-3 text-sm text-muted-fg">
                  This trade was registered from the quick entry page. Additional performance or mindset notes can be stored in upcoming updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

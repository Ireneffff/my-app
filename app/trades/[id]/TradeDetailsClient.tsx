"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { deleteTrade, getTradeById, type StoredTrade } from "@/lib/tradesStorage";

type TradeDetailsClientProps = {
  tradeId: string;
};

export default function TradeDetailsClient({ tradeId }: TradeDetailsClientProps) {
  const router = useRouter();
  const [trade, setTrade] = useState<StoredTrade | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setTrade(getTradeById(tradeId));
    setIsReady(true);
  }, [tradeId]);

  const formattedDate = useMemo(() => {
    if (!trade) {
      return "";
    }

    return new Date(trade.date).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  }, [trade]);

  if (!isReady) {
    return (
      <section className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10">
        <p className="text-center text-muted-fg">Loading trade…</p>
      </section>
    );
  }

  if (!trade) {
    return (
      <section className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10">
        <Card className="flex flex-1 flex-col items-center justify-center gap-6 bg-white/80 p-8 text-center">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-fg">Trade not found</h1>
            <p className="text-sm text-muted-fg">
              It looks like this trade is no longer available.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              router.push("/");
            }}
          >
            Back to home
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trade details</p>
          <h1 className="mt-2 text-3xl font-black text-fg">{trade.symbolCode}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/new-trade?edit=${trade.id}`} className="inline-flex">
            <Button variant="secondary" className="rounded-full px-6 uppercase tracking-[0.3em]">
              modifica
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="rounded-full border border-border px-6 uppercase tracking-[0.3em] text-red-600 hover:text-red-700"
            onClick={() => {
              deleteTrade(trade.id);
              router.push("/");
            }}
          >
            elimina
          </Button>
          <Button
            variant="ghost"
            className="rounded-full border border-border px-6 uppercase tracking-[0.3em]"
            onClick={() => {
              router.push("/");
            }}
          >
            chiudi
          </Button>
        </div>
      </header>

      <Card className="flex flex-col gap-6 bg-white/80 p-8">
        <div className="flex items-center gap-4">
          <span className="text-4xl" aria-hidden="true">
            {trade.symbolFlag}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</p>
            <p className="text-lg font-semibold tracking-[0.2em] text-fg">{trade.symbolCode}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Date</p>
          <p className="text-base font-medium text-fg">{formattedDate}</p>
        </div>
      </Card>
    </section>
  );
}

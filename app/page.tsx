"use client";

import { useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabaseClient";

type RawTrade = {
  executed_at?: unknown;
  [key: string]: unknown;
};

type NormalizedTrade = Omit<RawTrade, "executed_at"> & {
  executedAt: Date;
};

export function normalizeTrade(trade: RawTrade): NormalizedTrade | null {
  const { executed_at: executedAtRaw, ...rest } = trade;

  if (
    typeof executedAtRaw !== "string" &&
    typeof executedAtRaw !== "number" &&
    !(executedAtRaw instanceof Date)
  ) {
    return null;
  }

  const executedAt = new Date(executedAtRaw);

  return {
    ...rest,
    executedAt,
  };
}

export default function Home() {
  useEffect(() => {
    async function checkSupabase() {
      // Controllo sessione
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();
      console.log("Supabase session:", session, "Error:", sessionError);

      // Test lettura tabella "profiles"
      const { data, error } = await supabase.from("profiles").select("*").limit(5);
      if (error) {
        console.error("Supabase error:", error.message);
      } else {
        console.log("Supabase profiles:", data);
      }
    }

    checkSupabase();
  }, []);

  return (
    <section className="mx-auto flex min-h-dvh max-w-3xl items-center justify-center px-5">
      <Card className="max-w-2xl">
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-fg sm:text-5xl">
          Trading Journal
        </h1>
        <p className="mt-3 text-center text-lg text-muted-fg">
          Calm mind, strong trade
        </p>

        <div className="mt-8 flex justify-center">
          <Link href="/new-trade">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<span className="text-xl">+</span>}
            >
              Register a trade
            </Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
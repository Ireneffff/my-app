import { supabase } from "./supabaseClient";

export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  date: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageData?: string | null;
  imageUrl?: string | null;
  position: "LONG" | "SHORT";
  riskReward?: string | null;
  risk?: string | null;
  pips?: string | null;
};

const STORAGE_KEY = "registeredTrades";
const TRADES_UPDATED_EVENT = "registered-trades-changed";

const TRADES_TABLE =
  process.env.NEXT_PUBLIC_SUPABASE_TRADES_TABLE?.trim() || "registered_trades";

type SupabaseTradeRow = {
  id: string;
  symbol_code?: string;
  symbolCode?: string;
  symbol_flag?: string;
  symbolFlag?: string;
  date: string;
  open_time?: string | null;
  openTime?: string | null;
  close_time?: string | null;
  closeTime?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  position: "LONG" | "SHORT";
  risk_reward?: string | null;
  riskReward?: string | null;
  risk?: string | null;
  pips?: string | null;
};

function notifyTradesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TRADES_UPDATED_EVENT));
}

function parseTrades(raw: string | null): StoredTrade[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as StoredTrade).id !== "string" ||
          typeof (item as StoredTrade).symbolCode !== "string" ||
          typeof (item as StoredTrade).symbolFlag !== "string" ||
          typeof (item as StoredTrade).date !== "string"
        ) {
          return null;
        }

        const storedItem = item as StoredTrade;

        if (
          storedItem.openTime !== undefined &&
          storedItem.openTime !== null &&
          typeof storedItem.openTime !== "string"
        ) {
          storedItem.openTime = null;
        }

        if (
          storedItem.closeTime !== undefined &&
          storedItem.closeTime !== null &&
          typeof storedItem.closeTime !== "string"
        ) {
          storedItem.closeTime = null;
        }

        if (
          storedItem.imageData !== undefined &&
          storedItem.imageData !== null &&
          typeof storedItem.imageData !== "string"
        ) {
          storedItem.imageData = null;
        }

        if (
          storedItem.imageUrl !== undefined &&
          storedItem.imageUrl !== null &&
          typeof storedItem.imageUrl !== "string"
        ) {
          storedItem.imageUrl = null;
        }

        const normalizedImageUrl =
          storedItem.imageUrl ?? storedItem.imageData ?? null;

        if (storedItem.imageData === undefined) {
          storedItem.imageData = normalizedImageUrl;
        }

        if (storedItem.imageUrl === undefined) {
          storedItem.imageUrl = normalizedImageUrl;
        }

        if (storedItem.position !== "LONG" && storedItem.position !== "SHORT") {
          storedItem.position = "LONG";
        }

        if (
          storedItem.riskReward !== undefined &&
          storedItem.riskReward !== null &&
          typeof storedItem.riskReward !== "string"
        ) {
          storedItem.riskReward = null;
        }

        if (storedItem.riskReward === undefined) {
          storedItem.riskReward = null;
        }

        if (storedItem.risk !== undefined && storedItem.risk !== null && typeof storedItem.risk !== "string") {
          storedItem.risk = null;
        }

        if (storedItem.risk === undefined) {
          storedItem.risk = null;
        }

        if (storedItem.pips !== undefined && storedItem.pips !== null && typeof storedItem.pips !== "string") {
          storedItem.pips = null;
        }

        if (storedItem.pips === undefined) {
          storedItem.pips = null;
        }

        return storedItem;
      })
      .filter((item): item is StoredTrade => item !== null);
  } catch (error) {
    console.error("Failed to parse stored trades", error);
    return [];
  }
}

export function loadTrades(): StoredTrade[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  return parseTrades(raw);
}

function mapSupabaseRowToStoredTrade(row: SupabaseTradeRow): StoredTrade {
  const imageUrl = row.image_url ?? row.imageUrl ?? null;

  const symbolCode = row.symbol_code ?? row.symbolCode ?? "";
  const symbolFlag = row.symbol_flag ?? row.symbolFlag ?? "";
  const openTime = row.open_time ?? row.openTime ?? null;
  const closeTime = row.close_time ?? row.closeTime ?? null;
  const riskReward = row.risk_reward ?? row.riskReward ?? null;

  return {
    id: row.id,
    symbolCode,
    symbolFlag,
    date: row.date,
    openTime,
    closeTime,
    imageUrl,
    imageData: imageUrl,
    position: row.position === "SHORT" ? "SHORT" : "LONG",
    riskReward,
    risk: row.risk ?? null,
    pips: row.pips ?? null,
  };
}

function mapStoredTradeToSupabaseRow(trade: StoredTrade): SupabaseTradeRow {
  return {
    id: trade.id,
    symbol_code: trade.symbolCode,
    symbol_flag: trade.symbolFlag,
    date: trade.date,
    open_time: trade.openTime ?? null,
    close_time: trade.closeTime ?? null,
    image_url: trade.imageUrl ?? trade.imageData ?? null,
    position: trade.position === "SHORT" ? "SHORT" : "LONG",
    risk_reward: trade.riskReward ?? null,
    risk: trade.risk ?? null,
    pips: trade.pips ?? null,
  };
}

export async function fetchTradesFromSupabase(): Promise<StoredTrade[]> {
  const { data, error } = await supabase
    .from<SupabaseTradeRow>(TRADES_TABLE)
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  return data.map(mapSupabaseRowToStoredTrade);
}

export async function syncTradesFromSupabase(): Promise<StoredTrade[]> {
  const trades = await fetchTradesFromSupabase();

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    notifyTradesChanged();
  }

  return trades;
}

export async function persistTradeRecord(trade: StoredTrade) {
  const row = mapStoredTradeToSupabaseRow(trade);
  const { error } = await supabase
    .from<SupabaseTradeRow>(TRADES_TABLE)
    .upsert(row, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTradeRecord(tradeId: string) {
  const { error } = await supabase
    .from<SupabaseTradeRow>(TRADES_TABLE)
    .delete()
    .eq("id", tradeId);

  if (error) {
    throw new Error(error.message);
  }
}

export function saveTrade(trade: StoredTrade) {
  if (typeof window === "undefined") {
    return;
  }

  const currentTrades = loadTrades();
  const updatedTrades = [trade, ...currentTrades];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrades));
  notifyTradesChanged();
}

export function updateTrade(trade: StoredTrade) {
  if (typeof window === "undefined") {
    return;
  }

  const currentTrades = loadTrades();
  const updatedTrades = currentTrades.map((storedTrade) =>
    storedTrade.id === trade.id ? trade : storedTrade,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrades));
  notifyTradesChanged();
}

export function deleteTrade(tradeId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentTrades = loadTrades();
  const updatedTrades = currentTrades.filter((trade) => trade.id !== tradeId);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrades));
  notifyTradesChanged();
}

export const REGISTERED_TRADES_STORAGE_KEY = STORAGE_KEY;
export const REGISTERED_TRADES_UPDATED_EVENT = TRADES_UPDATED_EVENT;

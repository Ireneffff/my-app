import { supabase } from "./supabaseClient";
import { getCurrentUser } from "./authSession";

export type StoredLibraryItem = {
  id: string;
  imageData: string | null;
  notes: string;
};

export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  date: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageData?: string | null;
  libraryItems?: StoredLibraryItem[];
  position: "LONG" | "SHORT";
  riskReward?: string | null;
  risk?: string | null;
  pips?: string | null;
};

const TABLE_NAME = "registered_trades";
const TRADES_UPDATED_EVENT = "registered-trades-changed";

type SupabaseTradeRow = {
  id: string;
  user_id: string;
  symbol_code: string | null;
  symbol_flag: string | null;
  date: string | null;
  open_time: string | null;
  close_time: string | null;
  image_data: string | null;
  library_items: unknown;
  position: string | null;
  risk_reward: string | null;
  risk: string | null;
  pips: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SupabaseTradeInsert = {
  id: string;
  user_id: string;
  symbol_code: string;
  symbol_flag: string;
  date: string;
  open_time: string | null;
  close_time: string | null;
  image_data: string | null;
  library_items: StoredLibraryItem[];
  position: "LONG" | "SHORT";
  risk_reward: string | null;
  risk: string | null;
  pips: string | null;
};

type MaybeSupabaseError = {
  message?: string;
  details?: string;
  status?: number;
};

function logSupabaseError(context: string, error: unknown) {
  if (error && typeof error === "object") {
    const supabaseError = error as MaybeSupabaseError;
    const message =
      typeof supabaseError.message === "string" && supabaseError.message.length > 0
        ? supabaseError.message
        : null;
    const details =
      typeof supabaseError.details === "string" && supabaseError.details.length > 0
        ? supabaseError.details
        : null;
    const status =
      typeof supabaseError.status === "number" && Number.isFinite(supabaseError.status)
        ? supabaseError.status
        : null;

    if (message || details || status !== null) {
      console.error(context, { message, details, status, error });
      return;
    }
  }

  console.error(context, error);
}

function notifyTradesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TRADES_UPDATED_EVENT));
}

function sanitizeLibraryItems(raw: unknown): StoredLibraryItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const parsedItem = item as StoredLibraryItem;

      if (typeof parsedItem.id !== "string" || parsedItem.id.trim().length === 0) {
        return null;
      }

      if (parsedItem.imageData !== null && typeof parsedItem.imageData !== "string") {
        return null;
      }

      return {
        id: parsedItem.id,
        imageData: parsedItem.imageData ?? null,
        notes: typeof parsedItem.notes === "string" ? parsedItem.notes : "",
      } satisfies StoredLibraryItem;
    })
    .filter((item): item is StoredLibraryItem => item !== null);
}

function sanitizeTrade(row: SupabaseTradeRow): StoredTrade | null {
  if (
    !row ||
    typeof row !== "object" ||
    typeof row.id !== "string" ||
    typeof row.symbol_code !== "string" ||
    typeof row.symbol_flag !== "string" ||
    typeof row.date !== "string"
  ) {
    return null;
  }

  const libraryItems = sanitizeLibraryItems(row.library_items);

  const openTime = typeof row.open_time === "string" ? row.open_time : null;
  const closeTime = typeof row.close_time === "string" ? row.close_time : null;
  const imageData = typeof row.image_data === "string" ? row.image_data : null;
  const riskReward = typeof row.risk_reward === "string" ? row.risk_reward : null;
  const risk = typeof row.risk === "string" ? row.risk : null;
  const pips = typeof row.pips === "string" ? row.pips : null;

  const position = row.position === "LONG" || row.position === "SHORT" ? row.position : "LONG";

  return {
    id: row.id,
    symbolCode: row.symbol_code,
    symbolFlag: row.symbol_flag,
    date: row.date,
    openTime,
    closeTime,
    imageData,
    libraryItems,
    position,
    riskReward,
    risk,
    pips,
  } satisfies StoredTrade;
}

function mapTradeToInsert(trade: StoredTrade, userId: string): SupabaseTradeInsert {
  const libraryItems = sanitizeLibraryItems(trade.libraryItems ?? []);
  const position = trade.position === "SHORT" ? "SHORT" : "LONG";

  return {
    id: trade.id,
    user_id: userId,
    symbol_code: trade.symbolCode,
    symbol_flag: trade.symbolFlag,
    date: trade.date,
    open_time: trade.openTime ?? null,
    close_time: trade.closeTime ?? null,
    image_data: trade.imageData ?? null,
    library_items: libraryItems,
    position,
    risk_reward: trade.riskReward ?? null,
    risk: trade.risk ?? null,
    pips: trade.pips ?? null,
  } satisfies SupabaseTradeInsert;
}

async function getCurrentUserId() {
  const user = await getCurrentUser();

  if (!user?.id) {
    console.error("No authenticated Supabase user was found when required");
    return null;
  }

  return user.id;
}

export async function loadTrades(): Promise<StoredTrade[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    logSupabaseError("Failed to load trades from Supabase", error);
    return [];
  }

  return (data ?? [])
    .map((row) => sanitizeTrade(row as SupabaseTradeRow))
    .filter((trade): trade is StoredTrade => trade !== null);
}

export async function loadTradeById(tradeId: string): Promise<StoredTrade | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .eq("id", tradeId)
    .maybeSingle();

  if (error) {
    logSupabaseError("Failed to load trade from Supabase", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return sanitizeTrade(data as SupabaseTradeRow);
}

export async function saveTrade(trade: StoredTrade) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User session is required to save a trade");
  }

  const payload = mapTradeToInsert(trade, userId);
  const { error } = await supabase.from(TABLE_NAME).insert([payload]);

  if (error) {
    logSupabaseError("Failed to save trade to Supabase", error);
    throw error;
  }

  notifyTradesChanged();
}

export async function updateTrade(trade: StoredTrade) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User session is required to update a trade");
  }

  const payload = mapTradeToInsert(trade, userId);
  const { error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", trade.id)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("Failed to update trade in Supabase", error);
    throw error;
  }

  notifyTradesChanged();
}

export async function deleteTrade(tradeId: string) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("User session is required to delete a trade");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", tradeId)
    .eq("user_id", userId);

  if (error) {
    logSupabaseError("Failed to delete trade from Supabase", error);
    throw error;
  }

  notifyTradesChanged();
}

export const REGISTERED_TRADES_UPDATED_EVENT = TRADES_UPDATED_EVENT;

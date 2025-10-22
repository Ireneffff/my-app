import { Buffer } from "buffer";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase, assertSupabaseConfigured } from "./supabaseClient";
import { getSymbolMetadata } from "./symbols";

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
  entryPrice?: string | null;
  exitPrice?: string | null;
  stopLoss?: string | null;
  takeProfit?: string | null;
  pnl?: string | null;
  preTradeMentalState?: string | null;
  emotionsDuringTrade?: string | null;
  emotionsAfterTrade?: string | null;
  confidenceLevel?: string | null;
  emotionalTrigger?: string | null;
  followedPlan?: string | null;
  respectedRisk?: string | null;
  wouldRepeatTrade?: string | null;
  mentalState?: string | null;
  riskReward?: string | null;
  risk?: string | null;
  pips?: string | null;
  notes?: string | null;
  isPaperTrade?: boolean | null;
};

const TRADES_TABLE = "registered_trades";
const TRADE_LIBRARY_TABLE = "trade_library";
const TRADE_PHOTOS_BUCKET = "trade_photos";
export const REGISTERED_TRADES_UPDATED_EVENT = "registered-trades-changed";

let cachedTrades: StoredTrade[] = [];
let tradesRealtimeChannel: RealtimeChannel | null = null;
let initializePromise: Promise<void> | null = null;

const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/i;

function notifyTradesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(REGISTERED_TRADES_UPDATED_EVENT));
}

function setCachedTrades(trades: StoredTrade[]) {
  cachedTrades = trades;
  notifyTradesChanged();
}

function upsertCachedTrade(trade: StoredTrade) {
  cachedTrades = [trade, ...cachedTrades.filter((item) => item.id !== trade.id)];
  notifyTradesChanged();
}

function removeCachedTrade(tradeId: string) {
  const nextTrades = cachedTrades.filter((trade) => trade.id !== tradeId);
  if (nextTrades.length === cachedTrades.length) {
    return;
  }

  cachedTrades = nextTrades;
  notifyTradesChanged();
}

type TradeLibraryRow = {
  id: string;
  trade_id: string;
  photo_url: string | null;
  note: string | null;
};

type RegisteredTradeRow = {
  id: string;
  created_at: string;
  symbol: string | null;
  is_paper_trade: boolean | null;
  open_time: string | null;
  close_time: string | null;
  position: string | null;
  rr_ratio: string | null;
  risk_percent: string | null;
  pips: string | null;
  entry_price: string | null;
  exit_price: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  p_l: string | null;
  mental_state_before: string | null;
  emotions_during: string | null;
  emotions_after: string | null;
  confidence_level: string | null;
  emotional_triggers: string | null;
  followed_plan: string | null;
  respected_risk: string | null;
  repeat_trade: string | null;
  notes: string | null;
  library_photo_url: string | null;
  library_note: string | null;
  trade_library?: TradeLibraryRow[] | null;
};

function normalizeIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function mapRowToStoredTrade(row: RegisteredTradeRow): StoredTrade {
  const symbolCode = normalizeOptionalString(row.symbol) ?? "";
  const symbolMetadata = getSymbolMetadata(symbolCode);
  const libraryRows = Array.isArray(row.trade_library) ? row.trade_library : [];
  const mappedLibraryItems = libraryRows
    .map((libraryRow) => {
      const photoUrl = normalizeOptionalString(libraryRow.photo_url);
      const note = typeof libraryRow.note === "string" ? libraryRow.note : "";
      const hasContent = Boolean(photoUrl) || note.trim().length > 0;

      if (!hasContent) {
        return null;
      }

      return {
        id: libraryRow.id,
        imageData: photoUrl,
        notes: note,
      } satisfies StoredLibraryItem;
    })
    .filter((item): item is StoredLibraryItem => Boolean(item));

  const legacyLibraryPhotoUrl = normalizeOptionalString(row.library_photo_url);
  const legacyLibraryNote = typeof row.library_note === "string" ? row.library_note : "";
  const hasLegacyLibraryContent =
    Boolean(legacyLibraryPhotoUrl) || legacyLibraryNote.trim().length > 0;

  const libraryItems =
    mappedLibraryItems.length > 0
      ? mappedLibraryItems
      : hasLegacyLibraryContent
      ? [
          {
            id: "library-legacy",
            imageData: legacyLibraryPhotoUrl,
            notes: legacyLibraryNote,
          } satisfies StoredLibraryItem,
        ]
      : [];

  const primaryLibraryImage = libraryItems.find((item) => hasLibraryImage(item.imageData))?.imageData;
  const fallbackLegacyImage = hasLibraryImage(legacyLibraryPhotoUrl) ? legacyLibraryPhotoUrl : null;

  return {
    id: row.id,
    symbolCode,
    symbolFlag: symbolMetadata?.flag ?? "",
    date: normalizeIso(row.open_time ?? row.created_at) ?? new Date().toISOString(),
    openTime: normalizeIso(row.open_time),
    closeTime: normalizeIso(row.close_time),
    imageData: primaryLibraryImage ?? fallbackLegacyImage,
    libraryItems,
    position: row.position === "SHORT" ? "SHORT" : "LONG",
    entryPrice: normalizeOptionalString(row.entry_price),
    exitPrice: normalizeOptionalString(row.exit_price),
    stopLoss: normalizeOptionalString(row.stop_loss),
    takeProfit: normalizeOptionalString(row.take_profit),
    pnl: normalizeOptionalString(row.p_l),
    preTradeMentalState: normalizeOptionalString(row.mental_state_before),
    emotionsDuringTrade: normalizeOptionalString(row.emotions_during),
    emotionsAfterTrade: normalizeOptionalString(row.emotions_after),
    confidenceLevel: normalizeOptionalString(row.confidence_level),
    emotionalTrigger: normalizeOptionalString(row.emotional_triggers),
    followedPlan: normalizeOptionalString(row.followed_plan),
    respectedRisk: normalizeOptionalString(row.respected_risk),
    wouldRepeatTrade: normalizeOptionalString(row.repeat_trade),
    mentalState: normalizeOptionalString(row.mental_state_before),
    riskReward: normalizeOptionalString(row.rr_ratio),
    risk: normalizeOptionalString(row.risk_percent),
    pips: normalizeOptionalString(row.pips),
    notes: normalizeOptionalString(row.notes),
    isPaperTrade: row.is_paper_trade,
  } satisfies StoredTrade;
}

function hasLibraryImage(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function buildTradePayload(trade: StoredTrade) {
  return {
    id: trade.id,
    symbol: normalizeOptionalString(trade.symbolCode),
    is_paper_trade: trade.isPaperTrade ?? null,
    open_time: normalizeIso(trade.openTime ?? trade.date) ?? null,
    close_time: normalizeIso(trade.closeTime),
    position: trade.position,
    rr_ratio: normalizeOptionalString(trade.riskReward),
    risk_percent: normalizeOptionalString(trade.risk),
    pips: normalizeOptionalString(trade.pips),
    entry_price: normalizeOptionalString(trade.entryPrice),
    exit_price: normalizeOptionalString(trade.exitPrice),
    stop_loss: normalizeOptionalString(trade.stopLoss),
    take_profit: normalizeOptionalString(trade.takeProfit),
    p_l: normalizeOptionalString(trade.pnl),
    mental_state_before: normalizeOptionalString(
      trade.preTradeMentalState ?? trade.mentalState ?? undefined,
    ),
    emotions_during: normalizeOptionalString(trade.emotionsDuringTrade),
    emotions_after: normalizeOptionalString(trade.emotionsAfterTrade),
    confidence_level: normalizeOptionalString(trade.confidenceLevel),
    emotional_triggers: normalizeOptionalString(trade.emotionalTrigger),
    followed_plan: normalizeOptionalString(trade.followedPlan),
    respected_risk: normalizeOptionalString(trade.respectedRisk),
    repeat_trade: normalizeOptionalString(trade.wouldRepeatTrade),
    notes: normalizeOptionalString(trade.notes),
    library_photo_url: null,
    library_note: null,
  } satisfies Partial<RegisteredTradeRow>;
}

type NormalizedLibraryItem = {
  originalId: string;
  note: string;
  photoUrl: string | null;
  hasContent: boolean;
  originalIndex: number;
};

async function resolveLibraryImage(tradeId: string, imageData: string): Promise<string> {
  const normalized = imageData.trim();
  if (!normalized) {
    return normalized;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  let blob: Blob;
  let extension: string;

  if (normalized.startsWith("data:")) {
    const decoded = decodeDataUrl(normalized);
    blob = decoded.blob;
    extension = decoded.extension;
  } else {
    const response = await fetch(normalized);
    if (!response.ok) {
      throw new Error("Failed to download trade image for upload");
    }

    blob = await response.blob();
    extension = guessExtensionFromBlob(blob);
  }

  const fileName = `${tradeId}/${crypto.randomUUID()}.${extension}`;
  assertSupabaseConfigured();
  const { error } = await supabase.storage
    .from(TRADE_PHOTOS_BUCKET)
    .upload(fileName, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: blob.type || undefined,
    });

  if (error) {
    console.error(
      `Supabase storage upload failed for trade ${tradeId} while saving library attachment`,
      error.message,
      error,
    );
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(TRADE_PHOTOS_BUCKET).getPublicUrl(fileName);

  if (!publicUrl) {
    const message = `Missing public URL for uploaded library attachment at path ${fileName}`;
    console.error(message);
    throw new Error(message);
  }

  return publicUrl;
}

async function normalizeLibraryItemForPersistence(
  tradeId: string,
  item: StoredLibraryItem | null | undefined,
  index: number,
): Promise<NormalizedLibraryItem> {
  const originalId = typeof item?.id === "string" && item.id.trim().length > 0 ? item.id : `item-${index}`;
  const rawNote = typeof item?.notes === "string" ? item.notes : "";
  const trimmedImage = typeof item?.imageData === "string" ? item.imageData.trim() : "";

  let photoUrl: string | null = null;
  if (trimmedImage) {
    photoUrl = await resolveLibraryImage(tradeId, trimmedImage);
  }

  const hasContent = Boolean(photoUrl) || rawNote.trim().length > 0;

  return {
    originalId,
    note: rawNote,
    photoUrl,
    hasContent,
    originalIndex: index,
  } satisfies NormalizedLibraryItem;
}

async function synchronizeTradeLibrary(
  tradeId: string,
  normalizedItems: NormalizedLibraryItem[],
): Promise<TradeLibraryRow[]> {
  assertSupabaseConfigured();

  const { data: existingData, error: existingError } = await supabase
    .from(TRADE_LIBRARY_TABLE)
    .select("*")
    .eq("trade_id", tradeId);

  if (existingError) {
    console.error(
      `Supabase select failed while reading library entries for trade ${tradeId}`,
      existingError.message,
      existingError,
    );
    throw existingError;
  }

  const existingRows = (existingData ?? []) as TradeLibraryRow[];
  const existingMap = new Map(existingRows.map((row) => [row.id, row]));
  const results: { row: TradeLibraryRow; originalIndex: number }[] = [];
  const idsToDelete: string[] = [];

  for (const item of normalizedItems) {
    const existingRow = existingMap.get(item.originalId);

    if (existingRow) {
      existingMap.delete(item.originalId);

      if (!item.hasContent) {
        idsToDelete.push(existingRow.id);
        continue;
      }

      const { data: updatedRow, error: updateError } = await supabase
        .from(TRADE_LIBRARY_TABLE)
        .update({ photo_url: item.photoUrl, note: item.note })
        .eq("id", existingRow.id)
        .select("*")
        .single();

      if (updateError) {
        console.error(
          `Supabase update failed while syncing library entry ${existingRow.id} for trade ${tradeId}`,
          updateError.message,
          updateError,
        );
        throw updateError;
      }

      results.push({ row: updatedRow as TradeLibraryRow, originalIndex: item.originalIndex });
      continue;
    }

    if (!item.hasContent) {
      continue;
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from(TRADE_LIBRARY_TABLE)
      .insert({ trade_id: tradeId, photo_url: item.photoUrl, note: item.note })
      .select("*")
      .single();

    if (insertError) {
      console.error(
        `Supabase insert failed while creating library entry for trade ${tradeId}`,
        insertError.message,
        insertError,
      );
      throw insertError;
    }

    results.push({ row: insertedRow as TradeLibraryRow, originalIndex: item.originalIndex });
  }

  const leftoverIds = Array.from(existingMap.keys());
  if (leftoverIds.length > 0) {
    idsToDelete.push(...leftoverIds);
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(TRADE_LIBRARY_TABLE)
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.error(
        `Supabase delete failed while removing library entries for trade ${tradeId}`,
        deleteError.message,
        deleteError,
      );
      throw deleteError;
    }
  }

  return results
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map((entry) => entry.row);
}

function ensureTradesRealtimeSubscription() {
  if (tradesRealtimeChannel) {
    return;
  }

  assertSupabaseConfigured();
  tradesRealtimeChannel = supabase
    .channel("registered_trades_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TRADES_TABLE },
      async (payload) => {
        if (payload.eventType === "DELETE" && payload.old) {
          removeCachedTrade((payload.old as RegisteredTradeRow).id);
          return;
        }

        const tradeId = ((payload.new ?? payload.old) as RegisteredTradeRow | undefined)?.id;
        if (!tradeId) {
          await refreshTrades();
          return;
        }

        const { data: row, error: selectError } = await supabase
          .from(TRADES_TABLE)
          .select("*, trade_library(*)")
          .eq("id", tradeId)
          .single();

        if (selectError) {
          console.error(
            `Supabase select failed while refreshing trade ${tradeId} after change`,
            selectError.message,
            selectError,
          );
          return;
        }

        const trade = mapRowToStoredTrade(row as RegisteredTradeRow);
        upsertCachedTrade(trade);
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TRADE_LIBRARY_TABLE },
      async (payload) => {
        const tradeId =
          ((payload.new as TradeLibraryRow | null)?.trade_id ??
            (payload.old as TradeLibraryRow | null)?.trade_id) || null;

        if (!tradeId) {
          await refreshTrades();
          return;
        }

        const { data: row, error: selectError } = await supabase
          .from(TRADES_TABLE)
          .select("*, trade_library(*)")
          .eq("id", tradeId)
          .single();

        if (selectError) {
          console.error(
            `Supabase select failed while refreshing trade ${tradeId} after library change`,
            selectError.message,
            selectError,
          );
          return;
        }

        const trade = mapRowToStoredTrade(row as RegisteredTradeRow);
        upsertCachedTrade(trade);
      },
    )
    .subscribe();
}

function decodeDataUrl(dataUrl: string) {
  const match = DATA_URL_REGEX.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid data URL provided for trade image");
  }

  const [, mime, data] = match;
  const byteCharacters = typeof window === "undefined" ? Buffer.from(data, "base64").toString("binary") : atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mime });
  const extension = mime.split("/")[1] ?? "jpg";

  return { blob, extension };
}

function guessExtensionFromBlob(blob: Blob) {
  if (blob.type) {
    const [, subtype] = blob.type.split("/");
    if (subtype) {
      return subtype.replace("svg+xml", "svg");
    }
  }

  return "jpg";
}

export function loadTrades(): StoredTrade[] {
  return cachedTrades;
}

export async function initializeRegisteredTrades() {
  if (!initializePromise) {
    initializePromise = (async () => {
      await refreshTrades();
      ensureTradesRealtimeSubscription();
    })().finally(() => {
      initializePromise = null;
    });
  }

  return initializePromise;
}

export async function refreshTrades() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .select("*, trade_library(*)")
    .order("open_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RegisteredTradeRow[];
  const trades = rows.map(mapRowToStoredTrade);
  setCachedTrades(trades);
  return trades;
}

export async function saveTrade(trade: StoredTrade) {
  const tradeId = normalizeOptionalString(trade.id) ?? crypto.randomUUID();
  const libraryItems = Array.isArray(trade.libraryItems) ? trade.libraryItems : [];
  const effectiveLibraryItems =
    libraryItems.length > 0
      ? libraryItems
      : hasLibraryImage(trade.imageData)
      ? [
          {
            id: "library-fallback",
            imageData: trade.imageData ?? null,
            notes: "",
          } satisfies StoredLibraryItem,
        ]
      : [];
  const normalizedLibraryItems = await Promise.all(
    effectiveLibraryItems.map((item, index) => normalizeLibraryItemForPersistence(tradeId, item, index)),
  );
  const payload = buildTradePayload({ ...trade, id: tradeId });

  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .insert(payload)
    .select("*, trade_library(*)")
    .single();

  if (error) {
    console.error(
      `Supabase insert failed while saving trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  let libraryRows: TradeLibraryRow[] = [];
  try {
    libraryRows = await synchronizeTradeLibrary(tradeId, normalizedLibraryItems);
  } catch (libraryError) {
    console.error(
      `Failed to synchronize library entries while saving trade ${tradeId}`,
      libraryError instanceof Error ? libraryError.message : libraryError,
      libraryError,
    );
    try {
      await supabase.from(TRADES_TABLE).delete().eq("id", tradeId);
    } catch (cleanupError) {
      console.error(
        `Failed to rollback trade ${tradeId} after library sync error`,
        cleanupError instanceof Error ? cleanupError.message : cleanupError,
        cleanupError,
      );
    }
    throw libraryError;
  }

  const storedTrade = mapRowToStoredTrade({
    ...(data as RegisteredTradeRow),
    trade_library: libraryRows,
  });
  upsertCachedTrade(storedTrade);
  return storedTrade;
}

export async function updateTrade(trade: StoredTrade) {
  const tradeId = normalizeOptionalString(trade.id);
  if (!tradeId) {
    throw new Error("Cannot update trade without a valid id");
  }

  const libraryItems = Array.isArray(trade.libraryItems) ? trade.libraryItems : [];
  const effectiveLibraryItems =
    libraryItems.length > 0
      ? libraryItems
      : hasLibraryImage(trade.imageData)
      ? [
          {
            id: "library-fallback",
            imageData: trade.imageData ?? null,
            notes: "",
          } satisfies StoredLibraryItem,
        ]
      : [];
  const normalizedLibraryItems = await Promise.all(
    effectiveLibraryItems.map((item, index) => normalizeLibraryItemForPersistence(tradeId, item, index)),
  );
  const payload = buildTradePayload(trade);
  delete (payload as { id?: string }).id;

  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .update(payload)
    .eq("id", tradeId)
    .select("*, trade_library(*)")
    .single();

  if (error) {
    console.error(
      `Supabase update failed while saving trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  let libraryRows: TradeLibraryRow[] = [];
  try {
    libraryRows = await synchronizeTradeLibrary(tradeId, normalizedLibraryItems);
  } catch (libraryError) {
    console.error(
      `Failed to synchronize library entries while updating trade ${tradeId}`,
      libraryError instanceof Error ? libraryError.message : libraryError,
      libraryError,
    );
    throw libraryError;
  }

  const storedTrade = mapRowToStoredTrade({
    ...(data as RegisteredTradeRow),
    trade_library: libraryRows,
  });
  upsertCachedTrade(storedTrade);
  return storedTrade;
}

export async function deleteTrade(tradeId: string) {
  const normalizedId = normalizeOptionalString(tradeId);
  if (!normalizedId) {
    return;
  }

  assertSupabaseConfigured();
  const { error } = await supabase.from(TRADES_TABLE).delete().eq("id", normalizedId);

  if (error) {
    console.error(
      `Supabase delete failed while removing trade ${normalizedId}`,
      error.message,
      error,
    );
    throw error;
  }

  removeCachedTrade(normalizedId);
}

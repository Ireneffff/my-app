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
  const libraryPhotoUrl = normalizeOptionalString(row.library_photo_url);
  const libraryNote = row.library_note ?? "";
  const hasLibraryNote = libraryNote.trim().length > 0;
  const primaryLibraryItem: StoredLibraryItem | null =
    libraryPhotoUrl || hasLibraryNote
      ? {
          id: "library-primary",
          imageData: libraryPhotoUrl,
          notes: libraryNote,
        }
      : null;

  return {
    id: row.id,
    symbolCode,
    symbolFlag: symbolMetadata?.flag ?? "",
    date: normalizeIso(row.open_time ?? row.created_at) ?? new Date().toISOString(),
    openTime: normalizeIso(row.open_time),
    closeTime: normalizeIso(row.close_time),
    imageData: libraryPhotoUrl,
    libraryItems: primaryLibraryItem ? [primaryLibraryItem] : [],
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

function getPrimaryLibraryItem(trade: StoredTrade): StoredLibraryItem | null {
  const candidates = Array.isArray(trade.libraryItems) ? trade.libraryItems : [];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const imageData = typeof candidate.imageData === "string" ? candidate.imageData : null;
    const notes = typeof candidate.notes === "string" ? candidate.notes : "";
    const hasImage = hasLibraryImage(imageData);
    const hasNote = notes.trim().length > 0;

    if (hasImage || hasNote) {
      return {
        id: candidate.id,
        imageData: hasImage ? imageData : null,
        notes,
      } satisfies StoredLibraryItem;
    }
  }

  if (hasLibraryImage(trade.imageData)) {
    return {
      id: "library-fallback",
      imageData: trade.imageData ?? null,
      notes: "",
    } satisfies StoredLibraryItem;
  }

  return null;
}

function buildTradePayload(
  trade: StoredTrade,
  overrides: { libraryPhotoUrl?: string | null; libraryNote?: string | null } = {},
  primaryLibraryItem: StoredLibraryItem | null = getPrimaryLibraryItem(trade),
) {
  const resolvedPhotoUrl =
    overrides.libraryPhotoUrl ?? primaryLibraryItem?.imageData ?? trade.imageData ?? null;
  const resolvedLibraryNote = overrides.libraryNote ?? primaryLibraryItem?.notes ?? "";

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
    library_photo_url: normalizeOptionalString(resolvedPhotoUrl),
    library_note: resolvedLibraryNote ?? "",
  } satisfies Partial<RegisteredTradeRow>;
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

        if (payload.new) {
          const trade = mapRowToStoredTrade(payload.new as RegisteredTradeRow);
          upsertCachedTrade(trade);
        } else {
          await refreshTrades();
        }
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

async function resolveLibraryAttachment(
  tradeId: string,
  libraryItem: StoredLibraryItem | null,
): Promise<{ libraryPhotoUrl: string | null; libraryNote: string }> {
  if (!libraryItem || !libraryItem.imageData) {
    return { libraryPhotoUrl: null, libraryNote: libraryItem?.notes ?? "" };
  }

  const imageData = libraryItem.imageData;

  if (!imageData || imageData.startsWith("http://") || imageData.startsWith("https://")) {
    return { libraryPhotoUrl: imageData ?? null, libraryNote: libraryItem.notes ?? "" };
  }

  let blob: Blob;
  let extension: string;

  if (imageData.startsWith("data:")) {
    const decoded = decodeDataUrl(imageData);
    blob = decoded.blob;
    extension = decoded.extension;
  } else {
    const response = await fetch(imageData);
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

  return { libraryPhotoUrl: publicUrl, libraryNote: libraryItem.notes ?? "" };
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
    .select("*")
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
  const primaryLibraryItem = getPrimaryLibraryItem(trade);
  const { libraryPhotoUrl, libraryNote } = await resolveLibraryAttachment(tradeId, primaryLibraryItem);
  const payload = buildTradePayload(
    { ...trade, id: tradeId },
    { libraryPhotoUrl, libraryNote },
    primaryLibraryItem,
  );

  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error(
      `Supabase insert failed while saving trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  const storedTrade = mapRowToStoredTrade(data as RegisteredTradeRow);
  upsertCachedTrade(storedTrade);
  return storedTrade;
}

export async function updateTrade(trade: StoredTrade) {
  const tradeId = normalizeOptionalString(trade.id);
  if (!tradeId) {
    throw new Error("Cannot update trade without a valid id");
  }

  const primaryLibraryItem = getPrimaryLibraryItem(trade);
  const { libraryPhotoUrl, libraryNote } = await resolveLibraryAttachment(tradeId, primaryLibraryItem);
  const payload = buildTradePayload(trade, { libraryPhotoUrl, libraryNote }, primaryLibraryItem);
  delete (payload as { id?: string }).id;

  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .update(payload)
    .eq("id", tradeId)
    .select("*")
    .single();

  if (error) {
    console.error(
      `Supabase update failed while saving trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  const storedTrade = mapRowToStoredTrade(data as RegisteredTradeRow);
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

export async function uploadTradePhoto(tradeId: string, file: File | Blob | string) {
  if (!tradeId) {
    throw new Error("Missing trade id for photo upload");
  }

  if (typeof file === "string") {
    const { libraryPhotoUrl } = await resolveLibraryAttachment(tradeId, {
      id: "library-upload",
      imageData: file,
      notes: "",
    });

    if (!libraryPhotoUrl) {
      throw new Error("Unable to upload provided trade image");
    }

    await saveLibraryPhotoUrl(tradeId, libraryPhotoUrl);
    return libraryPhotoUrl;
  }

  const extension = guessExtensionFromBlob(file);
  const fileName = `${tradeId}/${crypto.randomUUID()}.${extension}`;
  assertSupabaseConfigured();
  const { error } = await supabase.storage
    .from(TRADE_PHOTOS_BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (error) {
    console.error(
      `Supabase storage upload failed for trade ${tradeId} while uploading photo`,
      error.message,
      error,
    );
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(TRADE_PHOTOS_BUCKET).getPublicUrl(fileName);

  if (!publicUrl) {
    const message = `Missing public URL for uploaded trade photo at path ${fileName}`;
    console.error(message);
    throw new Error(message);
  }

  await saveLibraryPhotoUrl(tradeId, publicUrl);
  return publicUrl;
}

async function saveLibraryPhotoUrl(tradeId: string, photoUrl: string) {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .update({ library_photo_url: photoUrl })
    .eq("id", tradeId)
    .select("*")
    .single();

  if (error) {
    console.error(
      `Supabase update failed while saving library photo URL for trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  const storedTrade = mapRowToStoredTrade(data as RegisteredTradeRow);
  upsertCachedTrade(storedTrade);
}

export async function saveLibraryNote(tradeId: string, note: string) {
  if (!tradeId) {
    throw new Error("Missing trade id for note update");
  }

  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from(TRADES_TABLE)
    .update({ library_note: note })
    .eq("id", tradeId)
    .select("*")
    .single();

  if (error) {
    console.error(
      `Supabase update failed while saving library note for trade ${tradeId}`,
      error.message,
      error,
    );
    throw error;
  }

  const storedTrade = mapRowToStoredTrade(data as RegisteredTradeRow);
  upsertCachedTrade(storedTrade);
  return storedTrade;
}

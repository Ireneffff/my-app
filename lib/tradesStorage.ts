"use client";

import { supabase } from "./supabaseClient";

const TRADE_PHOTOS_BUCKET = "trade_photos";
const FALLBACK_TRADE_IMAGE_URL =
  "https://dummyimage.com/600x400/cccccc/000000&text=Trade";

export type StoredLibraryItem = {
  id: string;
  imageData: string | null;
  notes: string;
  createdAt: string | null;
  storagePath?: string | null;
  recordId?: string;
  persisted?: boolean;
};

export type LibraryItemFailureStage = "upload" | "insert" | "unknown";

export type LibraryItemFailure = {
  itemId: string;
  stage: LibraryItemFailureStage;
  message: string;
  cause?: Error;
};

export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  isPaperTrade: boolean;
  openTime: string | null;
  closeTime: string | null;
  position: "LONG" | "SHORT";
  riskReward: string | null;
  risk: string | null;
  pips: string | null;
  lotSize: string | null;
  entryPrice: string | null;
  exitPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  pnl: string | null;
  preTradeMentalState: string | null;
  mentalState: string | null;
  emotionsDuringTrade: string | null;
  emotionsAfterTrade: string | null;
  confidenceLevel: string | null;
  emotionalTrigger: string | null;
  followedPlan: string | null;
  respectedRisk: string | null;
  wouldRepeatTrade: string | null;
  notes: string | null;
  date: string;
  createdAt: string | null;
  libraryItems: StoredLibraryItem[];
};

export type TradePayload = {
  id?: string;
  symbolCode: string;
  isPaperTrade: boolean;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  position: "LONG" | "SHORT";
  riskReward: string | null;
  risk: string | null;
  pips: string | null;
  lotSize: string | null;
  entryPrice: string | null;
  exitPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  pnl: string | null;
  // --- PSYCHOLOGY & MINDSET ---
  preTradeMentalState: string | boolean | null;
  emotionsDuringTrade: string | boolean | null;
  emotionsAfterTrade: string | boolean | null;
  confidenceLevel: string | null;
  emotionalTrigger: string | boolean | null;
  followedPlan: string | boolean | null;
  respectedRisk: string | boolean | null;
  wouldRepeatTrade: string | boolean | null;
  notes: string | null;
  libraryItems: StoredLibraryItem[];
};

export type RemovedLibraryItem = {
  recordId: string;
  storagePath?: string | null;
};

export const REGISTERED_TRADES_UPDATED_EVENT = "registered-trades-changed";

const SYMBOL_FLAGS: Record<string, string> = {
  EURUSD: "🇪🇺 🇺🇸",
  GBPUSD: "🇬🇧 🇺🇸",
  USDJPY: "🇺🇸 🇯🇵",
  AUDUSD: "🇦🇺 🇺🇸",
  USDCAD: "🇺🇸 🇨🇦",
  EURGBP: "🇪🇺 🇬🇧",
};

function notifyTradesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(REGISTERED_TRADES_UPDATED_EVENT));
}

function getSymbolFlag(symbolCode: string) {
  const normalized = symbolCode?.toUpperCase?.() ?? "";
  return SYMBOL_FLAGS[normalized] ?? "🏳️";
}

function parseDateValue(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function sanitizeString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  return null;
}

function normalizeMindsetValue(value: unknown): string | boolean | null {
  if (value === true || value === false) {
    return value;
  }

  if (!value || value === "") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function prepareMindsetRecordValue(value: string | boolean | null) {
  if (typeof value === "boolean") {
    return value;
  }

  return sanitizeString(value);
}

function coerceValueToString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function parseMultiValueField(value: string | null | undefined): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.map((entry) => coerceValueToString(entry));
    }
  } catch (error) {
    if (/^[\[{]/.test(trimmed)) {
      console.warn("Failed to parse multi value field, falling back to single value", error);
    }
  }

  return [trimmed];
}

export function serializeMultiValueField(values: string[]): string | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const normalized = values.map((value) => coerceValueToString(value));
  const hasContent = normalized.some((value) => value.trim().length > 0);

  if (!hasContent) {
    return null;
  }

  return JSON.stringify(normalized);
}

function mapTradeRow(row: Record<string, unknown>): StoredTrade {
  const symbolCode = (row?.symbol ?? "").toString();
  const openTime = parseDateValue(row?.open_time);
  const closeTime = parseDateValue(row?.close_time);
  const createdAt = parseDateValue(row?.created_at);

  const dateSource = openTime ?? createdAt ?? new Date().toISOString();

  return {
    id: row?.id?.toString() ?? "",
    symbolCode,
    symbolFlag: getSymbolFlag(symbolCode),
    isPaperTrade: Boolean(row?.is_paper_trade ?? false),
    openTime,
    closeTime,
    position: row?.position === "SHORT" ? "SHORT" : "LONG",
    riskReward: sanitizeString(row?.rr_ratio),
    risk: sanitizeString(row?.risk_percent),
    pips: sanitizeString(row?.pips),
    lotSize: sanitizeString(row?.lot_size),
    entryPrice: sanitizeString(row?.entry_price),
    exitPrice: sanitizeString(row?.exit_price),
    stopLoss: sanitizeString(row?.stop_loss),
    takeProfit: sanitizeString(row?.take_profit),
    pnl: sanitizeString(row?.p_l),
    preTradeMentalState: sanitizeString(row?.mental_state_before ?? row?.mental_state),
    mentalState: sanitizeString(row?.mental_state_before ?? row?.mental_state),
    emotionsDuringTrade: sanitizeString(row?.emotions_during),
    emotionsAfterTrade: sanitizeString(row?.emotions_after),
    confidenceLevel: sanitizeString(row?.confidence_level),
    emotionalTrigger: sanitizeString(row?.emotional_triggers),
    followedPlan: sanitizeString(row?.followed_plan),
    respectedRisk: sanitizeString(row?.respected_risk),
    wouldRepeatTrade: sanitizeString(row?.repeat_trade),
    notes: sanitizeString(row?.notes),
    date: dateSource,
    createdAt,
    libraryItems: [],
  } satisfies StoredTrade;
}

function extractStoragePathFromUrl(url: string | null) {
  if (!url || typeof url !== "string") {
    return null;
  }

  const marker = "/storage/v1/object/public/trade_photos/";
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return url.slice(index + marker.length);
}

async function removeStoragePaths(paths: (string | null | undefined)[]) {
  const targets = paths.filter((path): path is string => typeof path === "string" && path.length > 0);
  const uniqueTargets = Array.from(new Set(targets));

  if (uniqueTargets.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(TRADE_PHOTOS_BUCKET).remove(uniqueTargets);
  if (error) {
    console.error("Failed to remove trade photos", error);
  }
}

async function fetchLibraryPhotoUrls(tradeId: string) {
  const normalizedTradeId = tradeId?.toString?.().trim();

  if (!normalizedTradeId) {
    console.error("Cannot load trade library photos without a trade id");
    return [] as string[];
  }

  const { data, error } = await supabase
    .from("trade_library")
    .select("photo_url")
    .eq("trade_id", normalizedTradeId);

  if (error) {
    console.error("Failed to load trade library photos", error);
    return [] as string[];
  }

  return (data ?? [])
    .map((row) => (typeof row.photo_url === "string" ? row.photo_url : null))
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

async function uploadImageDataUrl(dataUrl: string, tradeId: string) {
  try {
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) {
      throw new Error("Invalid data URL provided for trade image upload");
    }

    const mimeType = mimeMatch[1];
    const extension = mimeType.split("/")[1] ?? "png";
    const uniqueSuffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const fileName = `${tradeId}/${Date.now()}-${uniqueSuffix}.${extension}`;

    const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(TRADE_PHOTOS_BUCKET)
      .upload(fileName, bytes.buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const storagePath = uploadData?.path ?? fileName;
    const { data: publicData } = supabase.storage
      .from(TRADE_PHOTOS_BUCKET)
      .getPublicUrl(storagePath);

    const photoUrl = publicData?.publicUrl;

    if (!photoUrl) {
      throw new Error("Missing public URL for uploaded trade image");
    }

    return {
      photoUrl,
      storagePath,
    };
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to upload trade image", normalizedError);
    throw normalizedError;
  }
}

async function fetchLibraryItems(tradeId: string) {
  if (!tradeId) {
    throw new Error("tradeId is missing before fetching trade_library");
  }

  const normalizedTradeId = tradeId.toString().trim();

  if (!normalizedTradeId) {
    throw new Error("tradeId is empty before fetching trade_library");
  }

  const { data, error } = await supabase
    .from("trade_library")
    .select("id, photo_url, note")
    .eq("trade_id", normalizedTradeId);

  if (error) {
    console.error("Failed to load trade library", error);
    return [] as StoredLibraryItem[];
  }

  return (data ?? []).map((item) => {
    const photoUrl = typeof item.photo_url === "string" ? item.photo_url : null;
    const recordId = item.id?.toString();
    return {
      id: recordId ?? `library-${Math.random().toString(36).slice(2, 10)}`,
      recordId,
      imageData: photoUrl,
      notes: typeof item.note === "string" ? item.note : "",
      createdAt: null,
      storagePath: extractStoragePathFromUrl(photoUrl),
      persisted: true,
    } satisfies StoredLibraryItem;
  });
}

function buildTradeRecord(payload: TradePayload) {
  const openTime = payload.openTime ?? payload.date;
  const closeTime = payload.closeTime ?? null;
  const normalizedPreTradeMentalState = normalizeMindsetValue(payload.preTradeMentalState);
  const normalizedEmotionsDuring = normalizeMindsetValue(payload.emotionsDuringTrade);
  const normalizedEmotionsAfter = normalizeMindsetValue(payload.emotionsAfterTrade);
  const normalizedTrigger = normalizeMindsetValue(payload.emotionalTrigger);
  const normalizedFollowPlan = normalizeMindsetValue(payload.followedPlan);
  const normalizedRespectRisk = normalizeMindsetValue(payload.respectedRisk);
  const normalizedRepeatTrade = normalizeMindsetValue(payload.wouldRepeatTrade);

  return {
    symbol: payload.symbolCode,
    is_paper_trade: payload.isPaperTrade,
    open_time: openTime,
    close_time: closeTime,
    position: payload.position,
    rr_ratio: sanitizeString(payload.riskReward),
    risk_percent: sanitizeString(payload.risk),
    pips: sanitizeString(payload.pips),
    lot_size: sanitizeString(payload.lotSize),
    entry_price: sanitizeString(payload.entryPrice),
    exit_price: sanitizeString(payload.exitPrice),
    stop_loss: sanitizeString(payload.stopLoss),
    take_profit: sanitizeString(payload.takeProfit),
    p_l: sanitizeString(payload.pnl),
    mental_state_before: prepareMindsetRecordValue(normalizedPreTradeMentalState),
    emotions_during: prepareMindsetRecordValue(normalizedEmotionsDuring),
    emotions_after: prepareMindsetRecordValue(normalizedEmotionsAfter),
    confidence_level: sanitizeString(payload.confidenceLevel),
    emotional_triggers: prepareMindsetRecordValue(normalizedTrigger),
    followed_plan: prepareMindsetRecordValue(normalizedFollowPlan),
    respected_risk: prepareMindsetRecordValue(normalizedRespectRisk),
    repeat_trade: prepareMindsetRecordValue(normalizedRepeatTrade),
    notes: sanitizeString(payload.notes),
  };
}

async function saveLibraryItems(
  tradeId: string,
  items: StoredLibraryItem[],
): Promise<LibraryItemFailure[]> {
  const failures: LibraryItemFailure[] = [];

  const normalizedTradeId = tradeId?.toString?.();

  if (!normalizedTradeId) {
    console.error("Cannot save library items without a trade id");
    return (items ?? []).map((item) => ({
      itemId: item?.id ?? "",
      stage: "unknown" as const,
      message: "Missing trade id while saving library items",
    }));
  }

  for (const item of items) {
    let stage: LibraryItemFailureStage = "unknown";

    try {
      let photoUrl: string | null = null;
      let storagePath: string | null = null;
      const hasNote = typeof item.notes === "string" && item.notes.trim().length > 0;

      if (item.imageData && item.imageData.startsWith("data:")) {
        stage = "upload";
        const uploadResult = await uploadImageDataUrl(item.imageData, normalizedTradeId);
        photoUrl = uploadResult.photoUrl;
        storagePath = uploadResult.storagePath;
      } else if (typeof item.imageData === "string" && item.imageData.length > 0) {
        photoUrl = item.imageData;
        storagePath = item.storagePath ?? extractStoragePathFromUrl(photoUrl);
      }

      if (!photoUrl && !hasNote) {
        continue;
      }

      stage = "insert";
      const { error } = await supabase.from("trade_library").insert({
        trade_id: normalizedTradeId,
        photo_url: photoUrl ?? null,
        note: hasNote ? item.notes.trim() : "",
      });

      if (error) {
        throw error;
      }

      if (storagePath) {
        item.storagePath = storagePath;
      }

      console.log("✅ Library item salvato correttamente:", photoUrl ?? "note-only");
    } catch (rawError) {
      const baseError = rawError instanceof Error ? rawError : new Error(String(rawError));
      const failure: LibraryItemFailure = {
        itemId: item.id ?? "",
        stage,
        message: baseError.message,
        cause: baseError,
      };

      const logPrefix =
        stage === "upload"
          ? "❌ Errore upload trade_library:"
          : stage === "insert"
            ? "❌ Errore insert trade_library:"
            : "❌ Errore imprevisto in saveLibraryItems:";

      console.error(logPrefix, baseError);
      failures.push(failure);

      if (stage === "upload") {
        const noteValue = typeof item.notes === "string" ? item.notes.trim() : "";

        try {
          const { error: fallbackError } = await supabase.from("trade_library").insert({
            trade_id: normalizedTradeId,
            photo_url: FALLBACK_TRADE_IMAGE_URL,
            note: noteValue,
          });

          if (fallbackError) {
            console.error("❌ Errore insert fallback trade_library:", fallbackError);
            failures.push({
              itemId: item.id ?? "",
              stage: "insert",
              message: fallbackError.message,
              cause: fallbackError,
            });
          } else {
            console.warn("⚠️ Library item salvato con immagine di fallback");
          }
        } catch (fallbackException) {
          const normalizedFallbackError =
            fallbackException instanceof Error
              ? fallbackException
              : new Error(String(fallbackException));
          console.error("❌ Errore imprevisto durante insert fallback trade_library:", normalizedFallbackError);
          failures.push({
            itemId: item.id ?? "",
            stage: "insert",
            message: normalizedFallbackError.message,
            cause: normalizedFallbackError,
          });
        }
      }
    }
  }

  return failures;
}

export async function loadTrades(): Promise<StoredTrade[]> {
  const { data, error } = await supabase
    .from("registered_trades")
    .select("*")
    .order("open_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load trades", error);
    return [];
  }

  return (data ?? []).map((row) => mapTradeRow(row));
}

export async function loadTradeById(tradeId: string): Promise<StoredTrade | null> {
  if (!tradeId) {
    return null;
  }

  const { data, error } = await supabase
    .from("registered_trades")
    .select("*")
    .eq("id", tradeId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load trade", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const trade = mapTradeRow(data);

  try {
    trade.libraryItems = await fetchLibraryItems(tradeId);
  } catch (libraryError) {
    const normalizedError =
      libraryError instanceof Error ? libraryError : new Error(String(libraryError));
    console.error("Failed to load trade library", normalizedError);
    trade.libraryItems = [];
  }
  return trade;
}

export type SaveTradeResult = {
  tradeId: string;
  libraryFailures: LibraryItemFailure[];
};

export async function saveTrade(payload: TradePayload): Promise<SaveTradeResult> {
  const record = buildTradeRecord(payload);

  const { data, error } = await supabase
    .from("registered_trades")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save trade", error);
    throw error;
  }

  const tradeId = data?.id?.toString();
  if (!tradeId) {
    throw new Error("Missing trade identifier after insert");
  }

  const libraryFailures = await saveLibraryItems(tradeId, payload.libraryItems ?? []);
  notifyTradesChanged();
  return { tradeId, libraryFailures };
}

export async function updateTrade(
  payload: TradePayload,
  options?: { removedLibraryItems?: RemovedLibraryItem[] },
) {
  if (!payload.id) {
    throw new Error("Trade id is required for update");
  }

  const tradeId = payload.id;
  const normalizedTradeId = tradeId.toString();
  const record = buildTradeRecord(payload);

  const { error } = await supabase.from("registered_trades").update(record).eq("id", tradeId);

  if (error) {
    console.error("Failed to update trade", error);
    throw error;
  }

  const removedItems = options?.removedLibraryItems ?? [];
  if (removedItems.length > 0) {
    const recordIds = removedItems.map((item) => item.recordId);
    const { error: removeError } = await supabase.from("trade_library").delete().in("id", recordIds);

    if (removeError) {
      console.error("Failed to delete library entries", removeError);
    }

    await removeStoragePaths(removedItems.map((item) => item.storagePath));
  }

  for (const item of payload.libraryItems ?? []) {
    if (item.persisted && item.recordId) {
      let photoUrl = item.imageData ? item.imageData : null;
      let storagePath = item.storagePath ?? extractStoragePathFromUrl(photoUrl);

      if (photoUrl && photoUrl.startsWith("data:")) {
        await removeStoragePaths([item.storagePath]);
        try {
          const uploadResult = await uploadImageDataUrl(photoUrl, normalizedTradeId);
          photoUrl = uploadResult.photoUrl;
          storagePath = uploadResult.storagePath;
        } catch (uploadError) {
          console.error("Failed to refresh library image during update", uploadError);
          photoUrl = FALLBACK_TRADE_IMAGE_URL;
          storagePath = null;
        }
      }

      const { error: updateError } = await supabase
        .from("trade_library")
        .update({
          photo_url: photoUrl,
          note: item.notes ?? "",
        })
        .eq("id", item.recordId);

      if (updateError) {
        console.error("Failed to update library item", updateError);
      } else {
        item.imageData = photoUrl;
        item.storagePath = storagePath;
      }
    } else {
      let photoUrl: string | null = null;
      let storagePath: string | null = null;

      if (item.imageData && item.imageData.startsWith("data:")) {
        try {
          const uploadResult = await uploadImageDataUrl(item.imageData, normalizedTradeId);
          photoUrl = uploadResult.photoUrl;
          storagePath = uploadResult.storagePath;
        } catch (uploadError) {
          console.error("Failed to upload new library image during update", uploadError);
          photoUrl = FALLBACK_TRADE_IMAGE_URL;
          storagePath = null;
        }
      } else if (item.imageData) {
        photoUrl = item.imageData;
        storagePath = item.storagePath ?? extractStoragePathFromUrl(photoUrl);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("trade_library")
        .insert({
          trade_id: normalizedTradeId,
          photo_url: photoUrl,
          note: item.notes ?? "",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to insert library item", insertError);
      } else {
        item.recordId = inserted?.id?.toString();
        item.id = item.recordId ?? item.id;
        item.persisted = true;
        item.storagePath = storagePath;
        item.imageData = photoUrl;
      }
    }
  }

  notifyTradesChanged();
}

export async function deleteTrade(tradeId: string) {
  if (!tradeId) {
    return;
  }

  const normalizedTradeId = tradeId?.toString?.().trim();

  if (!normalizedTradeId) {
    console.error("Cannot delete trade without a valid identifier");
    return;
  }

  const libraryPhotoUrls = await fetchLibraryPhotoUrls(normalizedTradeId);
  const storagePaths = libraryPhotoUrls
    .map((url) => extractStoragePathFromUrl(url))
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  await removeStoragePaths(storagePaths);

  const { error } = await supabase
    .from("registered_trades")
    .delete()
    .eq("id", normalizedTradeId);

  if (error) {
    console.error("Failed to delete trade", error);
    throw error;
  }

  notifyTradesChanged();
}

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
  tradeOutcome: "profit" | "loss" | null;
  openTime: string | null;
  closeTime: string | null;
  position: "LONG" | "SHORT";
  riskReward: string[];
  risk: number[];
  pips: number[];
  lotSize: string[];
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number[];
  takeProfitOutcomes: ("profit" | "loss" | null)[];
  pnl: number[];
  preTradeMentalState: string | null;
  emotionsDuringTrade: string | null;
  emotionsAfterTrade: string | null;
  confidenceLevel: string | null;
  emotionalTrigger: string | null;
  followedPlan: string | null;
  respectedRisk: boolean | null;
  wouldRepeatTrade: boolean | null;
  notes: string | null;
  date: string;
  createdAt: string | null;
  libraryItems: StoredLibraryItem[];
};

export type TradePayload = {
  id?: string;
  symbolCode: string;
  isPaperTrade: boolean | null;
  tradeOutcome: "profit" | "loss" | null;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  position: "LONG" | "SHORT" | null;
  riskReward: string[];
  risk: (number | null)[];
  pips: (number | null)[];
  lotSize: (string | null)[];
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: (number | null)[];
  takeProfitOutcomes: ("profit" | "loss" | null)[];
  pnl: (number | null)[];
  // --- PSYCHOLOGY & MINDSET ---
  preTradeMentalState: string | null;
  emotionsDuringTrade: string | null;
  emotionsAfterTrade: string | null;
  confidenceLevel: string | null;
  emotionalTrigger: string | null;
  followedPlan: string | null;
  respectedRisk: boolean | null;
  wouldRepeatTrade: boolean | null;
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

type NormalizeTarget = "string" | "number" | "boolean";

export function normalizeTradeField(value: unknown, target: "string"): string | null;
export function normalizeTradeField(value: unknown, target: "number"): number | null;
export function normalizeTradeField(value: unknown, target: "boolean"): boolean | null;
export function normalizeTradeField(value: unknown, target: NormalizeTarget) {
  if (target === "string") {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      const normalized = String(value).trim();
      return normalized.length > 0 ? normalized : null;
    }

    return null;
  }

  if (target === "number") {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const normalized = value.trim().replace(/,/g, ".");

      if (!normalized) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  if (target === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (!normalized) {
        return null;
      }

      if (["true", "1", "yes", "y", "on", "si", "s", "sì"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "n", "off"].includes(normalized)) {
        return false;
      }

      return null;
    }

    if (typeof value === "number") {
      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }

      return null;
    }

    return null;
  }

  return null;
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

export function parseMultiValueField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => coerceValueToString(entry));
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

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

  if (trimmed.includes("|")) {
    return trimmed.split("|").map((entry) => entry.trim());
  }

  return [trimmed];
}

export function parseNumericMultiValueField(value: unknown): number[] {
  const rawValues = parseMultiValueField(value);
  return rawValues
    .map((entry) => normalizeTradeField(entry, "number"))
    .filter((entry): entry is number => entry !== null);
}

export function serializeMultiValueField(values: string[]): string | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const normalized = values
    .map((value) => normalizeTradeField(value, "string"))
    .filter((value): value is string => value !== null);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function serializeNumericMultiValueField(values: (number | null)[]): string | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const normalized = values
    .map((value) => normalizeTradeField(value, "number"))
    .filter((value): value is number => value !== null);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
}

function normalizeOutcomeValue(value: unknown): "profit" | "loss" | null {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "profit" || normalized === "loss") {
      return normalized;
    }
  }

  return null;
}

export function parseOutcomeMultiValueField(value: unknown): ("profit" | "loss" | null)[] {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeOutcomeValue(entry));
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [normalizeOutcomeValue(value)];
  }

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
      return parsed.map((entry) => normalizeOutcomeValue(entry));
    }
  } catch (error) {
    if (/^[\[{]/.test(trimmed)) {
      console.warn("Failed to parse outcome multi value field, falling back to string parsing", error);
    }
  }

  if (trimmed.includes("|")) {
    return trimmed.split("|").map((entry) => normalizeOutcomeValue(entry));
  }

  return [normalizeOutcomeValue(trimmed)];
}

export function serializeOutcomeMultiValueField(
  values: ("profit" | "loss" | null)[],
): string | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const normalized = values.map((value) => (value === "profit" || value === "loss" ? value : null));

  if (normalized.every((value) => value === null)) {
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
  const tradeOutcomeRaw = normalizeTradeField(row?.trade_outcome, "string");
  const tradeOutcome = tradeOutcomeRaw
    ? tradeOutcomeRaw.toLowerCase() === "profit"
      ? "profit"
      : tradeOutcomeRaw.toLowerCase() === "loss"
        ? "loss"
        : null
    : null;

  const riskReward = parseMultiValueField(row?.rr_ratio);
  const risk = parseNumericMultiValueField(row?.risk_percent);
  const pips = parseNumericMultiValueField(row?.pips);
  const takeProfit = parseNumericMultiValueField(row?.take_profit);
  const takeProfitOutcomes = parseOutcomeMultiValueField(row?.take_profit_outcomes);
  const pnl = parseNumericMultiValueField(row?.p_l);
  const lotSize = parseMultiValueField(row?.lot_size)
    .map((value) => normalizeTradeField(value, "string"))
    .filter((value): value is string => value !== null);

  return {
    id: row?.id?.toString() ?? "",
    symbolCode,
    symbolFlag: getSymbolFlag(symbolCode),
    isPaperTrade: Boolean(row?.is_paper_trade ?? false),
    tradeOutcome,
    openTime,
    closeTime,
    position: row?.position === "SHORT" ? "SHORT" : "LONG",
    riskReward,
    risk,
    pips,
    lotSize,
    entryPrice: normalizeTradeField(row?.entry_price, "number"),
    exitPrice: normalizeTradeField(row?.exit_price, "number"),
    stopLoss: normalizeTradeField(row?.stop_loss, "number"),
    takeProfit,
    takeProfitOutcomes,
    pnl,
    preTradeMentalState: normalizeTradeField(row?.mental_state_before ?? row?.mental_state, "string"),
    emotionsDuringTrade: normalizeTradeField(row?.emotions_during, "string"),
    emotionsAfterTrade: normalizeTradeField(row?.emotions_after, "string"),
    confidenceLevel: normalizeTradeField(row?.confidence_level, "string"),
    emotionalTrigger: normalizeTradeField(row?.emotional_triggers, "string"),
    followedPlan: normalizeTradeField(row?.followed_plan, "string"),
    respectedRisk: normalizeTradeField(row?.respected_risk, "boolean"),
    wouldRepeatTrade: normalizeTradeField(row?.repeat_trade, "boolean"),
    notes: normalizeTradeField(row?.notes, "string"),
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
    .select("id, photo_url, note, created_at")
    .eq("trade_id", normalizedTradeId)
    .order("created_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

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
      createdAt: typeof item.created_at === "string" ? item.created_at : null,
      storagePath: extractStoragePathFromUrl(photoUrl),
      persisted: true,
    } satisfies StoredLibraryItem;
  });
}

function buildTradeRecord(payload: TradePayload) {
  const openTime = payload.openTime ?? payload.date;
  const closeTime = payload.closeTime ?? null;
  const symbol = normalizeTradeField(payload.symbolCode, "string") ?? "";
  const normalizedTakeProfitValues = (payload.takeProfit ?? [])
    .map((value) => normalizeTradeField(value, "number"))
    .filter((value): value is number => value !== null);
  const multipleTakeProfitValues =
    normalizedTakeProfitValues.length > 1
      ? JSON.stringify(normalizedTakeProfitValues)
      : null;
  const singleTakeProfitValue =
    normalizedTakeProfitValues.length === 1
      ? normalizedTakeProfitValues[0]
      : null;
  const normalizedRiskValues = (payload.risk ?? [])
    .map((value) => normalizeTradeField(value, "number"))
    .filter((value): value is number => value !== null);
  const multipleRiskValues =
    normalizedRiskValues.length > 1 ? JSON.stringify(normalizedRiskValues) : null;
  const singleRiskValue =
    normalizedRiskValues.length === 1 ? normalizedRiskValues[0] : null;
  const normalizedLotSizeValues = (payload.lotSize ?? [])
    .map((value) => normalizeTradeField(value, "string"))
    .filter((value): value is string => value !== null);
  const multipleLotSizeValues =
    normalizedLotSizeValues.length > 1 ? JSON.stringify(normalizedLotSizeValues) : null;
  const singleLotSizeValue =
    normalizedLotSizeValues.length === 1 ? normalizedLotSizeValues[0] : null;

  return {
    symbol,
    is_paper_trade: normalizeTradeField(payload.isPaperTrade, "boolean"),
    trade_outcome: payload.tradeOutcome ?? null,
    open_time: openTime,
    close_time: closeTime,
    position: payload.position ?? null,
    rr_ratio: serializeMultiValueField(payload.riskReward ?? []),
    risk_percent: multipleRiskValues ?? singleRiskValue,
    pips: serializeNumericMultiValueField(payload.pips ?? []),
    lot_size: multipleLotSizeValues ?? singleLotSizeValue,
    entry_price: normalizeTradeField(payload.entryPrice, "number"),
    exit_price: normalizeTradeField(payload.exitPrice, "number"),
    stop_loss: normalizeTradeField(payload.stopLoss, "number"),
    take_profit: multipleTakeProfitValues ?? singleTakeProfitValue,
    take_profit_outcomes: serializeOutcomeMultiValueField(payload.takeProfitOutcomes),
    p_l: serializeNumericMultiValueField(payload.pnl ?? []),
    mental_state_before: normalizeTradeField(payload.preTradeMentalState, "string"),
    emotions_during: normalizeTradeField(payload.emotionsDuringTrade, "string"),
    emotions_after: normalizeTradeField(payload.emotionsAfterTrade, "string"),
    confidence_level: normalizeTradeField(payload.confidenceLevel, "string"),
    emotional_triggers: normalizeTradeField(payload.emotionalTrigger, "string"),
    followed_plan: normalizeTradeField(payload.followedPlan, "string"),
    respected_risk: normalizeTradeField(payload.respectedRisk, "boolean"),
    repeat_trade: normalizeTradeField(payload.wouldRepeatTrade, "boolean"),
    notes: normalizeTradeField(payload.notes, "string"),
  };
}

async function saveLibraryItems(
  tradeId: string,
  items: StoredLibraryItem[],
  options?: { replaceExisting?: boolean },
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

  if (options?.replaceExisting) {
    try {
      const { data: existingRows, error: fetchError } = await supabase
        .from("trade_library")
        .select("id")
        .eq("trade_id", normalizedTradeId);

      if (fetchError) {
        console.error("Failed to load existing library items before replace", fetchError);
      } else {
        const recordIds = (existingRows ?? [])
          .map((row) => row?.id)
          .filter((value): value is number | string => typeof value === "number" || typeof value === "string");

        if (recordIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("trade_library")
            .delete()
            .in("id", recordIds);

          if (deleteError) {
            console.error("Failed to clear previous library items", deleteError);
          }
        }
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      console.error("Unexpected error while clearing previous library items", normalizedError);
    }
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
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("open_time", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Failed to load trades", error);
    return [];
  }

  return (data ?? []).map((row) => mapTradeRow(row));
}

type TradeNavigationDirection = "previous" | "next";

type TradeNavigationContext = {
  id: string;
  openTime: string | null;
  createdAt: string | null;
};

function normalizeTradeId(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  return null;
}

function buildNavigationQuery(direction: TradeNavigationDirection, currentId: string) {
  return supabase
    .from("registered_trades")
    .select("id")
    .neq("id", currentId)
    .order("open_time", { ascending: direction === "next", nullsFirst: false })
    .order("created_at", { ascending: direction === "next" })
    .order("id", { ascending: direction === "next" })
    .limit(1);
}

type NavigationQueryBuilder = ReturnType<typeof buildNavigationQuery>;

async function runNavigationQuery(
  direction: TradeNavigationDirection,
  currentId: string,
  configure: (query: NavigationQueryBuilder) => NavigationQueryBuilder,
): Promise<string | null> {
  try {
    const query = configure(buildNavigationQuery(direction, currentId));
    const { data, error } = await query;

    if (error) {
      console.error("Failed to load adjacent trade", error);
      return null;
    }

    const candidate = data?.[0]?.id;
    return normalizeTradeId(candidate);
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    console.error("Unexpected error while loading adjacent trade", normalizedError);
    return null;
  }
}

function parseNumericId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadAdjacentTradeId(
  context: TradeNavigationContext,
  direction: TradeNavigationDirection,
): Promise<string | null> {
  const currentId = context.id?.toString?.();

  if (!currentId) {
    return null;
  }

  const numericId = parseNumericId(currentId);
  const openTime = context.openTime;
  const createdAt = context.createdAt;

  if (openTime) {
    const comparisonResult = await runNavigationQuery(direction, currentId, (query) => {
      if (direction === "next") {
        return query.gt("open_time", openTime);
      }
      return query.lt("open_time", openTime);
    });

    if (comparisonResult) {
      return comparisonResult;
    }

    if (createdAt) {
      const byCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
        query = query.eq("open_time", openTime);
        if (direction === "next") {
          return query.gt("created_at", createdAt);
        }
        return query.lt("created_at", createdAt);
      });

      if (byCreatedAt) {
        return byCreatedAt;
      }

      const byId = await runNavigationQuery(direction, currentId, (query) => {
        query = query.eq("open_time", openTime).eq("created_at", createdAt);

        if (numericId !== null) {
          if (direction === "next") {
            return query.gt("id", numericId);
          }
          return query.lt("id", numericId);
        }

        if (direction === "next") {
          return query.gt("id", currentId);
        }
        return query.lt("id", currentId);
      });

      if (byId) {
        return byId;
      }

      if (direction === "next") {
        const byNullCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
          return query.eq("open_time", openTime).is("created_at", null);
        });

        if (byNullCreatedAt) {
          return byNullCreatedAt;
        }
      }
    } else {
      const byNullCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
        query = query.eq("open_time", openTime).is("created_at", null);

        if (numericId !== null) {
          if (direction === "next") {
            return query.gt("id", numericId);
          }
          return query.lt("id", numericId);
        }

        if (direction === "next") {
          return query.gt("id", currentId);
        }
        return query.lt("id", currentId);
      });

      if (byNullCreatedAt) {
        return byNullCreatedAt;
      }

      if (direction === "previous") {
        const byNonNullCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
          return query.eq("open_time", openTime).not("created_at", "is", null);
        });

        if (byNonNullCreatedAt) {
          return byNonNullCreatedAt;
        }
      }
    }
  }

  if (createdAt) {
    const byNullOpenTimeCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
      query = query.is("open_time", null);
      if (direction === "next") {
        return query.gt("created_at", createdAt);
      }
      return query.lt("created_at", createdAt);
    });

    if (byNullOpenTimeCreatedAt) {
      return byNullOpenTimeCreatedAt;
    }

    const byNullOpenTimeSameCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
      query = query.is("open_time", null).eq("created_at", createdAt);

      if (numericId !== null) {
        if (direction === "next") {
          return query.gt("id", numericId);
        }
        return query.lt("id", numericId);
      }

      if (direction === "next") {
        return query.gt("id", currentId);
      }
      return query.lt("id", currentId);
    });

    if (byNullOpenTimeSameCreatedAt) {
      return byNullOpenTimeSameCreatedAt;
    }

    if (direction === "next") {
      const byNullOpenTimeNullCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
        return query.is("open_time", null).is("created_at", null);
      });

      if (byNullOpenTimeNullCreatedAt) {
        return byNullOpenTimeNullCreatedAt;
      }
    }
  } else {
    const byNullOpenTimeNullCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
      query = query.is("open_time", null).is("created_at", null);

      if (numericId !== null) {
        if (direction === "next") {
          return query.gt("id", numericId);
        }
        return query.lt("id", numericId);
      }

      if (direction === "next") {
        return query.gt("id", currentId);
      }
      return query.lt("id", currentId);
    });

    if (byNullOpenTimeNullCreatedAt) {
      return byNullOpenTimeNullCreatedAt;
    }

    if (direction === "previous") {
      const byNullOpenTimeWithCreatedAt = await runNavigationQuery(direction, currentId, (query) => {
        return query.is("open_time", null).not("created_at", "is", null);
      });

      if (byNullOpenTimeWithCreatedAt) {
        return byNullOpenTimeWithCreatedAt;
      }
    }
  }

  if (direction === "previous") {
    return runNavigationQuery(direction, currentId, (query) => {
      return query.not("open_time", "is", null);
    });
  }

  return null;
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
  const record = buildTradeRecord(payload);

  const { error } = await supabase.from("registered_trades").update(record).eq("id", tradeId);

  if (error) {
    console.error("Failed to update trade", error);
    throw error;
  }

  const removedItems = options?.removedLibraryItems ?? [];
  if (removedItems.length > 0) {
    const recordIds = removedItems
      .map((item) => item.recordId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (recordIds.length > 0) {
      const { error: removeError } = await supabase.from("trade_library").delete().in("id", recordIds);

      if (removeError) {
        console.error("Failed to delete library entries", removeError);
      }
    }

    await removeStoragePaths(removedItems.map((item) => item.storagePath));
  }

  const libraryFailures = await saveLibraryItems(tradeId.toString(), payload.libraryItems ?? [], {
    replaceExisting: true,
  });

  if (libraryFailures.length > 0) {
    console.warn("Some library items failed to save during update", libraryFailures);
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

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
};

const STORAGE_KEY = "registeredTrades";
const TRADES_UPDATED_EVENT = "registered-trades-changed";

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

        if (storedItem.imageData === undefined) {
          storedItem.imageData = null;
        }

        const rawLibraryItems = (storedItem as StoredTrade).libraryItems;
        if (Array.isArray(rawLibraryItems)) {
          storedItem.libraryItems = rawLibraryItems
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
        } else {
          storedItem.libraryItems = storedItem.imageData
            ? [
                {
                  id: "library-primary",
                  imageData: storedItem.imageData,
                  notes: "",
                },
              ]
            : [];
        }

        if (storedItem.position !== "LONG" && storedItem.position !== "SHORT") {
          storedItem.position = "LONG";
        }

        const normalizeOptionalString = (value: unknown): string | null => {
          if (typeof value === "string") {
            return value;
          }

          return null;
        };

        storedItem.riskReward = normalizeOptionalString(storedItem.riskReward);
        storedItem.entryPrice = normalizeOptionalString(storedItem.entryPrice);
        storedItem.exitPrice = normalizeOptionalString(storedItem.exitPrice);
        storedItem.stopLoss = normalizeOptionalString(storedItem.stopLoss);
        storedItem.takeProfit = normalizeOptionalString(storedItem.takeProfit);
        storedItem.pnl = normalizeOptionalString(storedItem.pnl);
        storedItem.confidenceLevel = normalizeOptionalString(storedItem.confidenceLevel);
        const normalizedPreTradeMentalState = normalizeOptionalString(
          (storedItem as StoredTrade).preTradeMentalState ?? storedItem.mentalState,
        );
        storedItem.preTradeMentalState = normalizedPreTradeMentalState;
        storedItem.mentalState = normalizedPreTradeMentalState;
        storedItem.emotionsDuringTrade = normalizeOptionalString(storedItem.emotionsDuringTrade);
        storedItem.emotionsAfterTrade = normalizeOptionalString(storedItem.emotionsAfterTrade);
        storedItem.emotionalTrigger = normalizeOptionalString(storedItem.emotionalTrigger);
        storedItem.followedPlan = normalizeOptionalString(storedItem.followedPlan);
        storedItem.respectedRisk = normalizeOptionalString(storedItem.respectedRisk);
        storedItem.wouldRepeatTrade = normalizeOptionalString(storedItem.wouldRepeatTrade);
        storedItem.risk = normalizeOptionalString(storedItem.risk);
        storedItem.pips = normalizeOptionalString(storedItem.pips);

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

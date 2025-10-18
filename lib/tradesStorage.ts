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
  confidenceLevel?: string | null;
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

        if (storedItem.entryPrice !== undefined && storedItem.entryPrice !== null && typeof storedItem.entryPrice !== "string") {
          storedItem.entryPrice = null;
        }

        if (storedItem.entryPrice === undefined) {
          storedItem.entryPrice = null;
        }

        if (storedItem.exitPrice !== undefined && storedItem.exitPrice !== null && typeof storedItem.exitPrice !== "string") {
          storedItem.exitPrice = null;
        }

        if (storedItem.exitPrice === undefined) {
          storedItem.exitPrice = null;
        }

        if (storedItem.stopLoss !== undefined && storedItem.stopLoss !== null && typeof storedItem.stopLoss !== "string") {
          storedItem.stopLoss = null;
        }

        if (storedItem.stopLoss === undefined) {
          storedItem.stopLoss = null;
        }

        if (storedItem.takeProfit !== undefined && storedItem.takeProfit !== null && typeof storedItem.takeProfit !== "string") {
          storedItem.takeProfit = null;
        }

        if (storedItem.takeProfit === undefined) {
          storedItem.takeProfit = null;
        }

        if (storedItem.pnl !== undefined && storedItem.pnl !== null && typeof storedItem.pnl !== "string") {
          storedItem.pnl = null;
        }

        if (storedItem.pnl === undefined) {
          storedItem.pnl = null;
        }

        if (
          storedItem.confidenceLevel !== undefined &&
          storedItem.confidenceLevel !== null &&
          typeof storedItem.confidenceLevel !== "string"
        ) {
          storedItem.confidenceLevel = null;
        }

        if (storedItem.confidenceLevel === undefined) {
          storedItem.confidenceLevel = null;
        }

        if (
          storedItem.mentalState !== undefined &&
          storedItem.mentalState !== null &&
          typeof storedItem.mentalState !== "string"
        ) {
          storedItem.mentalState = null;
        }

        if (storedItem.mentalState === undefined) {
          storedItem.mentalState = null;
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

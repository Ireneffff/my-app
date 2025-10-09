export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  date: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageData?: string | null;
  position: "LONG" | "SHORT";
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

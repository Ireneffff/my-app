export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  date: string;
};

const STORAGE_KEY = "registeredTrades";

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

        return item as StoredTrade;
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
}

export function getTradeById(id: string): StoredTrade | null {
  const trades = loadTrades();
  return trades.find((trade) => trade.id === id) ?? null;
}

export function deleteTrade(id: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentTrades = loadTrades();
  const updatedTrades = currentTrades.filter((trade) => trade.id !== id);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTrades));
}

export const REGISTERED_TRADES_STORAGE_KEY = STORAGE_KEY;

export type TradePosition = "long" | "short";

export type StoredTrade = {
  id: string;
  symbolCode: string;
  symbolFlag: string;
  date: string;
  openTime?: string | null;
  closeTime?: string | null;
  imageData?: string | null;
  position: TradePosition;
  riskReward: string | null;
  risk: string | null;
  pips: string | null;
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
        if (!item || typeof item !== "object") {
          return null;
        }

        const raw = item as Record<string, unknown>;

        if (
          typeof raw.id !== "string" ||
          typeof raw.symbolCode !== "string" ||
          typeof raw.symbolFlag !== "string" ||
          typeof raw.date !== "string"
        ) {
          return null;
        }

        const getIsoString = (value: unknown) =>
          typeof value === "string" ? value : null;

        const normalizedPosition =
          typeof raw.position === "string"
            ? (raw.position.toLowerCase() as TradePosition)
            : null;

        const position: TradePosition =
          normalizedPosition === "short" ? "short" : "long";

        return {
          id: raw.id,
          symbolCode: raw.symbolCode,
          symbolFlag: raw.symbolFlag,
          date: raw.date,
          openTime: getIsoString(raw.openTime),
          closeTime: getIsoString(raw.closeTime),
          imageData: getIsoString(raw.imageData),
          position,
          riskReward: typeof raw.riskReward === "string" ? raw.riskReward : null,
          risk: typeof raw.risk === "string" ? raw.risk : null,
          pips: typeof raw.pips === "string" ? raw.pips : null,
        } satisfies StoredTrade;
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

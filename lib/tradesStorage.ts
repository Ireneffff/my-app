export type SymbolOption = {
  code: string;
  flag: string;
};

export type StoredTrade = {
  id: string;
  date: string;
  symbol: SymbolOption;
};

export const TRADES_STORAGE_KEY = "trading-journal:trades";

function isStoredTrade(value: unknown): value is StoredTrade {
  if (typeof value !== "object" || value === null) return false;
  const trade = value as Partial<StoredTrade>;
  return (
    typeof trade.id === "string" &&
    typeof trade.date === "string" &&
    typeof trade.symbol === "object" &&
    trade.symbol !== null &&
    typeof (trade.symbol as SymbolOption).code === "string" &&
    typeof (trade.symbol as SymbolOption).flag === "string"
  );
}

export function readStoredTrades(): StoredTrade[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(TRADES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isStoredTrade);
  } catch (error) {
    console.error("Failed to read stored trades", error);
    return [];
  }
}

export function writeStoredTrades(trades: StoredTrade[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  } catch (error) {
    console.error("Failed to write stored trades", error);
  }
}

export function appendStoredTrade(trade: StoredTrade) {
  if (typeof window === "undefined") return;

  const trades = readStoredTrades();
  trades.push(trade);
  writeStoredTrades(trades);
}

export function findStoredTrade(id: string): StoredTrade | undefined {
  if (typeof window === "undefined") return undefined;

  const trades = readStoredTrades();
  return trades.find((trade) => trade.id === id);
}

export function updateStoredTrade(
  id: string,
  updates: Partial<Omit<StoredTrade, "id">>,
): StoredTrade | undefined {
  if (typeof window === "undefined") return undefined;

  const trades = readStoredTrades();
  const index = trades.findIndex((trade) => trade.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedTrade: StoredTrade = {
    ...trades[index],
    ...updates,
  };

  trades[index] = updatedTrade;
  writeStoredTrades(trades);

  return updatedTrade;
}

const LAST_OPENED_REGISTERED_TRADE_STORAGE_KEY = "last-opened-registered-trade-id";

function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveLastOpenedRegisteredTradeId(tradeId: string | null | undefined) {
  if (!tradeId || !isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_OPENED_REGISTERED_TRADE_STORAGE_KEY, tradeId);
  } catch {
    // Silently ignore storage write errors (private mode, quota, etc.)
  }
}

export function consumeLastOpenedRegisteredTradeId() {
  if (!isBrowserEnvironment()) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(LAST_OPENED_REGISTERED_TRADE_STORAGE_KEY);

    if (storedValue) {
      window.localStorage.removeItem(LAST_OPENED_REGISTERED_TRADE_STORAGE_KEY);
      return storedValue;
    }

    return null;
  } catch {
    return null;
  }
}

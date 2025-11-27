import { calculateOverallPips } from "./pips";
import type { StoredTrade } from "./tradesStorage";

function normalizeRiskPercentage(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  // Accept both fractional values (e.g., 0.01) and percentage points (e.g., 1 for 1%)
  return value > 1 ? value / 100 : value;
}

function getTradeTimestamp(trade: StoredTrade) {
  const candidates = [trade.date, trade.openTime, trade.closeTime, trade.createdAt];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const parsed = new Date(candidate);
    const timestamp = parsed.getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

export function calculateProfitFactor({
  trades,
  initialCapital,
}: {
  trades: StoredTrade[];
  initialCapital: number | null | undefined;
}) {
  const startingCapital =
    typeof initialCapital === "number" && Number.isFinite(initialCapital) && initialCapital > 0
      ? initialCapital
      : null;

  if (startingCapital === null) {
    return { profitFactor: null, totalProfit: 0, totalLoss: 0 };
  }

  const orderedTrades = [...trades].sort((a, b) => getTradeTimestamp(a) - getTradeTimestamp(b));

  let capital = startingCapital;
  let totalProfit = 0;
  let totalLoss = 0;

  for (const trade of orderedTrades) {
    const outcome = trade.tradeOutcome;
    const pips = calculateOverallPips(trade.pips);
    const riskPercent = normalizeRiskPercentage(trade.risk.find((entry) => typeof entry === "number" && !Number.isNaN(entry)));

    if (!riskPercent || (outcome === "profit" && (!pips || pips <= 0))) {
      continue;
    }

    if (outcome === "profit") {
      const profitAmount = capital * riskPercent * pips;

      if (Number.isFinite(profitAmount) && profitAmount > 0) {
        totalProfit += profitAmount;
        capital += profitAmount;
      }

      continue;
    }

    if (outcome === "loss") {
      const lossAmount = capital * riskPercent;

      if (Number.isFinite(lossAmount) && lossAmount > 0) {
        totalLoss += lossAmount;
        capital -= lossAmount;
      }
    }
  }

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : null;

  return { profitFactor, totalProfit, totalLoss };
}

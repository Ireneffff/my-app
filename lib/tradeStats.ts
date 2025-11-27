import { type StoredTrade } from "./tradesStorage";

export function getTradeTimestamp(trade: StoredTrade) {
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

function getFirstFiniteNumber(values: (number | null | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export type ProfitFactorResult = {
  profitFactor: number;
  totalProfit: number;
  totalLoss: number;
  finalCapital: number;
};

export function calculateProfitFactor(
  trades: StoredTrade[],
  initialCapital: number,
): ProfitFactorResult {
  const relevantTrades = trades
    .filter((trade) => trade.tradeOutcome === "profit" || trade.tradeOutcome === "loss")
    .sort((a, b) => getTradeTimestamp(a) - getTradeTimestamp(b));

  let currentCapital = Number.isFinite(initialCapital) ? initialCapital : 0;
  let accumulatedProfit = 0;
  let accumulatedLoss = 0;

  for (const trade of relevantTrades) {
    const riskPercent = getFirstFiniteNumber(trade.risk ?? []);

    if (riskPercent === null) {
      continue;
    }

    const pips = getFirstFiniteNumber(trade.pips ?? []);
    const riskFraction = riskPercent / 100;
    const riskAmount = currentCapital * riskFraction;

    if (trade.tradeOutcome === "profit") {
      const profit = riskAmount * (pips ?? 0);
      accumulatedProfit += profit;
      currentCapital += profit;
    } else {
      const loss = riskAmount;
      accumulatedLoss += loss;
      currentCapital -= loss;
    }
  }

  const profitFactor = accumulatedLoss === 0
    ? accumulatedProfit > 0
      ? Number.POSITIVE_INFINITY
      : 0
    : accumulatedProfit / accumulatedLoss;

  return {
    profitFactor,
    totalProfit: accumulatedProfit,
    totalLoss: accumulatedLoss,
    finalCapital: currentCapital,
  };
}

export type TradePosition = "LONG" | "SHORT";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculatePips({
  entryPrice,
  exitPrice,
  position,
}: {
  entryPrice: number | null | undefined;
  exitPrice: number | null | undefined;
  position: TradePosition | null | undefined;
}): number | null {
  if (!isFiniteNumber(entryPrice) || !isFiniteNumber(exitPrice)) {
    return null;
  }

  if (position !== "LONG" && position !== "SHORT") {
    return null;
  }

  const difference =
    position === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pips = difference * 10000;

  if (!Number.isFinite(pips)) {
    return null;
  }

  return roundToTenth(pips);
}

export function calculateOverallPips(
  values: Array<number | null | undefined>,
  weights?: Array<number | null | undefined>,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!isFiniteNumber(value)) {
      continue;
    }

    const weight = weights && isFiniteNumber(weights[index])
      ? (weights[index] as number)
      : 1;

    if (weight === 0) {
      continue;
    }

    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }

  return roundToTenth(weightedSum / totalWeight);
}

export function formatPips(value: number): string {
  if (!isFiniteNumber(value)) {
    return "";
  }

  const rounded = roundToTenth(value);

  if (rounded > 0) {
    return `+${rounded.toFixed(1)}`;
  }

  if (rounded < 0) {
    return `−${Math.abs(rounded).toFixed(1)}`;
  }

  return "0";
}

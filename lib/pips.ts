import type { TakeProfitOutcome } from "./takeProfitOutcomeStyles";

export type TradePosition = "LONG" | "SHORT";

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function calculatePips({
  entryPrice,
  takeProfitPrice,
  stopLossPrice,
  position,
  outcome,
}: {
  entryPrice: number | null | undefined;
  takeProfitPrice: number | null | undefined;
  stopLossPrice: number | null | undefined;
  position: TradePosition | null | undefined;
  outcome: TakeProfitOutcome | null | undefined;
}): number | null {
  if (!isFiniteNumber(entryPrice)) {
    return null;
  }

  if (position !== "LONG" && position !== "SHORT") {
    return null;
  }

  if (outcome !== "profit" && outcome !== "loss") {
    return null;
  }

  const exitPrice =
    outcome === "profit"
      ? takeProfitPrice
      : outcome === "loss"
        ? stopLossPrice
        : null;

  if (!isFiniteNumber(exitPrice)) {
    return null;
  }

  const distance = Math.abs((exitPrice as number) - entryPrice) * 10000;

  if (!Number.isFinite(distance)) {
    return null;
  }

  const signedDistance = outcome === "loss" ? -distance : distance;

  return roundToTenth(signedDistance);
}

export function applyOutcomeToPips({
  value,
  outcome,
}: {
  value: number | null | undefined;
  outcome: TakeProfitOutcome | null | undefined;
}): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }

  if (outcome === "profit") {
    return roundToTenth(Math.abs(value));
  }

  if (outcome === "loss") {
    return roundToTenth(-Math.abs(value));
  }

  return roundToTenth(value);
}

export function calculateOverallPips(values: Array<number | null | undefined>): number | null {
  let hasValue = false;
  let total = 0;

  for (const value of values) {
    if (!isFiniteNumber(value)) {
      continue;
    }

    total += value;
    hasValue = true;
  }

  if (!hasValue) {
    return null;
  }

  return roundToTenth(total);
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

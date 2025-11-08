import type { TakeProfitOutcome } from "./takeProfitOutcomeStyles";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function roundToTwoDecimals(value: number): number {
  if (!isFiniteNumber(value)) {
    return NaN;
  }

  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function calculatePnl({
  pips,
  lotSize,
  risk,
  outcome,
  riskIsPercentage = true,
}: {
  pips: number | null | undefined;
  lotSize: number | null | undefined;
  risk: number | null | undefined;
  outcome?: TakeProfitOutcome | null;
  riskIsPercentage?: boolean;
}): number | null {
  if (!isFiniteNumber(pips) || !isFiniteNumber(lotSize) || !isFiniteNumber(risk)) {
    return null;
  }

  let effectivePips = pips;

  if (outcome === "loss") {
    effectivePips = -Math.abs(pips);
  } else if (outcome === "profit") {
    effectivePips = Math.abs(pips);
  }

  const multiplier = riskIsPercentage ? risk / 100 : risk;

  if (!Number.isFinite(multiplier)) {
    return null;
  }

  const rawResult = effectivePips * lotSize * multiplier;

  if (!Number.isFinite(rawResult)) {
    return null;
  }

  return roundToTwoDecimals(rawResult);
}

export function calculateOverallPnl(values: Array<number | null | undefined>): number | null {
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

  return roundToTwoDecimals(total);
}

export function formatPnl(value: number): string {
  if (!isFiniteNumber(value)) {
    return "";
  }

  const rounded = roundToTwoDecimals(value);

  if (!Number.isFinite(rounded)) {
    return "";
  }

  if (rounded > 0) {
    return `+${rounded.toFixed(2)}`;
  }

  if (rounded < 0) {
    return `−${Math.abs(rounded).toFixed(2)}`;
  }

  return "0.00";
}

export function inferRiskIsPercentage(
  rawValue: string | null | undefined,
  defaultValue = true,
): boolean {
  if (typeof rawValue !== "string") {
    return defaultValue;
  }

  const trimmed = rawValue.trim();

  if (!trimmed) {
    return defaultValue;
  }

  if (trimmed.includes("%")) {
    return true;
  }

  if (/[€$£¥]$/.test(trimmed)) {
    return false;
  }

  return defaultValue;
}

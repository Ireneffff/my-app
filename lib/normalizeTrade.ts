export type RawTrade = {
  executed_at?: unknown;
  [key: string]: unknown;
};

export type NormalizedTrade = Omit<RawTrade, "executed_at"> & {
  executedAt: Date;
};

export function normalizeTrade(trade: RawTrade): NormalizedTrade | null {
  const { executed_at: executedAtRaw, ...rest } = trade;

  if (
    typeof executedAtRaw !== "string" &&
    typeof executedAtRaw !== "number" &&
    !(executedAtRaw instanceof Date)
  ) {
    return null;
  }

  const executedAt = new Date(executedAtRaw);

  return {
    ...rest,
    executedAt,
  };
}

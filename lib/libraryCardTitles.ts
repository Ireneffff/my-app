export const LIBRARY_CARD_TITLES = [
  "Timeframe Daily",
  "Timeframe 4H (before the position)",
  "Timeframe 15min (before the position)",
  "Timeframe 15min (after the position)",
  "Timeframe 4H (after the position)",
  "Other",
] as const;

export function getLibraryCardTitle(index: number): string {
  if (index < 0) {
    return LIBRARY_CARD_TITLES[0];
  }

  return LIBRARY_CARD_TITLES[index] ?? LIBRARY_CARD_TITLES[LIBRARY_CARD_TITLES.length - 1];
}

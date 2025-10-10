import type { StoredTrade } from "./tradesStorage";

export type LibraryEntry = {
  id: string;
  accent: string;
  title: string;
  subtitle: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  imageSrc: string;
  imageAlt: string;
};

export const curatedLibraryEntries: LibraryEntry[] = [
  {
    id: "curated-breakout-focus",
    accent: "Playbook",
    title: "London Breakout Focus",
    subtitle: "GBP/USD · Pre-market structure",
    description:
      "Session liquidity mapped with momentum bias and clean structure before the London open.",
    metricLabel: "Target",
    metricValue: "+85 pips",
    imageSrc: "/library/focus-breakout.svg",
    imageAlt: "Stylised forex chart showing a bullish breakout during London session",
  },
  {
    id: "curated-impulse-retrace",
    accent: "Case Study",
    title: "Impulse → Retrace",
    subtitle: "EUR/USD · New York session",
    description: "Momentum leg balanced by a measured pullback into 50% liquidity pocket.",
    metricLabel: "Risk",
    metricValue: "0.75%",
    imageSrc: "/library/impulse-retrace.svg",
    imageAlt: "Stylised candlestick chart illustrating an impulse and retracement pattern",
  },
  {
    id: "curated-session-momentum",
    accent: "Session",
    title: "Asia Accumulation",
    subtitle: "AUD/USD · Sydney range",
    description: "Accumulation channel with golden level reactions during the Asian range.",
    metricLabel: "Bias",
    metricValue: "Long",
    imageSrc: "/library/session-momentum.svg",
    imageAlt: "Stylised trading session illustration highlighting momentum points",
  },
  {
    id: "curated-volume-shift",
    accent: "Volume",
    title: "Liquidity Shift",
    subtitle: "USD/CAD · Transitional zone",
    description: "Volume divergence ahead of New York open signalling potential continuation.",
    metricLabel: "Volume",
    metricValue: "+42%",
    imageSrc: "/library/volume-shift.svg",
    imageAlt: "Stylised histogram visual showing a surge in trading volume",
  },
];

export function createEntryFromTrade(trade: StoredTrade): LibraryEntry | null {
  const imageSrc = trade.imageUrl ?? trade.imageData;

  if (!imageSrc) {
    return null;
  }

  const parsedDate = trade.date ? new Date(trade.date) : null;
  const isValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());

  const subtitleParts = [trade.symbolCode];
  if (isValidDate) {
    subtitleParts.push(
      parsedDate.toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    );
  }

  const detailParts: string[] = [];
  if (trade.risk) {
    detailParts.push(`Risk ${trade.risk}`);
  }
  if (trade.riskReward) {
    detailParts.push(`${trade.riskReward} R:R`);
  }
  if (trade.pips) {
    detailParts.push(`${trade.pips} pips`);
  }

  const description =
    detailParts.length > 0
      ? detailParts.join(" · ")
      : "Snapshot captured from a registered trade.";

  const metricLabel = trade.pips ? "Result" : trade.riskReward ? "Plan" : "Recorded";
  const metricValue = trade.pips ?? trade.riskReward ?? (isValidDate ? "Saved" : "Entry");

  return {
    id: `trade-${trade.id}`,
    accent: trade.position === "SHORT" ? "Short" : "Long",
    title: `${trade.symbolCode} ${trade.position === "SHORT" ? "short" : "long"}`,
    subtitle: subtitleParts.join(" · "),
    description,
    metricLabel,
    metricValue,
    imageSrc,
    imageAlt: `${trade.symbolCode} ${trade.position.toLowerCase()} setup screenshot`,
  };
}

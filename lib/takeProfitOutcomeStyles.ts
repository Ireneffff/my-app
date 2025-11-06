export type TakeProfitOutcome = "" | "profit" | "loss";

export type TakeProfitOutcomeStyle = {
  label: string;
  border: string;
  text: string;
  background: string;
  placeholder: string;
};

const TAKE_PROFIT_OUTCOME_STYLES: Record<"neutral" | "profit" | "loss", TakeProfitOutcomeStyle> = {
  neutral: {
    label: "text-muted-fg",
    border: "border-border",
    text: "text-fg",
    background: "bg-surface",
    placeholder: "placeholder:text-muted-fg",
  },
  profit: {
    label: "text-green-700",
    border: "border-green-300",
    text: "text-green-700",
    background: "bg-green-50",
    placeholder: "placeholder:text-green-600",
  },
  loss: {
    label: "text-red-700",
    border: "border-red-300",
    text: "text-red-700",
    background: "bg-red-50",
    placeholder: "placeholder:text-red-600",
  },
};

export function getTakeProfitOutcomeStyle(outcome: TakeProfitOutcome): TakeProfitOutcomeStyle {
  if (outcome === "profit") {
    return TAKE_PROFIT_OUTCOME_STYLES.profit;
  }

  if (outcome === "loss") {
    return TAKE_PROFIT_OUTCOME_STYLES.loss;
  }

  return TAKE_PROFIT_OUTCOME_STYLES.neutral;
}

export { TAKE_PROFIT_OUTCOME_STYLES };

export interface LibraryInspirationEntry {
  id: string;
  label: string;
  title: string;
  description: string;
  gradient: string;
  thumbnailGradient: string;
  focus: string;
  tag: string;
}

export const LIBRARY_INSPIRATION_ENTRIES: LibraryInspirationEntry[] = [
  {
    id: "liquidity",
    label: "Liquidity sweep",
    title: "Cattura della liquidità",
    description:
      "Osserva come il prezzo reagisce alle zone di liquidità prima del breakout per allineare l'entrata.",
    gradient: "from-sky-200 via-sky-400 to-blue-700",
    thumbnailGradient: "from-sky-100 via-sky-200 to-sky-400",
    focus: "Volume & breakout",
    tag: "Scenario",
  },
  {
    id: "range",
    label: "Range equilibrium",
    title: "Equilibrio del range",
    description:
      "Evidenzia i punti di equilibrio del range attuale per individuare reazioni di rimbalzo o deviazione.",
    gradient: "from-amber-200 via-orange-300 to-rose-500",
    thumbnailGradient: "from-amber-100 via-orange-200 to-rose-300",
    focus: "Zone chiave",
    tag: "Playbook",
  },
  {
    id: "trendline",
    label: "Trendline retest",
    title: "Retest della trendline",
    description:
      "Monitora il comportamento del prezzo sulla trendline principale per confermare la continuazione del trend.",
    gradient: "from-emerald-200 via-emerald-400 to-cyan-500",
    thumbnailGradient: "from-emerald-100 via-emerald-200 to-cyan-300",
    focus: "Momentum",
    tag: "Ispirazione",
  },
];

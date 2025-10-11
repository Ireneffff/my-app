"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Button from "@/components/ui/Button";
import { LibrarySection, type LibrarySectionItem } from "@/components/library/LibrarySection";
import {
  LibraryInspirationPreview,
  LibraryInspirationThumbnail,
} from "@/components/library/LibraryInspiration";
import {
  deleteTrade,
  loadTrades,
  REGISTERED_TRADES_UPDATED_EVENT,
  type StoredTrade,
} from "@/lib/tradesStorage";
import { LIBRARY_INSPIRATION_ENTRIES, type LibraryInspirationEntry } from "@/lib/libraryInspiration";

type TradeState = {
  status: "loading" | "ready" | "missing";
  trade: StoredTrade | null;
};

type LibraryDisplayItem =
  | {
      id: string;
      kind: "upload";
      imageData: string | null;
      card: LibrarySectionItem;
    }
  | {
      id: string;
      kind: "inspiration";
      entry: LibraryInspirationEntry;
      card: LibrarySectionItem;
    };

const availableSymbols = [
  { code: "EURUSD", flag: "🇪🇺 🇺🇸" },
  { code: "GBPUSD", flag: "🇬🇧 🇺🇸" },
  { code: "USDJPY", flag: "🇺🇸 🇯🇵" },
  { code: "AUDUSD", flag: "🇦🇺 🇺🇸" },
  { code: "USDCAD", flag: "🇺🇸 🇨🇦" },
  { code: "EURGBP", flag: "🇪🇺 🇬🇧" },
] as const;

function getDateTimeDisplay(isoValue?: string | null) {
  if (!isoValue) {
    return { dateLabel: "-- ---", timeLabel: "--:--" };
  }

  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return { dateLabel: "-- ---", timeLabel: "--:--" };
  }

  const dayLabel = parsed.toLocaleDateString(undefined, { day: "numeric" });
  const monthLabel = parsed
    .toLocaleDateString(undefined, { month: "short" })
    .toUpperCase();
  const timeLabel = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return { dateLabel: `${dayLabel} ${monthLabel}`, timeLabel };
}

function getWorkWeekDays(referenceDate: Date) {
  const baseDate = new Date(referenceDate);
  baseDate.setHours(0, 0, 0, 0);

  const baseDay = baseDate.getDay();
  const diffFromMonday = (baseDay + 6) % 7;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - diffFromMonday);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function formatOptionalText(value?: string | null) {
  if (!value) {
    return "—";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

export default function RegisteredTradePage() {
  const params = useParams<{ tradeId: string }>();
  const router = useRouter();

  const [state, setState] = useState<TradeState>({ status: "loading", trade: null });
  const [activeTab, setActiveTab] = useState<"main" | "library">("main");
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>("upload-1");
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const rawTradeId = params.tradeId;
  const tradeId = Array.isArray(rawTradeId) ? rawTradeId[0] : rawTradeId;

  useEffect(() => {
    if (!tradeId) {
      setState({ status: "missing", trade: null });
      return;
    }

    function refreshTrade() {
      const trades = loadTrades();
      const match = trades.find((storedTrade) => storedTrade.id === tradeId) ?? null;

      setState({ status: match ? "ready" : "missing", trade: match });
    }

    refreshTrade();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrade);

    return () => {
      window.removeEventListener(REGISTERED_TRADES_UPDATED_EVENT, refreshTrade);
    };
  }, [tradeId]);

  const selectedDate = useMemo(() => {
    if (state.trade?.date) {
      const parsed = new Date(state.trade.date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }, [state.trade]);

  const currentWeekDays = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return getWorkWeekDays(selectedDate);
  }, [selectedDate]);

  const dayOfWeekLabel = useMemo(() => {
    if (!selectedDate) {
      return "";
    }

    return selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
    });
  }, [selectedDate]);

  const handleFocusPreview = useCallback(() => {
    previewContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const storedUploads = useMemo(() => {
    if (!state.trade) {
      return [] as string[];
    }

    const fromLibrary = Array.isArray(state.trade.libraryImages)
      ? state.trade.libraryImages.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];

    if (fromLibrary.length > 0) {
      return fromLibrary;
    }

    return state.trade.imageData ? [state.trade.imageData] : [];
  }, [state.trade]);

  const uploadItems = useMemo<LibraryDisplayItem[]>(() => {
    if (storedUploads.length === 0) {
      return [
        {
          id: "upload-1",
          kind: "upload",
          imageData: null,
          card: {
            id: "upload-1",
            label: "Nessuna anteprima",
            visual: (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-muted-fg">
                <EmptyLibraryIcon />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">Vuoto</span>
              </div>
            ),
            disabled: true,
          },
        },
      ];
    }

    return storedUploads.map((src, index) => {
      const id = `upload-${index + 1}`;

      const card: LibrarySectionItem = {
        id,
        label: `Snapshot ${index + 1}`,
        visual: (
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt="Snapshot registrato"
              fill
              sizes="(min-width: 768px) 160px, 200px"
              className="object-cover"
              unoptimized
            />
          </div>
        ),
        onClick: () => {
          handleFocusPreview();
        },
      };

      return {
        id,
        kind: "upload" as const,
        imageData: src,
        card,
      };
    });
  }, [handleFocusPreview, storedUploads]);

  const inspirationItems = useMemo<LibraryDisplayItem[]>(
    () =>
      LIBRARY_INSPIRATION_ENTRIES.map((entry) => ({
        id: entry.id,
        kind: "inspiration" as const,
        entry,
        card: {
          id: entry.id,
          label: entry.label,
          visual: <LibraryInspirationThumbnail entry={entry} />,
          onClick: () => {
            handleFocusPreview();
          },
        },
      })),
    [handleFocusPreview]
  );

  const libraryItems = useMemo<LibraryDisplayItem[]>(
    () => [...uploadItems, ...inspirationItems],
    [inspirationItems, uploadItems],
  );

  useEffect(() => {
    if (libraryItems.length === 0) {
      return;
    }

    if (!libraryItems.some((item) => item.id === selectedLibraryItemId)) {
      setSelectedLibraryItemId(libraryItems[0].id);
    }
  }, [libraryItems, selectedLibraryItemId]);

  const selectedLibraryItem = useMemo(
    () => libraryItems.find((item) => item.id === selectedLibraryItemId) ?? libraryItems[0] ?? null,
    [libraryItems, selectedLibraryItemId],
  );

  const selectedUploadItem =
    selectedLibraryItem && selectedLibraryItem.kind === "upload"
      ? selectedLibraryItem
      : libraryItems.find(
          (item): item is Extract<LibraryDisplayItem, { kind: "upload" }> => item.kind === "upload",
        ) ?? null;

  const selectedInspirationEntry =
    selectedLibraryItem && selectedLibraryItem.kind === "inspiration"
      ? selectedLibraryItem.entry
      : null;

  const activeImageData = selectedUploadItem?.imageData ?? null;

  const handleDownloadImage = useCallback(() => {
    if (!activeImageData) {
      return;
    }

    const link = document.createElement("a");
    link.href = activeImageData;
    link.download = `trade-${state.trade?.id ?? "preview"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeImageData, state.trade?.id]);

  const handleOpenInNewTab = useCallback(() => {
    if (!activeImageData) {
      return;
    }

    window.open(activeImageData, "_blank", "noopener,noreferrer");
  }, [activeImageData]);

  const libraryFooter = activeImageData ? (
    <p className="text-left text-sm text-muted-fg">
      Questo è lo snapshot che hai salvato quando hai registrato l’operazione.
    </p>
  ) : (
    <p className="text-left text-sm text-muted-fg">
      Nessuna immagine è stata allegata a questa operazione.
    </p>
  );

  const uploadPreviewContent = (
    <div ref={previewContainerRef} className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[28px] bg-white shadow-lg ring-1 ring-black/5">
        {activeImageData ? (
          <>
            <Image
              src={activeImageData}
              alt="Trade context attachment"
              fill
              sizes="(min-width: 768px) 560px, 92vw"
              className="object-cover"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/0 to-black/40" />
            <div className="absolute right-5 top-5 z-20 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleFocusPreview}
                className="rounded-full bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Focus
              </button>
              <button
                type="button"
                onClick={handleDownloadImage}
                className="rounded-full bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Scarica
              </button>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="rounded-full bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Apri
              </button>
            </div>
            <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-10 flex flex-col gap-2 text-left text-white drop-shadow">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">
                Before the position
              </span>
              <span className="text-lg font-semibold">Snapshot registrato</span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-neutral-100 text-muted-fg">
            <EmptyLibraryIcon />
            <span className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-fg">
              Nessuna anteprima
            </span>
            <span className="max-w-[28ch] text-center text-xs text-muted-fg/80">
              Aggiungi immagini alle prossime operazioni per costruire un archivio visivo coerente.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const inspirationPreviewContent = selectedInspirationEntry ? (
    <div ref={previewContainerRef} className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
      <LibraryInspirationPreview entry={selectedInspirationEntry} />
    </div>
  ) : null;

  const libraryPreview =
    selectedLibraryItem && selectedLibraryItem.kind === "inspiration"
      ? inspirationPreviewContent ?? uploadPreviewContent
      : uploadPreviewContent ?? inspirationPreviewContent;

  if (state.status === "loading") {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-fg">
        <p className="text-sm font-medium text-muted-fg">Loading trade…</p>
      </section>
    );
  }

  if (state.status === "missing" || !state.trade || !selectedDate) {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-fg">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">Trade not found</h1>
          <p className="max-w-md text-sm text-muted-fg md:text-base">
            We couldn&apos;t find the requested trade in your saved entries. It may have been removed or the link is incorrect.
          </p>
          <Link href="/">
            <Button variant="primary" size="md">Back to dashboard</Button>
          </Link>
        </div>
      </section>
    );
  }

  const activeSymbol =
    availableSymbols.find((symbol) => symbol.code === state.trade?.symbolCode) ?? {
      code: state.trade.symbolCode,
      flag: state.trade.symbolFlag,
    };

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const openTimeDisplay = getDateTimeDisplay(state.trade.openTime);
  const closeTimeDisplay = getDateTimeDisplay(state.trade.closeTime);
  const positionLabel = state.trade.position === "SHORT" ? "Short" : "Long";
  const riskRewardValue = formatOptionalText(state.trade.riskReward);
  const riskValue = formatOptionalText(state.trade.risk);
  const pipsValue = formatOptionalText(state.trade.pips);

  const handleEditTrade = () => {
    if (!state.trade) {
      return;
    }

    router.push(`/new-trade?tradeId=${state.trade.id}`);
  };

  const handleDeleteTrade = () => {
    if (!state.trade) {
      return;
    }

    const shouldDelete = window.confirm("Sei sicuro di voler eliminare questa operazione?");
    if (!shouldDelete) {
      return;
    }

    deleteTrade(state.trade.id);
    setState({ status: "missing", trade: null });
    router.push("/");
  };

  return (
    <section
      className="relative flex min-h-dvh flex-col gap-12 bg-bg px-4 pb-16 text-fg sm:px-6 md:px-10"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 sm:max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-11 flex-none rounded-full p-0 text-lg text-muted-fg hover:text-fg"
          onClick={() => {
            router.back();
          }}
          aria-label="Close"
        >
          ×
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleEditTrade}>
            Edit trade
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-transparent text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleDeleteTrade}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 sm:max-w-4xl">
        <header className="space-y-2">
          <p className="text-sm text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
            Trade details
          </h1>
          <p className="text-sm text-muted-fg md:text-base">Registered on {formattedDate}</p>
        </header>

        <div className="flex w-full flex-col gap-8">
          <nav className="flex w-full flex-wrap items-center justify-center gap-2 px-1 py-2 text-sm text-muted-fg">
            {[
              { label: "Main Data", value: "main" as const },
              { label: "Library", value: "library" as const },
            ].map(({ label, value }) => {
              const isActive = activeTab === value;

              return (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full border px-4 py-2 transition ${
                    isActive
                      ? "border-border bg-surface text-fg"
                      : "border-transparent text-muted-fg hover:border-border hover:text-fg"
                  }`}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value)}
                  disabled={isActive}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {activeTab === "main" ? (
            <>
          <div className="w-full surface-panel px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-x-auto rounded-full border border-border bg-surface px-1 py-1">
              {currentWeekDays.map((date) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const dayNumber = date.getDate();
                const monthLabel = date
                  .toLocaleDateString(undefined, {
                    month: "short",
                  })
                  .toUpperCase();

                const dayNumberClasses = [
                  "flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium transition-colors md:h-12 md:w-12 md:text-xl",
                ];

                const dayNumberStyle: CSSProperties | undefined = isSelected
                  ? {
                      backgroundColor: "color-mix(in srgb, rgb(var(--muted-fg)) 20%, rgb(var(--surface)))",
                    }
                  : undefined;

                if (isSelected) {
                  dayNumberClasses.push("text-fg font-semibold");
                } else {
                  dayNumberClasses.push("border border-border text-fg");
                }

                return (
                  <div
                    key={date.toISOString()}
                    className={`flex min-w-[62px] flex-col items-center gap-2 rounded-full px-3 py-2 text-xs font-medium md:min-w-[88px] md:text-sm ${
                      isSelected ? "text-fg" : "text-muted-fg"
                    }`}
                  >
                    <span className={dayNumberClasses.join(" ")} style={dayNumberStyle}>
                      {dayNumber}
                    </span>
                    <span className={`text-[10px] tracking-[0.3em] md:text-xs ${isSelected ? "text-fg" : "text-muted-fg"}`}>
                      {monthLabel}
                    </span>
                  </div>
                );
              })}

              <div className="ml-auto hidden h-11 w-11 flex-none items-center justify-center rounded-full border border-border text-muted-fg md:flex">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="16" r="1.5" />
                </svg>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-muted-fg md:mt-5 md:text-base">
              Day of the week: <span className="font-semibold text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Symbol</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="text-2xl" aria-hidden="true">
                    {activeSymbol.flag}
                  </span>
                  <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                    {activeSymbol.code}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Open Time</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      {openTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                      {openTimeDisplay.timeLabel}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto h-6 w-6 text-muted-fg"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Close Time</span>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      {closeTimeDisplay.dateLabel}
                    </span>
                    <span className="text-lg font-medium tracking-[0.18em] text-fg md:text-xl">
                      {closeTimeDisplay.timeLabel}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto h-6 w-6 text-muted-fg"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <polyline points="12 7 12 12 15 15" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Conditions</span>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Position</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{positionLabel}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">R/R</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{riskRewardValue}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Risk</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{riskValue}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Nr. Pips</span>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                    <span className="text-sm font-medium text-fg">{pipsValue}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          ) : (
            <LibrarySection
              title="Library"
              subtitle="Prima dell’operazione"
              preview={libraryPreview}
              items={libraryItems.map((item) => item.card)}
              selectedItemId={selectedLibraryItem?.id}
              onSelectItem={setSelectedLibraryItemId}
              footer={libraryFooter}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyLibraryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 text-muted-fg/70"
      aria-hidden="true"
    >
      <rect x="10" y="14" width="44" height="36" rx="6" ry="6" />
      <path d="M10 24h44" />
      <path d="M22 8v12" />
      <path d="M42 8v12" />
      <path d="m24 36 6-6 6 6 6-6 6 6" />
    </svg>
  );
}

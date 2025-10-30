"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { CheckCircle, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { LibrarySection } from "@/components/library/LibrarySection";
import { type LibraryCarouselItem } from "@/components/library/LibraryCarousel";
import {
  deleteTrade,
  loadTradeById,
  REGISTERED_TRADES_UPDATED_EVENT,
  type StoredLibraryItem,
  type StoredTrade,
} from "@/lib/tradesStorage";
import { calculateDuration } from "@/lib/duration";

type TradeState = {
  status: "loading" | "ready" | "missing";
  trade: StoredTrade | null;
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

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() + 1 - day);
  return start;
}

function getWorkWeekDays(referenceDate: Date) {
  const weekStart = getStartOfWeek(referenceDate);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatOptionalText(value?: string | number | boolean | null) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : "—";
  }

  const trimmed = typeof value === "string" ? value.trim() : String(value).trim();
  return trimmed.length > 0 ? trimmed : "—";
}

function padMultiValue(values: string[], length: number) {
  const next = values.slice(0, length);

  while (next.length < length) {
    next.push("");
  }

  return next;
}

const LIBRARY_NAVIGATION_SWIPE_DISTANCE_PX = 40;
const LIBRARY_NAVIGATION_SWIPE_DURATION_MS = 600;
const LIBRARY_NAVIGATION_SCROLL_LOCK_DURATION_MS = 400;

export default function RegisteredTradePage() {
  const params = useParams<{ tradeId: string }>();
  const router = useRouter();

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [state, setState] = useState<TradeState>({ status: "loading", trade: null });
  const [activeTab, setActiveTab] = useState<"main" | "library">("main");
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>("snapshot");
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewSwipeStateRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const scrollLockStateRef = useRef<{ count: number; initialOverflow: string | null }>({
    count: 0,
    initialOverflow: null,
  });
  const scrollUnlockTimeoutsRef = useRef<Set<number>>(new Set());
  const clearScheduledScrollUnlocks = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    scrollUnlockTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scrollUnlockTimeoutsRef.current.clear();
  }, []);

  const rawTradeId = params.tradeId;
  const tradeId = Array.isArray(rawTradeId) ? rawTradeId[0] : rawTradeId;

  const lockBodyScroll = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;
    if (!body) {
      return;
    }

    if (scrollLockStateRef.current.count === 0) {
      scrollLockStateRef.current.initialOverflow = body.style.overflow ?? "";
      body.style.overflow = "hidden";
    }

    scrollLockStateRef.current.count += 1;
  }, []);

  const resetBodyScrollLock = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;
    if (!body) {
      return;
    }

    body.style.overflow = scrollLockStateRef.current.initialOverflow ?? "";
    scrollLockStateRef.current.count = 0;
    scrollLockStateRef.current.initialOverflow = null;
  }, []);

  const unlockBodyScroll = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (scrollLockStateRef.current.count <= 0) {
      scrollLockStateRef.current.count = 0;
      return;
    }

    scrollLockStateRef.current.count -= 1;

    if (scrollLockStateRef.current.count === 0) {
      resetBodyScrollLock();
    }
  }, [resetBodyScrollLock]);

  const temporarilyLockScrollForNavigation = useCallback(
    (navigate: () => void) => {
      lockBodyScroll();

      const release = () => {
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            unlockBodyScroll();
          });
        } else {
          unlockBodyScroll();
        }
      };

      const scheduleRelease = () => {
        if (typeof window === "undefined") {
          release();
          return;
        }

        const timeoutId = window.setTimeout(() => {
          scrollUnlockTimeoutsRef.current.delete(timeoutId);
          release();
        }, LIBRARY_NAVIGATION_SCROLL_LOCK_DURATION_MS);

        scrollUnlockTimeoutsRef.current.add(timeoutId);
      };

      try {
        navigate();
      } finally {
        scheduleRelease();
      }
    },
    [lockBodyScroll, unlockBodyScroll],
  );

  useEffect(() => {
    return () => {
      clearScheduledScrollUnlocks();
      resetBodyScrollLock();
    };
  }, [clearScheduledScrollUnlocks, resetBodyScrollLock]);

  const refreshTrade = useCallback(async () => {
    if (!tradeId) {
      setState({ status: "missing", trade: null });
      return;
    }

    setState((prev) => ({ status: "loading", trade: prev.trade }));

    const match = await loadTradeById(tradeId);
    setState({ status: match ? "ready" : "missing", trade: match });
  }, [tradeId]);

  useEffect(() => {
    refreshTrade();
  }, [refreshTrade]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleUpdate = () => {
      refreshTrade();
    };

    window.addEventListener(REGISTERED_TRADES_UPDATED_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(REGISTERED_TRADES_UPDATED_EVENT, handleUpdate);
    };
  }, [refreshTrade]);

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

  const renderWeekDayPill = useCallback(
    (date: Date) => {
      const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
      const isToday = isSameDay(date, today);
      const dayNumber = date.getDate();
      const monthLabel = date
        .toLocaleDateString(undefined, {
          month: "short",
        })
        .toUpperCase();

      const pillClasses = [
        "flex min-w-[62px] flex-col items-center gap-1 rounded-full border border-transparent px-2 py-2 text-xs font-medium transition md:min-w-[88px] md:text-sm",
      ];

      if (isSelected) {
        pillClasses.push("text-fg");
      } else if (isToday) {
        pillClasses.push("text-accent hover:text-accent");
      } else {
        pillClasses.push("text-muted-fg hover:text-fg");
      }

      const dayNumberClasses = [
        "flex h-10 w-10 items-center justify-center rounded-full text-lg font-medium transition-colors md:h-12 md:w-12 md:text-xl",
      ];

      const dayNumberStyle: CSSProperties | undefined = isSelected
        ? {
            backgroundColor:
              "color-mix(in srgb, rgb(var(--muted-fg)) 20%, rgb(var(--surface)))",
          }
        : undefined;

      if (isSelected) {
        dayNumberClasses.push("text-fg font-semibold");
      } else if (isToday) {
        dayNumberClasses.push("border border-accent/60 text-accent");
      } else {
        dayNumberClasses.push("border border-transparent text-fg");
      }

      return (
        <div key={date.toISOString()} className={pillClasses.join(" ")} role="presentation">
          <span className={dayNumberClasses.join(" ")} style={dayNumberStyle}>
            {dayNumber}
          </span>
          <span
            className={`text-[10px] tracking-[0.3em] md:text-xs ${
              isSelected ? "text-fg" : "text-muted-fg"
            }`}
          >
            {monthLabel}
          </span>
          {isToday ? <span className="sr-only">Today</span> : null}
        </div>
      );
    },
    [selectedDate, today],
  );

  const dayOfWeekLabel = useMemo(() => {
    if (!selectedDate) {
      return "";
    }

    return selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
    });
  }, [selectedDate]);
  const openTimeValue = useMemo(() => {
    const iso = state.trade?.openTime;
    if (!iso) {
      return null;
    }

    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [state.trade?.openTime]);
  const closeTimeValue = useMemo(() => {
    const iso = state.trade?.closeTime;
    if (!iso) {
      return null;
    }

    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [state.trade?.closeTime]);
  const durationLabel = useMemo(() => {
    if (!openTimeValue || !closeTimeValue) {
      return "0h 00min";
    }

    if (closeTimeValue.getTime() <= openTimeValue.getTime()) {
      return "0h 00min";
    }

    return calculateDuration(openTimeValue, closeTimeValue);
  }, [openTimeValue, closeTimeValue]);

  const libraryItems = useMemo<StoredLibraryItem[]>(() => {
    if (!state.trade) {
      return [
        {
          id: "snapshot",
          imageData: null,
          notes: "",
          createdAt: null,
        },
      ];
    }

    const hydrated = Array.isArray(state.trade.libraryItems)
      ? state.trade.libraryItems
          .filter((item): item is StoredLibraryItem => Boolean(item) && typeof item.id === "string")
          .map((item) => ({
            ...item,
            id: item.id,
            imageData: item.imageData ?? null,
            notes: typeof item.notes === "string" ? item.notes : "",
            persisted: item.persisted ?? Boolean(item.recordId ?? item.id),
          }))
      : [];

    if (hydrated.length > 0) {
      return hydrated;
    }

    return [
      {
        id: "snapshot",
        imageData: null,
        notes: "",
        createdAt: null,
      },
    ];
  }, [state.trade]);

  useEffect(() => {
    if (libraryItems.length === 0) {
      setSelectedLibraryItemId("snapshot");
      return;
    }

    setSelectedLibraryItemId((prev) => {
      if (libraryItems.some((item) => item.id === prev)) {
        return prev;
      }
      return libraryItems[0].id;
    });
  }, [libraryItems]);

  const selectedLibraryItem = useMemo(
    () =>
      libraryItems.find((item) => item.id === selectedLibraryItemId) ??
      libraryItems[0] ??
      null,
    [libraryItems, selectedLibraryItemId],
  );

  const selectedImageData = selectedLibraryItem?.imageData ?? null;
  const selectedLibraryNote = selectedLibraryItem?.notes ?? "";

  const canNavigateLibrary = libraryItems.length > 1;

  const goToAdjacentLibraryItem = useCallback(
    (direction: 1 | -1) => {
      if (libraryItems.length === 0) {
        return;
      }

      setSelectedLibraryItemId((currentId) => {
        if (libraryItems.length === 0) {
          return currentId;
        }

        if (libraryItems.length === 1) {
          return libraryItems[0]?.id ?? currentId;
        }

        const currentIndex = libraryItems.findIndex((item) => item.id === currentId);
        const baseIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (baseIndex + direction + libraryItems.length) % libraryItems.length;
        return libraryItems[nextIndex]?.id ?? currentId;
      });
    },
    [libraryItems],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const previewElement = previewContainerRef.current;
      if (!previewElement || !document.body.contains(previewElement)) {
        return;
      }

      if (event.key === "ArrowRight") {
        if (!canNavigateLibrary) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        temporarilyLockScrollForNavigation(() => {
          goToAdjacentLibraryItem(1);
        });
      } else if (event.key === "ArrowLeft") {
        if (!canNavigateLibrary) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        temporarilyLockScrollForNavigation(() => {
          goToAdjacentLibraryItem(-1);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigateLibrary, goToAdjacentLibraryItem, temporarilyLockScrollForNavigation]);

  const handlePreviewTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      event.stopPropagation();

      const touch = event.touches[0];
      if (!touch) {
        previewSwipeStateRef.current = null;
        return;
      }

      previewSwipeStateRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [],
  );

  const handlePreviewTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const swipeStart = previewSwipeStateRef.current;

      if (!swipeStart) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!canNavigateLibrary) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - swipeStart.x;
      const deltaY = touch.clientY - swipeStart.y;

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      if (Math.abs(deltaX) < 10) {
        return;
      }

      event.preventDefault();
    },
    [canNavigateLibrary],
  );

  const handlePreviewTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const swipeStart = previewSwipeStateRef.current;
      previewSwipeStateRef.current = null;

      if (!swipeStart) {
        return;
      }

      if (!canNavigateLibrary) {
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - swipeStart.x;
      const deltaY = touch.clientY - swipeStart.y;
      const elapsed = Date.now() - swipeStart.time;

      if (elapsed > LIBRARY_NAVIGATION_SWIPE_DURATION_MS) {
        return;
      }

      if (Math.abs(deltaX) < LIBRARY_NAVIGATION_SWIPE_DISTANCE_PX) {
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const direction: 1 | -1 = deltaX > 0 ? -1 : 1;

      temporarilyLockScrollForNavigation(() => {
        goToAdjacentLibraryItem(direction);
      });
    },
    [canNavigateLibrary, goToAdjacentLibraryItem, temporarilyLockScrollForNavigation],
  );

  const handlePreviewTouchCancel = useCallback(() => {
    previewSwipeStateRef.current = null;
  }, []);

  const handlePreviewWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const libraryCards = useMemo(
    () =>
      libraryItems.map((item, index) => {
        const hasImage = Boolean(item.imageData);

        return {
          id: item.id,
          label: hasImage ? `Anteprima ${index + 1}` : "Nessuna anteprima",
          visual: hasImage ? (
            <div className="relative h-full w-full">
              <Image
                src={item.imageData!}
                alt={`Snapshot libreria ${index + 1}`}
                fill
                sizes="(min-width: 768px) 160px, 200px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl bg-[color:rgb(var(--surface)/0.85)] text-muted-fg">
              <EmptyLibraryIcon />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">Vuoto</span>
            </div>
          ),
        } satisfies LibraryCarouselItem;
      }),
    [libraryItems]
  );

  const libraryFooter = selectedImageData ? (
    <p className="text-left text-sm text-muted-fg">
      Questo è lo snapshot che hai salvato quando hai registrato l’operazione.
    </p>
  ) : (
    <p className="text-left text-sm text-muted-fg">
      Nessuna immagine è stata allegata a questa operazione.
    </p>
  );

  const primaryPreviewContent = (
    <div
      ref={previewContainerRef}
      className="w-full"
      onWheel={handlePreviewWheel}
      onTouchStart={handlePreviewTouchStart}
      onTouchMove={handlePreviewTouchMove}
      onTouchEnd={handlePreviewTouchEnd}
      onTouchCancel={handlePreviewTouchCancel}
    >
      {selectedImageData ? (
        <span className="relative block aspect-[16/9] w-full">
          <Image
            src={selectedImageData}
            alt="Trade context attachment"
            fill
            className="h-full w-full object-contain"
            sizes="100vw"
            unoptimized
            priority
          />
        </span>
      ) : (
        <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-4 rounded-[28px] bg-gradient-to-b from-[color:rgb(var(--surface)/0.94)] to-[color:rgb(var(--surface)/0.78)] text-muted-fg">
          <EmptyLibraryIcon />
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-fg">Nessuna anteprima</span>
          <span className="max-w-[28ch] text-center text-xs text-muted-fg/80">
            Aggiungi immagini alle prossime operazioni per costruire un archivio visivo coerente.
          </span>
        </div>
      )}
    </div>
  );
  const libraryPreview = primaryPreviewContent;

  const libraryNotesField = (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="library-note-viewer"
        className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-fg"
      >
        Note
      </label>
      <textarea
        id="library-note-viewer"
        value={selectedLibraryNote}
        readOnly
        aria-readonly="true"
        placeholder="Note salvate"
        className="min-h-[120px] w-full resize-none rounded-none border border-border bg-[color:rgb(var(--accent)/0.06)] px-5 py-4 text-sm font-medium text-fg opacity-80 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
      />
    </div>
  );

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

  const tradeOutcomeLabel =
    state.trade.tradeOutcome === "profit"
      ? "Profit"
      : state.trade.tradeOutcome === "loss"
        ? "Loss"
        : null;

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const openTimeDisplay = getDateTimeDisplay(state.trade.openTime);
  const closeTimeDisplay = getDateTimeDisplay(state.trade.closeTime);
  const positionLabel = state.trade.position === "SHORT" ? "Short" : "Long";
  const entryPriceValue = formatOptionalText(state.trade.entryPrice);
  const stopLossValue = formatOptionalText(state.trade.stopLoss);
  const takeProfitTargets = (state.trade.takeProfit ?? []).map((value) =>
    value !== null && value !== undefined ? value.toString() : "",
  );
  const riskRewardTargets = (state.trade.riskReward ?? []).map((value) =>
    value ?? "",
  );
  const riskValue = formatOptionalText(state.trade.risk);
  const pipsTargets = (state.trade.pips ?? []).map((value) =>
    value !== null && value !== undefined ? value.toString() : "",
  );
  const lotSizeValue = formatOptionalText(state.trade.lotSize);
  const pnlTargets = (state.trade.pnl ?? []).map((value) =>
    value !== null && value !== undefined ? value.toString() : "",
  );
  const targetColumnCount = Math.max(
    1,
    takeProfitTargets.length,
    riskRewardTargets.length,
    pipsTargets.length,
    pnlTargets.length,
  );
  const normalizedTakeProfitTargets = padMultiValue(takeProfitTargets, targetColumnCount);
  const normalizedRiskRewardTargets = padMultiValue(riskRewardTargets, targetColumnCount);
  const normalizedPipsTargets = padMultiValue(pipsTargets, targetColumnCount);
  const normalizedPnlTargets = padMultiValue(pnlTargets, targetColumnCount);
  const isEditMode = false; // This page shows read-only data; editing happens on the new trade form.
  const targetDisplayConfigs = [
    { idPrefix: "take-profit", label: "Take Profit", values: normalizedTakeProfitTargets },
    { idPrefix: "risk-reward", label: "R/R", values: normalizedRiskRewardTargets },
    { idPrefix: "nr-pips", label: "Nr. Pips", values: normalizedPipsTargets },
  ];
  const pnlDisplayConfig = {
    idPrefix: "pnl",
    label: "P&L",
    values: normalizedPnlTargets,
  };
  const shouldShowRemovalBadge = isEditMode && targetColumnCount > 1;

  const renderTargetDisplay = ({
    idPrefix,
    label,
    values,
  }: {
    idPrefix: string;
    label: string;
    values: string[];
  }) => (
    <div className="flex flex-col gap-2" key={idPrefix}>
      <div
        className={isEditMode ? "grid gap-3 pr-12" : "grid gap-3"}
        style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
      >
        {values.map((_, columnIndex) => (
          <span
            key={`${idPrefix}-label-${columnIndex}`}
            className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
          >
            {`${label} ${columnIndex + 1}`}
          </span>
        ))}
      </div>
      <div className="relative">
        <div
          className={isEditMode ? "grid gap-3 pr-12" : "grid gap-3"}
          style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
        >
          {values.map((value, columnIndex) => {
            const formattedValue = formatOptionalText(value);
            const showRemovalBadge = shouldShowRemovalBadge && columnIndex === targetColumnCount - 1;

            return (
              <div className="group relative" key={`${idPrefix}-value-${columnIndex}`}>
                <div className="w-full rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="text-sm font-medium text-fg">{formattedValue}</span>
                </div>
                {showRemovalBadge ? (
                  <span
                    className="pointer-events-none absolute -right-2 -top-2 inline-flex h-6 w-6 transform items-center justify-center rounded-full border border-border bg-[color:rgb(var(--surface))] text-muted-fg shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:opacity-100"
                    aria-hidden="true"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {isEditMode ? (
          <span
            className="pointer-events-none absolute right-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[color:rgb(var(--accent))] text-white opacity-60"
            aria-hidden="true"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
  const preTradeMentalStateValue = formatOptionalText(state.trade.preTradeMentalState);
  const emotionsDuringTradeValue = formatOptionalText(state.trade.emotionsDuringTrade);
  const emotionsAfterTradeValue = formatOptionalText(state.trade.emotionsAfterTrade);
  const confidenceLevelValue = formatOptionalText(state.trade.confidenceLevel);
  const emotionalTriggerValue = formatOptionalText(state.trade.emotionalTrigger);
  const followedPlanValue = formatOptionalText(state.trade.followedPlan);
  const respectedRiskValue = formatOptionalText(state.trade.respectedRisk);
  const wouldRepeatTradeValue = formatOptionalText(state.trade.wouldRepeatTrade);

  const handleEditTrade = () => {
    if (!state.trade) {
      return;
    }

    router.push(`/new-trade?tradeId=${state.trade.id}`);
  };

  const handleDeleteTrade = async () => {
    if (!state.trade) {
      return;
    }

    const shouldDelete = window.confirm("Sei sicuro di voler eliminare questa operazione?");
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteTrade(state.trade.id);
      setState({ status: "missing", trade: null });
      router.push("/");
    } catch (error) {
      console.error("Failed to delete trade", error);
      window.alert("Impossibile eliminare il trade. Riprova.");
    }
  };

  return (
    <section
      className="page-shell relative flex min-h-dvh flex-col gap-12 pb-20 pt-24 text-fg sm:pt-28"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-12 w-12 flex-none rounded-full border border-border bg-[color:rgb(var(--surface)/0.92)] p-0 text-lg text-muted-fg backdrop-blur hover:text-fg"
          onClick={() => {
            router.push("/");
          }}
          aria-label="Close"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" className="px-5" onClick={handleEditTrade}>
            Edit trade
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-transparent text-red-500 transition hover:border-[color:rgba(248,113,113,0.3)] hover:bg-[color:rgba(248,113,113,0.08)] hover:text-red-600"
            onClick={handleDeleteTrade}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-14">
        <div className="mx-auto w-full max-w-4xl">
          <header className="section-heading items-start text-left">
            <p>Trading Journal</p>
            <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
              Trade details
            </h1>
            <p className="text-sm text-muted-fg md:text-base">Registered on {formattedDate}</p>
          </header>
        </div>

        <div className="flex w-full flex-col gap-8">
          <nav className="flex w-full items-center justify-center">
            <div className="flex items-center gap-4 text-sm font-medium text-muted-fg">
              {[
                { label: "Main Data", value: "main" as const },
                { label: "Library", value: "library" as const },
              ].map(({ label, value }) => {
                const isActive = activeTab === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={`relative rounded-full px-5 py-2 transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:rgba(99,102,241,0.35)] ${
                      isActive
                        ? "bg-[color:rgb(var(--surface))] text-fg shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                        : "text-muted-fg hover:text-fg"
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>

          {activeTab === "main" ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 sm:max-w-4xl">
          <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
            <div className="flex flex-col gap-6">
              <div>
                <div className="mx-auto flex w-full max-w-xl items-center gap-3">
                  <div className="relative flex min-w-0 flex-1 overflow-hidden rounded-full border border-border bg-surface px-1 py-1">
                    <div className="flex w-full items-center justify-center gap-2">
                      {currentWeekDays.map((date) => renderWeekDayPill(date))}
                    </div>
                  </div>

                  <div
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border text-muted-fg transition"
                    aria-hidden="true"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6"
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

                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Symbol</span>
                    <div className="flex flex-wrap justify-center gap-6">
                      <div className="flex h-32 w-[12.5rem] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[color:rgb(var(--surface)/0.9)] px-4 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
                        <span className="text-2xl" aria-hidden="true">
                          {activeSymbol.flag}
                        </span>
                        <div className="flex items-center justify-center gap-2 text-fg">
                          <span className="text-lg font-semibold tracking-[0.2em] md:text-xl">
                            {activeSymbol.code}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`flex h-32 w-[12.5rem] flex-col items-center justify-center gap-3 rounded-2xl border px-4 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] ${
                          state.trade.tradeOutcome === "profit"
                            ? "border-[#A6E8B0] bg-[#E6F9EC] text-[#2E7D32]"
                            : state.trade.tradeOutcome === "loss"
                              ? "border-[#F5B7B7] bg-[#FCE8E8] text-[#C62828]"
                              : "border-border bg-[color:rgb(var(--surface)/0.9)] text-[color:rgb(var(--muted-fg)/0.7)]"
                        }`}
                      >
                        {tradeOutcomeLabel ? (
                          <span
                            className={`text-lg font-semibold tracking-[0.14em] capitalize md:text-xl ${
                              state.trade.tradeOutcome === "profit" ? "text-[#2E7D32]" : "text-[#C62828]"
                            }`}
                          >
                            {tradeOutcomeLabel}
                          </span>
                        ) : (
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[color:rgb(var(--muted-fg)/0.7)]">
                            Select outcome
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex h-32 w-[12.5rem] flex-col items-center justify-center gap-3 rounded-2xl border px-4 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          state.trade.isPaperTrade
                            ? "border-[#A7C8FF] bg-[#E6EEFF] text-[#2F6FED]"
                            : "border-[#A6E8B0] bg-[#E8F9EE] text-[#2E7D32]"
                        }`}
                      >
                        {state.trade.isPaperTrade ? (
                          <CheckCircle
                            className="h-5 w-5 text-[#2F6FED]"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle
                            className="h-5 w-5 text-[#2E7D32]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-sm font-medium tracking-[0.08em]">
                          {state.trade.isPaperTrade ? "Paper Trade" : "Real Trade"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="flex flex-col">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Open Time</span>
                    <div className="pointer-events-none relative flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="pill-date rounded-full px-3 py-1 text-sm font-medium md:text-base">
                          {openTimeDisplay.dateLabel}
                        </span>
                        <span className="pill-time rounded-full px-3 py-1 text-sm font-semibold tracking-[0.08em] md:text-base">
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
                    <div className="pointer-events-none relative flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="pill-date rounded-full px-3 py-1 text-sm font-medium md:text-base">
                          {closeTimeDisplay.dateLabel}
                        </span>
                        <span className="pill-time rounded-full px-3 py-1 text-sm font-semibold tracking-[0.08em] md:text-base">
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
                <p className="mt-2 text-center text-sm text-muted-fg md:mt-3 md:text-base">
                  Duration: {durationLabel}
                </p>
              </div>

              <div className="mt-6 border-t border-border" />

              <div className="flex flex-col gap-4">
                <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
                  General Details
                </span>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Position</span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{formatOptionalText(positionLabel)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Entry Price</span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{entryPriceValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Stop Loss</span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{stopLossValue}</span>
                    </div>
                  </div>

                  {targetDisplayConfigs.map(renderTargetDisplay)}
                </div>
              </div>

              <div className="my-6 border-t border-border" />

              <div className="flex flex-col gap-4">
                <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
                  Risk Details
                </span>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Lot Size</span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{lotSizeValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">Risk</span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{riskValue}</span>
                    </div>
                  </div>

                  {renderTargetDisplay(pnlDisplayConfig)}
                </div>
              </div>

              <div className="mt-6 border-t border-border" />

              <div className="flex flex-col gap-4">
                <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
                  Psychology & Mindset
                </span>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Mental state before the trade
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{preTradeMentalStateValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Emotions during the trade
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{emotionsDuringTradeValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Emotions after the trade
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{emotionsAfterTradeValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Confidence level (1–10)
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{confidenceLevelValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Emotional triggers
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{emotionalTriggerValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Did I follow my plan?
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{followedPlanValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Did I respect my planned risk?
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{respectedRiskValue}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Would I take this trade again?
                    </span>
                    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                      <span className="text-sm font-medium text-fg">{wouldRepeatTradeValue}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            </div>
          ) : (
            <LibrarySection
              preview={libraryPreview}
              notes={libraryNotesField}
              actions={libraryCards}
              selectedActionId={selectedLibraryItemId}
              onSelectAction={setSelectedLibraryItemId}
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

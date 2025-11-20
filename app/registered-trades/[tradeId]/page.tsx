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
import {
  Circle,
  CheckCircle,
  Plus,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { LibrarySection } from "@/components/library/LibrarySection";
import { type LibraryCarouselItem } from "@/components/library/LibraryCarousel";
import {
  deleteTrade,
  loadTradeById,
  REGISTERED_TRADES_UPDATED_EVENT,
  LAST_OPENED_TRADE_STORAGE_KEY,
  type StoredLibraryItem,
  type StoredTrade,
} from "@/lib/tradesStorage";
import { getLibraryCardTitle } from "@/lib/libraryCardTitles";
import { calculateDuration } from "@/lib/duration";
import {
  getTakeProfitOutcomeStyle,
  type TakeProfitOutcome,
} from "@/lib/takeProfitOutcomeStyles";
import {
  applyOutcomeToPips,
  calculateOverallPips,
  calculatePips,
  calculateStopLossDistance,
  calculateTakeProfitDistance,
  formatPips,
} from "@/lib/pips";

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
    return "Sì";
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

type TargetDisplayConfig = {
  idPrefix: string;
  label: string;
  values: Array<string | number | boolean | null>;
};

function padMultiValue<T>(values: T[], length: number, createFiller: () => T) {
  const next = values.slice(0, length);

  while (next.length < length) {
    next.push(createFiller());
  }

  return next;
}

function normalizeTakeProfitOutcome(value: unknown): TakeProfitOutcome {
  return value === "profit" || value === "loss" ? value : "";
}

const LIBRARY_NAVIGATION_SWIPE_DISTANCE_PX = 40;
const LIBRARY_NAVIGATION_SWIPE_DURATION_MS = 600;
const LIBRARY_NAVIGATION_SCROLL_LOCK_DURATION_MS = 400;

function createFallbackLibraryItem(): StoredLibraryItem {
  return {
    id: "snapshot",
    imageData: null,
    notes: "",
    createdAt: null,
    persisted: false,
    orderIndex: 0,
  } satisfies StoredLibraryItem;
}

function normalizeLibraryOrderIndex(value?: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  return null;
}

function normalizeRegisteredLibraryItems(items: StoredLibraryItem[]) {
  return items
    .slice()
    .sort((a, b) => {
      const aIndex = normalizeLibraryOrderIndex(a.orderIndex) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = normalizeLibraryOrderIndex(b.orderIndex) ?? Number.MAX_SAFE_INTEGER;

      if (aIndex === bIndex) {
        return (a.id ?? "").localeCompare(b.id ?? "");
      }

      return aIndex - bIndex;
    })
    .map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
}

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
  const [displayedTab, setDisplayedTab] = useState<"main" | "library">("main");
  const [isTabFadingOut, setIsTabFadingOut] = useState(false);
  const tabTransitionTimeoutRef = useRef<number | null>(null);
  const hasInitializedTabs = useRef(false);
  const [libraryItems, setLibraryItems] = useState<StoredLibraryItem[]>(() => [
    createFallbackLibraryItem(),
  ]);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>("snapshot");
  const [isTradeContentVisible, setIsTradeContentVisible] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number | null>(null);
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

  useEffect(() => {
    if (!hasInitializedTabs.current) {
      hasInitializedTabs.current = true;
      return;
    }

    if (tabTransitionTimeoutRef.current) {
      window.clearTimeout(tabTransitionTimeoutRef.current);
    }

    setIsTabFadingOut(true);

    tabTransitionTimeoutRef.current = window.setTimeout(() => {
      setDisplayedTab(activeTab);
      setIsTabFadingOut(false);
    }, 170);

    return () => {
      if (tabTransitionTimeoutRef.current) {
        window.clearTimeout(tabTransitionTimeoutRef.current);
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }

    setIsTradeContentVisible(false);

    const frame = window.requestAnimationFrame(() => {
      setIsTradeContentVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [state.status, state.trade?.id]);

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
  const currentTrade = state.trade ?? null;
  const currentTradeId = currentTrade?.id ?? null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (state.status !== "ready" || !currentTradeId) {
      return;
    }

    try {
      window.localStorage.setItem(LAST_OPENED_TRADE_STORAGE_KEY, currentTradeId);
    } catch {
      // Ignore persistence failures (e.g., storage disabled)
    }
  }, [state.status, currentTradeId]);

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
        "flex flex-1 basis-0 min-w-0 flex-col items-center gap-1 rounded-full border border-transparent px-2 py-2 text-xs font-medium transition md:flex-none md:min-w-[88px] md:text-sm",
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

  useEffect(() => {
    if (!state.trade) {
      setLibraryItems([createFallbackLibraryItem()]);
      return;
    }

    const hydrated = Array.isArray(state.trade.libraryItems)
      ? state.trade.libraryItems
          .filter((item): item is StoredLibraryItem => Boolean(item) && typeof item.id === "string")
          .map((item, index) => ({
            ...item,
            id: item.id,
            imageData: item.imageData ?? null,
            notes: typeof item.notes === "string" ? item.notes : "",
            persisted: item.persisted ?? Boolean(item.recordId ?? item.id),
            orderIndex: normalizeLibraryOrderIndex(item.orderIndex) ?? index,
          }))
      : [];

    if (hydrated.length > 0) {
      setLibraryItems(normalizeRegisteredLibraryItems(hydrated));
      return;
    }

    setLibraryItems([createFallbackLibraryItem()]);
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
  const selectedLibraryTitle = useMemo(() => {
    if (!selectedLibraryItem) {
      return "";
    }

    const normalizedIndex = normalizeLibraryOrderIndex(selectedLibraryItem.orderIndex);
    if (normalizedIndex !== null) {
      return getLibraryCardTitle(normalizedIndex);
    }

    const fallbackIndex = libraryItems.findIndex((item) => item.id === selectedLibraryItem.id);
    return getLibraryCardTitle(fallbackIndex === -1 ? 0 : fallbackIndex);
  }, [libraryItems, selectedLibraryItem]);

  const canNavigateLibrary = libraryItems.length > 1;

  useEffect(() => {
    if (!selectedImageData) {
      setIsPreviewModalOpen(false);
      setPreviewAspectRatio(null);
    }
  }, [selectedImageData]);

  useEffect(() => {
    if (!isPreviewModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreviewModalOpen]);

  useEffect(() => {
    if (!isPreviewModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isPreviewModalOpen]);

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
        const orderIndex = normalizeLibraryOrderIndex(item.orderIndex) ?? index;
        const title = getLibraryCardTitle(orderIndex);

        return {
          id: item.id,
          label: title,
          visual: hasImage ? (
            <div className="relative h-full w-full">
              <Image
                src={item.imageData!}
                alt={`${title} snapshot`}
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
      data-library-preview-stack
      className="flex w-full flex-col"
      style={{ gap: "0.5cm" }}
    >
      {selectedLibraryTitle ? (
        <h3 className="text-2xl font-semibold leading-tight text-foreground">
          {selectedLibraryTitle}
        </h3>
      ) : null}
      <div
        ref={previewContainerRef}
        className="w-full lg:max-w-screen-lg"
        onWheel={handlePreviewWheel}
        onTouchStart={handlePreviewTouchStart}
        onTouchMove={handlePreviewTouchMove}
        onTouchEnd={handlePreviewTouchEnd}
        onTouchCancel={handlePreviewTouchCancel}
      >
        <span
          data-library-preview-image
          className={`relative block aspect-[16/9] w-full overflow-hidden rounded-lg border border-[color:rgb(148_163_184/0.58)] ${
            selectedImageData ? "cursor-zoom-in" : ""
          }`}
          role={selectedImageData ? "button" : undefined}
          tabIndex={selectedImageData ? 0 : undefined}
          aria-label={selectedImageData ? "Visualizza immagine della library a schermo intero" : undefined}
          onClick={() => {
            if (selectedImageData) {
              setIsPreviewModalOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (!selectedImageData) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsPreviewModalOpen(true);
            }
          }}
        >
          {selectedImageData ? (
            <Image
              src={selectedImageData}
              alt="Trade context attachment"
              fill
              className="h-full w-full object-contain"
              sizes="100vw"
              onLoadingComplete={({ naturalWidth, naturalHeight }) => {
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setPreviewAspectRatio(naturalWidth / naturalHeight);
                }
              }}
              unoptimized
              priority
            />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[color:rgb(var(--surface)/0.94)] to-[color:rgb(var(--surface)/0.78)] text-muted-fg">
              <EmptyLibraryIcon />
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-fg">Nessuna anteprima</span>
              <span className="max-w-[28ch] text-center text-xs text-muted-fg/80">
                Aggiungi immagini alle prossime operazioni per costruire un archivio visivo coerente.
              </span>
            </span>
          )}
        </span>
      </div>
    </div>
  );
  const libraryPreview = primaryPreviewContent;

  const modalAspectRatio = useMemo(() => {
    if (previewAspectRatio && Number.isFinite(previewAspectRatio) && previewAspectRatio > 0) {
      return `${previewAspectRatio}`;
    }

    return "3 / 2";
  }, [previewAspectRatio]);

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

  const tabPanelClassName = `tab-transition-panel ${
    isTabFadingOut ? "tab-transition-panel--exiting" : "tab-transition-panel--active"
  }`;

  if (state.status === "loading") {
    return (
      <section className="relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-fg">
        <p className="text-sm font-medium text-muted-fg">Loading trade…</p>
      </section>
    );
  }

  const trade = state.trade;

  if (state.status === "missing" || !trade || !selectedDate) {
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
    availableSymbols.find((symbol) => symbol.code === trade.symbolCode) ?? {
      code: trade.symbolCode,
      flag: trade.symbolFlag,
    };

  const tradeOutcomeLabel =
    trade.tradeOutcome === "profit"
      ? "Profit"
      : trade.tradeOutcome === "loss"
        ? "Loss"
        : null;

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const openTimeDisplay = getDateTimeDisplay(trade.openTime);
  const closeTimeDisplay = getDateTimeDisplay(trade.closeTime);
  const positionLabel = trade.position === "SHORT" ? "Short" : "Long";
  const entryPriceValue = formatOptionalText(trade.entryPrice);
  const stopLossValue = formatOptionalText(trade.stopLoss);
  const stopLossDistancePips = calculateStopLossDistance({
    entryPrice: trade.entryPrice,
    stopLossPrice: trade.stopLoss,
    position: trade.position,
  });
  const stopLossPipLabelClassName =
    stopLossDistancePips === null ? "text-muted-fg" : "text-fg";
  const stopLossPipDisplayValue =
    stopLossDistancePips === null ? "—" : stopLossDistancePips.toFixed(1);
  const takeProfitValuesRaw = trade.takeProfit ?? [];
  const takeProfitTargets = takeProfitValuesRaw.map((value) =>
    value !== null && value !== undefined ? value.toString() : "",
  );
  const takeProfitOutcomeValues = (trade.takeProfitOutcomes ?? []).map((value) =>
    normalizeTakeProfitOutcome(value),
  );
  const riskRewardTargets = (trade.riskReward ?? []).map((value) =>
    value ?? "",
  );
  const riskTargets = (trade.risk ?? []).map((value) =>
    typeof value === "number" && Number.isFinite(value) ? value : null,
  );
  const pipsValuesRaw = trade.pips ?? [];
  const lotSizeTargets = (trade.lotSize ?? []).map((value) =>
    typeof value === "string" ? value.trim() : value ?? "",
  );
  const pnlValuesRaw = trade.pnl ?? [];
  const pnlTargets = pnlValuesRaw.map((value) =>
    value !== null && value !== undefined ? value.toString() : "",
  );
  const targetColumnCount = Math.max(
    1,
    takeProfitTargets.length,
    takeProfitOutcomeValues.length,
    riskRewardTargets.length,
    riskTargets.length,
    lotSizeTargets.length,
    pipsValuesRaw.length,
    pnlValuesRaw.length,
  );
  const normalizedTakeProfitTargets = padMultiValue(takeProfitTargets, targetColumnCount, () => "");
  const normalizedTakeProfitOutcomeValues = padMultiValue<TakeProfitOutcome>(
    takeProfitOutcomeValues,
    targetColumnCount,
    () => "",
  );
  const takeProfitDistancePipValues = padMultiValue<number | null>(
    takeProfitValuesRaw.map((value) =>
      calculateTakeProfitDistance({
        entryPrice: trade.entryPrice,
        takeProfitPrice: value,
        position: trade.position,
      }),
    ),
    targetColumnCount,
    () => null,
  );
  const normalizedTakeProfitOutcomeLabels = normalizedTakeProfitOutcomeValues.map((value) =>
    value === "profit" ? "Profit" : value === "loss" ? "Loss" : "",
  );
  const normalizedRiskRewardTargets = padMultiValue(riskRewardTargets, targetColumnCount, () => "");
  const normalizedLotSizeTargets = padMultiValue(lotSizeTargets, targetColumnCount, () => "");
  const normalizedRiskTargets = padMultiValue(riskTargets, targetColumnCount, () => null);
  const entryPriceNumber =
    typeof trade.entryPrice === "number" && Number.isFinite(trade.entryPrice)
      ? trade.entryPrice
      : null;
  const stopLossNumber =
    typeof trade.stopLoss === "number" && Number.isFinite(trade.stopLoss)
      ? trade.stopLoss
      : null;
  const normalizedTakeProfitNumbers = padMultiValue(
    takeProfitValuesRaw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : null,
    ),
    targetColumnCount,
    () => null,
  );
  const normalizedStoredPipNumbers = padMultiValue(
    pipsValuesRaw.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : null,
    ),
    targetColumnCount,
    () => null,
  );
  const normalizedComputedPipNumbers = normalizedTakeProfitOutcomeValues.map(
    (outcome, index) => {
      const takeProfitPrice = normalizedTakeProfitNumbers[index];
      const storedValue = normalizedStoredPipNumbers[index];

      const computedValue = calculatePips({
        entryPrice: entryPriceNumber,
        takeProfitPrice,
        stopLossPrice: stopLossNumber,
        position:
          trade.position === "LONG" || trade.position === "SHORT"
            ? trade.position
            : null,
        outcome,
      });

      if (computedValue !== null) {
        return computedValue;
      }

      return applyOutcomeToPips({ value: storedValue, outcome });
    },
  );
  const normalizedPipsTargets = takeProfitDistancePipValues.map((distance) => {
    if (distance === null) {
      return "";
    }

    const formatted = formatPips(distance);
    return formatted === "0" ? "0.0" : formatted;
  });
  const normalizedPnlTargets = padMultiValue(pnlTargets, targetColumnCount, () => "");
  const overallPips = calculateOverallPips(normalizedComputedPipNumbers);
  const formattedOverallPips = overallPips === null ? null : formatPips(overallPips);
  const overallPipsSummary =
    overallPips === null
      ? null
      : overallPips > 0 && formattedOverallPips
        ? { label: `Overall Profit (${formattedOverallPips} pips)`, className: "text-[#2E7D32]" }
        : overallPips < 0 && formattedOverallPips
          ? { label: `Overall Loss (${formattedOverallPips} pips)`, className: "text-[#C62828]" }
          : { label: "Break-even (0 pips)", className: "text-muted-fg" };
  const overallPipsDetailDisplay = overallPipsSummary ?? {
    label: "—",
    className: "text-muted-fg",
  };
  const isEditMode = false; // This page shows read-only data; editing happens on the new trade form.
  const targetDisplayConfigs = [
    {
      idPrefix: "take-profit",
      label: "Take Profit",
      values: normalizedTakeProfitTargets,
    },
    { idPrefix: "risk-reward", label: "R/R", values: normalizedRiskRewardTargets },
    { idPrefix: "nr-pips", label: "Nr. Pips", values: normalizedPipsTargets },
  ] satisfies TargetDisplayConfig[];
  const pnlDisplayConfig: TargetDisplayConfig = {
    idPrefix: "pnl",
    label: "P&L",
    values: normalizedPnlTargets,
  };
  const riskDetailDisplayConfigs: TargetDisplayConfig[] = [
    { idPrefix: "lot-size", label: "Lot Size", values: normalizedLotSizeTargets },
    { idPrefix: "risk", label: "Risk", values: normalizedRiskTargets },
    pnlDisplayConfig,
  ];
  const shouldShowRemovalBadge = isEditMode && targetColumnCount > 1;

  const renderTargetDisplay = ({ idPrefix, label, values }: TargetDisplayConfig) => (
    <div className="flex flex-col gap-2" key={idPrefix}>
      <div
        className={isEditMode ? "grid gap-3 pr-12" : "grid gap-3"}
        style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
      >
        {values.map((_, columnIndex) => {
          const outcomeValue = normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
          const outcomeStyle = getTakeProfitOutcomeStyle(outcomeValue);
          const outcomeLabel =
            idPrefix === "take-profit"
              ? normalizedTakeProfitOutcomeLabels[columnIndex]
              : "";
          return (
            <span
              key={`${idPrefix}-label-${columnIndex}`}
              className={`flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-200 ease-in-out ${outcomeStyle.label}`}
            >
              <span>
                {`${label} ${columnIndex + 1}`}
                {outcomeLabel ? ` • ${outcomeLabel}` : ""}
              </span>
            </span>
          );
        })}
      </div>
      <div className="relative">
        <div
          className={isEditMode ? "grid gap-3 pr-12" : "grid gap-3"}
          style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
        >
          {values.map((value, columnIndex) => {
            const formattedValue = formatOptionalText(value);
            const outcomeValue = normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
            const outcomeStyle = getTakeProfitOutcomeStyle(outcomeValue);
            const showRemovalBadge = shouldShowRemovalBadge && columnIndex === targetColumnCount - 1;

            return (
              <div className="group relative" key={`${idPrefix}-value-${columnIndex}`}>
                <div
                  className={`w-full rounded-2xl border px-4 py-3 transition-colors duration-200 ease-in-out ${outcomeStyle.border} ${outcomeStyle.background}`}
                >
                  <span
                    className={`text-sm font-medium transition-colors duration-200 ease-in-out ${outcomeStyle.text}`}
                  >
                    {formattedValue}
                  </span>
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
  const preTradeMentalStateValue = formatOptionalText(trade.preTradeMentalState);
  const emotionsDuringTradeValue = formatOptionalText(trade.emotionsDuringTrade);
  const emotionsAfterTradeValue = formatOptionalText(trade.emotionsAfterTrade);
  const confidenceLevelValue = formatOptionalText(trade.confidenceLevel);
  const emotionalTriggerValue = formatOptionalText(trade.emotionalTrigger);
  const followedPlanValue = formatOptionalText(trade.followedPlan);
  const respectedRiskValue = formatOptionalText(trade.respectedRisk);
  const wouldRepeatTradeValue = formatOptionalText(trade.wouldRepeatTrade);

  const tradeDetailsPanel = (
    <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-6">
        <div>
          <div className="mx-auto flex w-full max-w-xl items-center gap-3">
            <div className="relative flex min-w-0 flex-1 overflow-hidden rounded-full border border-border bg-surface px-1 py-1">
              <div className="flex w-full items-center justify-center gap-1 sm:gap-2">
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

        <div className="mt-10 flex w-full justify-center md:mt-12">
          <div className="flex flex-col items-center gap-3">
            <span className="block pb-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Trade Setup</span>
            <div className="flex w-full flex-col items-center justify-center gap-6 md:flex-row md:justify-center">
              <div className="flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[color:rgb(var(--surface)/0.9)] px-6 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] md:flex-1 md:max-w-sm lg:max-w-md xl:max-w-lg">
                <div className="flex w-full items-center justify-center gap-3 text-fg">
                  <span className="text-2xl" aria-hidden="true">
                    {activeSymbol.flag}
                  </span>
                  <span className="text-lg font-semibold tracking-[0.2em] md:text-xl">
                    {activeSymbol.code}
                  </span>
                </div>
              </div>

              <div
                className={`flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border px-4 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] md:flex-none md:w-[10.5rem] lg:w-[11.25rem] xl:w-[11.75rem] ${
                  trade.tradeOutcome === "profit"
                    ? "border-[#A6E8B0] bg-[#E6F9EC] text-[#2E7D32]"
                    : trade.tradeOutcome === "loss"
                      ? "border-[#F5B7B7] bg-[#FCE8E8] text-[#C62828]"
                      : "border-border bg-[color:rgb(var(--surface)/0.9)] text-[color:rgb(var(--muted-fg)/0.7)]"
                }`}
              >
                {tradeOutcomeLabel ? (
                  <span
                    className={`text-lg font-semibold tracking-[0.14em] capitalize md:text-xl ${
                      trade.tradeOutcome === "profit" ? "text-[#2E7D32]" : "text-[#C62828]"
                    }`}
                  >
                    {tradeOutcomeLabel}
                  </span>
                ) : (
                  <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-[color:rgb(var(--muted-fg)/0.7)] md:text-[0.72rem]">
                    Select outcome
                  </span>
                )}
              </div>

              <div
                className={`flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border px-4 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex-none md:w-[10.5rem] lg:w-[11.25rem] xl:w-[11.75rem] ${
                  trade.isPaperTrade
                    ? "border-[#D7DDE5] bg-[#F5F7FA] text-[#6B7280]"
                    : "border-[#A7C8FF] bg-[#E6EEFF] text-[#2F6FED]"
                }`}
              >
                {trade.isPaperTrade ? (
                  <Circle
                    className="h-5 w-5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle
                    className="h-5 w-5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    aria-hidden="true"
                  />
                )}
                <span className="text-sm font-medium tracking-[0.08em] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  {trade.isPaperTrade ? "Paper Trade" : "Real Trade"}
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:gap-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                  Stop Loss
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg md:justify-self-end md:text-right">
                  Nr. Pips (SL)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:gap-2 md:items-end">
                <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                  <span className="text-sm font-medium text-fg">{stopLossValue}</span>
                </div>
                <div className="rounded-2xl border border-border bg-surface px-4 py-3 md:justify-self-end">
                  <span className={`text-sm font-medium ${stopLossPipLabelClassName}`}>
                    {stopLossPipDisplayValue}
                  </span>
                </div>
              </div>
            </div>

            {targetDisplayConfigs.map(renderTargetDisplay)}

            <div className="flex w-full items-center justify-center rounded-2xl border border-border bg-surface px-6 py-4 text-center">
              <span className={`text-sm font-semibold ${overallPipsDetailDisplay.className}`}>
                {overallPipsDetailDisplay.label}
              </span>
            </div>
          </div>
        </div>

        <div className="my-6 border-t border-border" />

        <div className="flex flex-col gap-4">
          <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
            Risk Details
          </span>
          <div className="flex flex-col gap-4">
            {riskDetailDisplayConfigs.map(renderTargetDisplay)}
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
                Ho seguito il mio piano?
              </span>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <span className="text-sm font-medium text-fg">{followedPlanValue}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                Ho rispettato il rischio prefissato?
              </span>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <span className="text-sm font-medium text-fg">{respectedRiskValue}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
                Rifarei questo trade?
              </span>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <span className="text-sm font-medium text-fg">{wouldRepeatTradeValue}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleEditTrade = () => {
    router.push(`/new-trade?tradeId=${trade.id}`);
  };

  const handleDeleteTrade = async () => {
    const shouldDelete = window.confirm("Sei sicuro di voler eliminare questa operazione?");
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteTrade(trade.id);
      setState({ status: "missing", trade: null });
      router.push("/");
    } catch (error) {
      console.error("Failed to delete trade", error);
      window.alert("Impossibile eliminare il trade. Riprova.");
    }
  };

  return (
    <>
      <section
        className="page-shell page-shell--wide relative flex min-h-dvh flex-col gap-12 pb-20 pt-24 text-fg sm:pt-28"
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

            <div className={tabPanelClassName}>
              {displayedTab === "main" ? (
                <div className="relative mx-auto w-full max-w-3xl sm:max-w-4xl">
                  <div
                    className={`transform transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
                      isTradeContentVisible
                        ? "translate-y-0 opacity-100"
                        : "translate-y-4 opacity-0"
                    }`}
                  >
                    {tradeDetailsPanel}
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
        </div>
      </section>

      {isPreviewModalOpen && selectedImageData ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[color:rgba(15,23,42,0.85)] px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-label="Anteprima immagine a schermo intero"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[min(96vw,1280px)] max-h-[90vh] overflow-hidden bg-[color:rgba(15,23,42,0.35)]"
            style={{ aspectRatio: modalAspectRatio }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[color:rgba(15,23,42,0.65)] text-white transition-colors duration-200 hover:bg-[color:rgba(15,23,42,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-white/70"
              onClick={() => setIsPreviewModalOpen(false)}
              aria-label="Chiudi anteprima immagine"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <Image
              src={selectedImageData}
              alt="Anteprima ingrandita della library"
              fill
              className="h-full w-full object-contain"
              sizes="(max-width: 1280px) 100vw, 1280px"
              onLoadingComplete={({ naturalWidth, naturalHeight }) => {
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setPreviewAspectRatio(naturalWidth / naturalHeight);
                }
              }}
              unoptimized
              priority
            />
          </div>
        </div>
      ) : null}
    </>
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

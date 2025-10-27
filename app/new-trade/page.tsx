"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Circle, CheckCircle, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { LibrarySection } from "@/components/library/LibrarySection";
import { type LibraryCarouselItem } from "@/components/library/LibraryCarousel";
import { StyledSelect } from "@/components/StyledSelect";
import {
  loadTradeById,
  saveTrade,
  updateTrade,
  type StoredLibraryItem,
  type TradePayload,
  type RemovedLibraryItem,
  parseMultiValueField,
  serializeMultiValueField,
} from "@/lib/tradesStorage";
import { calculateDuration } from "@/lib/duration";

type SymbolOption = {
  code: string;
  flag: string;
};

const availableSymbols: SymbolOption[] = [
  { code: "EURUSD", flag: "🇪🇺 🇺🇸" },
  { code: "GBPUSD", flag: "🇬🇧 🇺🇸" },
  { code: "USDJPY", flag: "🇺🇸 🇯🇵" },
  { code: "AUDUSD", flag: "🇦🇺 🇺🇸" },
  { code: "USDCAD", flag: "🇺🇸 🇨🇦" },
  { code: "EURGBP", flag: "🇪🇺 🇬🇧" },
];

const preTradeMentalStateOptions = [
  "Calmo e concentrato",
  "Stanco o distratto",
  "Euforico dopo un gain",
  "Ansioso o insicuro",
  "Impulsivo",
  "Determinato e lucido",
] as const;

const emotionsDuringTradeOptions = [
  "Paura di perdere",
  "Euforia",
  "Impazienza",
  "Speranza",
  "Rabbia",
  "Fiducia calma",
] as const;

const emotionsAfterTradeOptions = [
  "Soddisfatto",
  "Frustrato",
  "Sollevato",
  "Arrabbiato",
  "Indifferente",
  "Pentito",
  "Orgoglioso",
] as const;

const emotionalTriggerOptions = [
  "FOMO",
  "Revenge trading",
  "Overconfidence",
  "Noia",
  "Disciplina",
  "Pressione esterna",
] as const;

const followedPlanOptions = ["Sì", "No", "Parziale"] as const;
const respectedRiskOptions = ["Sì", "No"] as const;
const repeatTradeOptions = ["Sì", "No", "Forse"] as const;

type LibraryItem = StoredLibraryItem;

function createLibraryItem(imageData: string | null = null): LibraryItem {
  return {
    id: `library-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    imageData,
    notes: "",
    createdAt: null,
    persisted: false,
  } satisfies LibraryItem;
}

function formatDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function alignTimeWithDate(time: Date | null, baseDate: Date, fallbackHour: number) {
  const aligned = new Date(baseDate);
  aligned.setHours(0, 0, 0, 0);

  if (time && !Number.isNaN(time.getTime())) {
    aligned.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return aligned;
  }

  aligned.setHours(fallbackHour, 0, 0, 0);
  return aligned;
}

function getDateTimeDisplayParts(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) {
    return { dateLabel: "-- --, ----", timeLabel: "--:--" };
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return { dateLabel, timeLabel };
}

function padMultiValue(values: string[], length: number) {
  const next = values.slice(0, length);

  while (next.length < length) {
    next.push("");
  }

  return next;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() + 1 - day);
  return start;
}

function getStartOfMonth(date: Date) {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

const LIBRARY_NAVIGATION_SWIPE_DISTANCE_PX = 40;
const LIBRARY_NAVIGATION_SWIPE_DURATION_MS = 600;
const LIBRARY_NAVIGATION_SCROLL_LOCK_DURATION_MS = 400;

function NewTradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingTradeId = searchParams.get("tradeId");
  const isEditing = Boolean(editingTradeId);
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const initialSelectedDate = useMemo(() => {
    const weekStart = getStartOfWeek(today);
    const dayIndex = (today.getDay() + 6) % 7;
    const initialDate = new Date(weekStart);
    initialDate.setDate(weekStart.getDate() + dayIndex);
    return initialDate;
  }, [today]);

  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() =>
    getStartOfWeek(initialSelectedDate),
  );
  const visibleWeekDays = useMemo(
    () => getWeekDays(visibleWeekStart),
    [visibleWeekStart],
  );

  const [openTime, setOpenTime] = useState<Date | null>(() => {
    const initial = new Date(selectedDate);
    initial.setHours(9, 0, 0, 0);
    return initial;
  });
  const [closeTime, setCloseTime] = useState<Date | null>(() => {
    const initial = new Date(selectedDate);
    initial.setHours(17, 0, 0, 0);
    return initial;
  });
  const durationLabel = useMemo(() => {
    if (!openTime || !closeTime) {
      return "0h 00min";
    }

    if (closeTime.getTime() <= openTime.getTime()) {
      return "0h 00min";
    }

    return calculateDuration(openTime, closeTime);
  }, [openTime, closeTime]);

  const openTimeInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimeInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewSwipeStateRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const previewSwipeHandledRef = useRef(false);
  const weekSwipeOriginRef = useRef<
    { x: number; time: number } | null
  >(null);
  const weekPointerTargetDateRef = useRef<string | null>(null);
  const weekWheelCooldownRef = useRef<number>(0);
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

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[2]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);
  const [isRealTrade, setIsRealTrade] = useState(false);
  const initialLibraryItems = useMemo(() => [createLibraryItem(null)], []);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>(initialLibraryItems);
  const [imageError, setImageError] = useState<string | null>(null);
  const [recentlyAddedLibraryItemId, setRecentlyAddedLibraryItemId] = useState<string | null>(null);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string>(
    initialLibraryItems[0]?.id ?? "",
  );
  const [removedLibraryItems, setRemovedLibraryItems] = useState<RemovedLibraryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTrade, setIsLoadingTrade] = useState(isEditing);
  const [position, setPosition] = useState<"LONG" | "SHORT">("LONG");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfitTargets, setTakeProfitTargets] = useState<string[]>([""]);
  const [pnlTargets, setPnlTargets] = useState<string[]>([""]);
  const [preTradeMentalState, setPreTradeMentalState] = useState("");
  const [emotionsDuringTrade, setEmotionsDuringTrade] = useState("");
  const [emotionsAfterTrade, setEmotionsAfterTrade] = useState("");
  const [confidenceLevel, setConfidenceLevel] = useState("");
  const [emotionalTrigger, setEmotionalTrigger] = useState("");
  const [followedPlan, setFollowedPlan] = useState("");
  const [respectedRiskChoice, setRespectedRiskChoice] = useState("");
  const [wouldRepeatTrade, setWouldRepeatTrade] = useState("");
  const [riskRewardTargets, setRiskRewardTargets] = useState<string[]>([""]);
  const [risk, setRisk] = useState("");
  const [pipsTargets, setPipsTargets] = useState<string[]>([""]);
  const [lotSize, setLotSize] = useState("");
  const [activeTab, setActiveTab] = useState<"main" | "library">("main");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getStartOfMonth(initialSelectedDate),
  );
  const [, startNavigation] = useTransition();

  const targetColumnCount = useMemo(
    () =>
      Math.max(
        1,
        takeProfitTargets.length,
        riskRewardTargets.length,
        pipsTargets.length,
        pnlTargets.length,
      ),
    [
      pnlTargets.length,
      pipsTargets.length,
      riskRewardTargets.length,
      takeProfitTargets.length,
    ],
  );

  const handleAddTargetColumn = useCallback(() => {
    const nextCount = targetColumnCount + 1;

    setTakeProfitTargets((prev) => padMultiValue(prev, nextCount));
    setRiskRewardTargets((prev) => padMultiValue(prev, nextCount));
    setPipsTargets((prev) => padMultiValue(prev, nextCount));
    setPnlTargets((prev) => padMultiValue(prev, nextCount));
  }, [targetColumnCount]);

  const handleRemoveTargetColumn = useCallback(() => {
    if (targetColumnCount <= 1) {
      return;
    }

    const nextCount = targetColumnCount - 1;

    setTakeProfitTargets((prev) => prev.slice(0, nextCount));
    setRiskRewardTargets((prev) => prev.slice(0, nextCount));
    setPipsTargets((prev) => prev.slice(0, nextCount));
    setPnlTargets((prev) => prev.slice(0, nextCount));
  }, [targetColumnCount]);

  const handleTakeProfitChange = useCallback(
    (index: number, value: string) => {
      setTakeProfitTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount);
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const handleRiskRewardChange = useCallback(
    (index: number, value: string) => {
      setRiskRewardTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount);
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const handlePipsChange = useCallback(
    (index: number, value: string) => {
      setPipsTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount);
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const handlePnlChange = useCallback(
    (index: number, value: string) => {
      setPnlTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount);
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const targetFieldConfigs = useMemo(
    () =>
      [
        {
          label: "Take Profit",
          idPrefix: "take-profit",
          placeholder: "Insert price",
          type: "number" as const,
          values: takeProfitTargets,
          onChange: handleTakeProfitChange,
        },
        {
          label: "R/R",
          idPrefix: "risk-reward",
          placeholder: "1:4",
          type: "text" as const,
          values: riskRewardTargets,
          onChange: handleRiskRewardChange,
        },
        {
          label: "Nr. Pips",
          idPrefix: "pips",
          placeholder: "55",
          type: "text" as const,
          values: pipsTargets,
          onChange: handlePipsChange,
        },
        {
          label: "P&L",
          idPrefix: "pnl",
          placeholder: "Insert",
          type: "number" as const,
          values: pnlTargets,
          onChange: handlePnlChange,
        },
      ],
    [
      handlePipsChange,
      handlePnlChange,
      handleRiskRewardChange,
      handleTakeProfitChange,
      pipsTargets,
      pnlTargets,
      riskRewardTargets,
      takeProfitTargets,
    ],
  );
  const pnlFieldConfig = targetFieldConfigs[targetFieldConfigs.length - 1];

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

  useEffect(() => {
    if (libraryItems.length === 0) {
      const fallback = createLibraryItem(null);
      setLibraryItems([fallback]);
      setSelectedLibraryItemId(fallback.id);
      return;
    }

    if (!libraryItems.some((item) => item.id === selectedLibraryItemId)) {
      setSelectedLibraryItemId(libraryItems[0].id);
    }
  }, [libraryItems, selectedLibraryItemId]);

  useEffect(() => {
    if (!recentlyAddedLibraryItemId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRecentlyAddedLibraryItemId(null);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [recentlyAddedLibraryItemId]);

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

  const calendarDays = useMemo(() => {
    const firstOfMonth = getStartOfMonth(calendarMonth);
    const gridStart = getStartOfWeek(firstOfMonth);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [calendarMonth]);

  const calendarMonthLabel = useMemo(
    () =>
      calendarMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [calendarMonth],
  );

  const weekdayHeadings = useMemo(() => {
    const reference = getStartOfWeek(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(reference);
      date.setDate(reference.getDate() + index);
      return date.toLocaleDateString(undefined, { weekday: "short" });
    });
  }, []);

  const triggerDateTimePicker = useCallback((input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Some browsers throw when invoking showPicker while the input is hidden.
      }
    }

    input.focus({ preventScroll: true });
    input.click();
  }, []);

  const toggleDateTimePicker = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) {
        return;
      }

      if (document.activeElement === input) {
        input.blur();
        return;
      }

      triggerDateTimePicker(input);
    },
    [triggerDateTimePicker],
  );

  const toggleOpenTimePicker = useCallback(() => {
    toggleDateTimePicker(openTimeInputRef.current);
  }, [toggleDateTimePicker]);

  const toggleCloseTimePicker = useCallback(() => {
    toggleDateTimePicker(closeTimeInputRef.current);
  }, [toggleDateTimePicker]);

  const handleSelectDate = useCallback(
    (targetDate: Date, options?: { skipWeekUpdate?: boolean }) => {
      const normalized = new Date(targetDate);
      normalized.setHours(0, 0, 0, 0);
      const normalizedWeekStart = getStartOfWeek(normalized);

      setSelectedDate((prev) => {
        if (isSameDay(prev, normalized)) {
          return prev;
        }
        return normalized;
      });

      if (!options?.skipWeekUpdate) {
        setVisibleWeekStart((prev) => {
          if (isSameDay(prev, normalizedWeekStart)) {
            return prev;
          }
          return normalizedWeekStart;
        });
      }

      setOpenTime((prev) => alignTimeWithDate(prev, normalized, 9));
      setCloseTime((prev) => alignTimeWithDate(prev, normalized, 17));
    },
    [],
  );

  const shiftWeek = useCallback(
    (delta: number) => {
      if (!delta) {
        return;
      }

      const nextDate = new Date(selectedDate);
      nextDate.setDate(selectedDate.getDate() + delta * 7);
      handleSelectDate(nextDate);
    },
    [handleSelectDate, selectedDate],
  );

  const handleWeekWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      const primaryDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.shiftKey
            ? event.deltaY
            : 0;

      if (Math.abs(primaryDelta) < 10) {
        return;
      }

      const timestamp =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      if (timestamp - weekWheelCooldownRef.current < 300) {
        return;
      }

      weekWheelCooldownRef.current = timestamp;

      shiftWeek(primaryDelta > 0 ? 1 : -1);
    },
    [shiftWeek],
  );

  const handleWeekPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const targetElement = event.target as HTMLElement | null;
      const buttonTarget = targetElement?.closest(
        "button[data-date]",
      ) as HTMLButtonElement | null;

      weekPointerTargetDateRef.current = buttonTarget?.dataset.date ?? null;

      if (event.pointerType !== "mouse") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // setPointerCapture may throw in unsupported environments; ignore.
        }
      }

      const timestamp =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      weekSwipeOriginRef.current = {
        x: event.clientX,
        time: timestamp,
      };
    },
    [],
  );

  const handleWeekPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const origin = weekSwipeOriginRef.current;

      if (!origin) {
        return;
      }

      const timestamp =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      const deltaX = event.clientX - origin.x;
      const duration = timestamp - origin.time;

      const deltaMagnitude = Math.abs(deltaX);
      const shouldAdvance = deltaMagnitude > 30 || (duration < 200 && deltaMagnitude > 5);

      if (shouldAdvance) {
        shiftWeek(deltaX < 0 ? 1 : -1);
      } else if (event.pointerType !== "mouse") {
        const targetDateIso = weekPointerTargetDateRef.current;

        if (targetDateIso) {
          const parsed = new Date(targetDateIso);

          if (!Number.isNaN(parsed.getTime())) {
            handleSelectDate(parsed);
          }
        }
      }

      weekPointerTargetDateRef.current = null;
      weekSwipeOriginRef.current = null;
    },
    [handleSelectDate, shiftWeek],
  );

  const handleWeekPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      weekPointerTargetDateRef.current = null;
      weekSwipeOriginRef.current = null;
    },
    [],
  );

  const renderWeekDayPill = (date: Date) => {
    const isSelected = isSameDay(date, selectedDate);
    const isToday = isSameDay(date, today);
    const dayNumber = date.getDate();
    const monthLabel = date
      .toLocaleDateString(undefined, {
        month: "short",
      })
      .toUpperCase();
    const accessibleLabel = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const buttonClasses = [
      "flex min-w-[62px] flex-col items-center gap-1 rounded-full border border-transparent px-2 py-2 text-xs font-medium transition md:min-w-[88px] md:text-sm",
    ];

    if (isSelected) {
      buttonClasses.push("text-fg");
    } else if (isToday) {
      buttonClasses.push("text-accent hover:text-accent");
    } else {
      buttonClasses.push("text-muted-fg hover:text-fg");
    }

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
    } else if (isToday) {
      dayNumberClasses.push("border border-accent/60 text-accent");
    } else {
      dayNumberClasses.push("border border-transparent text-fg");
    }

    return (
      <button
        key={date.toISOString()}
        type="button"
        onClick={() => handleSelectDate(new Date(date))}
        className={buttonClasses.join(" ")}
        aria-pressed={isSelected}
        aria-current={isSelected ? "date" : undefined}
        aria-label={`Select ${accessibleLabel}`}
        title={accessibleLabel}
        data-date={date.toISOString()}
      >
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
      </button>
    );
  };

  const openCalendar = useCallback(() => {
    setCalendarMonth(getStartOfMonth(selectedDate));
    setIsCalendarOpen(true);
  }, [selectedDate]);

  const closeCalendar = useCallback(() => {
    setIsCalendarOpen(false);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return getStartOfMonth(next);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return getStartOfMonth(next);
    });
  }, []);

  const handleCalendarDayClick = useCallback(
    (date: Date) => {
      handleSelectDate(date);
      setIsCalendarOpen(false);
    },
    [handleSelectDate],
  );

  const handleCalendarToday = useCallback(() => {
    handleSelectDate(today);
    setCalendarMonth(getStartOfMonth(today));
    setIsCalendarOpen(false);
  }, [handleSelectDate, today]);

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCalendarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCalendarOpen]);

  useEffect(() => {
    if (!isEditing || !editingTradeId) {
      setIsLoadingTrade(false);
      return;
    }

    let cancelled = false;
    setIsLoadingTrade(true);

    const hydrateTrade = async () => {
      try {
        const match = await loadTradeById(editingTradeId);

        if (cancelled) {
          return;
        }

        if (!match) {
          router.replace("/");
          return;
        }

        const matchedSymbol =
          availableSymbols.find((symbol) => symbol.code === match.symbolCode) ?? {
            code: match.symbolCode,
            flag: match.symbolFlag,
          };

        setSelectedSymbol(matchedSymbol);
        setIsRealTrade(!match.isPaperTrade);

        const parsedDate = new Date(match.date);
        const isDateValid = !Number.isNaN(parsedDate.getTime());
        const effectiveDate = isDateValid ? parsedDate : selectedDate;

        if (isDateValid) {
          handleSelectDate(parsedDate);
        }

        if (match.openTime) {
          const parsedOpen = new Date(match.openTime);
          setOpenTime(!Number.isNaN(parsedOpen.getTime()) ? parsedOpen : alignTimeWithDate(null, effectiveDate, 9));
        } else {
          setOpenTime((prev) => alignTimeWithDate(prev, effectiveDate, 9));
        }

        if (match.closeTime) {
          const parsedClose = new Date(match.closeTime);
          setCloseTime(!Number.isNaN(parsedClose.getTime()) ? parsedClose : alignTimeWithDate(null, effectiveDate, 17));
        } else {
          setCloseTime((prev) => alignTimeWithDate(prev, effectiveDate, 17));
        }

        const hydratedLibraryItems: LibraryItem[] =
          Array.isArray(match.libraryItems) && match.libraryItems.length > 0
            ? match.libraryItems.map((item) => ({
                ...item,
                imageData: item.imageData ?? null,
                notes: typeof item.notes === "string" ? item.notes : "",
                persisted: item.persisted ?? Boolean(item.recordId ?? item.id),
              }))
            : [createLibraryItem(null)];

        setLibraryItems(hydratedLibraryItems);
        setSelectedLibraryItemId(hydratedLibraryItems[0]?.id ?? initialLibraryItems[0].id);
        setRecentlyAddedLibraryItemId(null);
        setRemovedLibraryItems([]);
        setImageError(null);

        setPosition(match.position === "SHORT" ? "SHORT" : "LONG");
        setEntryPrice(match.entryPrice ?? "");
        setExitPrice(match.exitPrice ?? "");
        setStopLoss(match.stopLoss ?? "");
        const parsedTakeProfit = parseMultiValueField(match.takeProfit);
        const parsedRiskReward = parseMultiValueField(match.riskReward);
        const parsedPips = parseMultiValueField(match.pips);
        const parsedPnl = parseMultiValueField(match.pnl);
        const columnCount = Math.max(
          1,
          parsedTakeProfit.length,
          parsedRiskReward.length,
          parsedPips.length,
          parsedPnl.length,
        );
        setTakeProfitTargets(padMultiValue(parsedTakeProfit, columnCount));
        setRiskRewardTargets(padMultiValue(parsedRiskReward, columnCount));
        setPipsTargets(padMultiValue(parsedPips, columnCount));
        setPnlTargets(padMultiValue(parsedPnl, columnCount));
        setPreTradeMentalState(match.preTradeMentalState ?? "");
        setEmotionsDuringTrade(match.emotionsDuringTrade ?? "");
        setEmotionsAfterTrade(match.emotionsAfterTrade ?? "");
        setConfidenceLevel(match.confidenceLevel ?? "");
        setEmotionalTrigger(match.emotionalTrigger ?? "");
        setFollowedPlan(match.followedPlan ?? "");
        setRespectedRiskChoice(match.respectedRisk ?? "");
        setWouldRepeatTrade(match.wouldRepeatTrade ?? "");
        setRisk(match.risk ?? "");
        setLotSize(match.lotSize ?? "");

        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Failed to load trade", error);
        if (!cancelled) {
          router.replace("/");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrade(false);
        }
      }
    };

    hydrateTrade();

    return () => {
      cancelled = true;
    };
  }, [
    editingTradeId,
    handleSelectDate,
    imageInputRef,
    initialLibraryItems,
    isEditing,
    router,
    selectedDate,
  ]);

  const dayOfWeekLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
      }),
    [selectedDate]
  );

  const handleSelectSymbol = (symbol: SymbolOption) => {
    setSelectedSymbol(symbol);
  };

  const openTimeDisplay = getDateTimeDisplayParts(openTime);
  const closeTimeDisplay = getDateTimeDisplayParts(closeTime);

  const handleImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    const targetItemId = selectedLibraryItemId;
    if (!targetItemId) {
      setImageError("Nessuna card selezionata. Aggiungi o scegli una card prima di caricare.");
      return;
    }

    if (!file) {
      setImageError(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("The selected file is too large. Choose an image under 5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    const inputElement = event.target;

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        setImageError("Impossibile leggere l'immagine selezionata. Riprova con un altro file.");
        if (inputElement) {
          inputElement.value = "";
        }
        return;
      }

      setLibraryItems((prev) =>
        prev.map((item) =>
          item.id === targetItemId
            ? {
                ...item,
                imageData: result,
              }
            : item,
        ),
      );
      setImageError(null);

      if (inputElement) {
        inputElement.value = "";
      }
    };

    reader.onerror = () => {
      setImageError("Failed to load the selected image. Please try another file.");
      setLibraryItems((prev) =>
        prev.map((item) =>
          item.id === targetItemId
            ? {
                ...item,
                imageData: null,
              }
            : item,
        ),
      );

      if (inputElement) {
        inputElement.value = "";
      }
    };

    reader.readAsDataURL(file);
  }, [selectedLibraryItemId]);

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

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
        previewSwipeHandledRef.current = false;
        return;
      }

      previewSwipeStateRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      previewSwipeHandledRef.current = false;
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
      previewSwipeHandledRef.current = true;
    },
    [canNavigateLibrary],
  );

  const handlePreviewTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      const swipeStart = previewSwipeStateRef.current;
      previewSwipeStateRef.current = null;

      if (!swipeStart) {
        previewSwipeHandledRef.current = false;
        return;
      }

      if (!canNavigateLibrary) {
        previewSwipeHandledRef.current = false;
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        previewSwipeHandledRef.current = false;
        return;
      }

      const deltaX = touch.clientX - swipeStart.x;
      const deltaY = touch.clientY - swipeStart.y;
      const elapsed = Date.now() - swipeStart.time;

      if (elapsed > LIBRARY_NAVIGATION_SWIPE_DURATION_MS) {
        previewSwipeHandledRef.current = false;
        return;
      }

      if (Math.abs(deltaX) < LIBRARY_NAVIGATION_SWIPE_DISTANCE_PX) {
        previewSwipeHandledRef.current = false;
        return;
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        previewSwipeHandledRef.current = false;
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const direction: 1 | -1 = deltaX > 0 ? -1 : 1;

      temporarilyLockScrollForNavigation(() => {
        goToAdjacentLibraryItem(direction);
      });

      previewSwipeHandledRef.current = true;

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          previewSwipeHandledRef.current = false;
        }, 0);
      } else {
        previewSwipeHandledRef.current = false;
      }
    },
    [canNavigateLibrary, goToAdjacentLibraryItem, temporarilyLockScrollForNavigation],
  );

  const handlePreviewTouchCancel = useCallback(() => {
    previewSwipeStateRef.current = null;
    previewSwipeHandledRef.current = false;
  }, []);

  const handlePreviewWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
    },
    [],
  );

  const handleAddLibraryItem = useCallback(() => {
    const newItem = createLibraryItem(null);

    setLibraryItems((prev) => {
      if (prev.length === 0) {
        return [newItem];
      }

      if (!selectedLibraryItemId) {
        return [...prev, newItem];
      }

      const targetIndex = prev.findIndex((item) => item.id === selectedLibraryItemId);

      if (targetIndex === -1) {
        return [...prev, newItem];
      }

      const nextItems = [...prev];
      nextItems.splice(targetIndex + 1, 0, newItem);
      return nextItems;
    });

    setSelectedLibraryItemId(newItem.id);
    setRecentlyAddedLibraryItemId(newItem.id);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [selectedLibraryItemId]);

  const handleRemoveLibraryItem = useCallback((itemId: string) => {
    setLibraryItems((prev) => {
      const targetIndex = prev.findIndex((item) => item.id === itemId);

      if (targetIndex === -1) {
        return prev;
      }

      const targetItem = prev[targetIndex];
      if (targetItem.persisted && targetItem.recordId) {
        setRemovedLibraryItems((current) => [
          ...current,
          {
            recordId: targetItem.recordId!,
            storagePath: targetItem.storagePath ?? null,
          },
        ]);
      }

      const nextItems = [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
      const fallbackId =
        nextItems.length > 0
          ? nextItems[Math.min(targetIndex, nextItems.length - 1)]?.id ?? ""
          : "";

      setSelectedLibraryItemId((current) => {
        if (!current) {
          return fallbackId;
        }

        if (current !== itemId) {
          return current;
        }

        return fallbackId;
      });

      return nextItems;
    });

    setRecentlyAddedLibraryItemId((prev) => (prev === itemId ? null : prev));
  }, []);

  const handleUpdateLibraryNote = useCallback((itemId: string, nextNote: string) => {
    setLibraryItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes: nextNote } : item)),
    );
  }, []);

  const handleSelectedLibraryNoteChange = useCallback(
    (nextNote: string) => {
      const targetId = selectedLibraryItemId ?? libraryItems[0]?.id;

      if (!targetId) {
        return;
      }

      handleUpdateLibraryNote(targetId, nextNote);
    },
    [handleUpdateLibraryNote, libraryItems, selectedLibraryItemId],
  );

  const libraryCards = useMemo(
    () =>
      libraryItems.map((item, index) => {
        const hasImage = Boolean(item.imageData);
        const isRecentlyAdded = item.id === recentlyAddedLibraryItemId;

        return {
          id: item.id,
          label: hasImage ? `Anteprima ${index + 1}` : "Carica",
          onClick: () => {
            if (!hasImage) {
              openImagePicker();
            }
          },
          className: isRecentlyAdded ? "animate-fade-slide-in" : undefined,
          visual: hasImage ? (
            <div className="relative h-full w-full">
              <Image
                src={item.imageData!}
                alt={`Anteprima libreria ${index + 1}`}
                fill
                sizes="(min-width: 768px) 160px, 200px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-[#F4F4F4] text-muted-fg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-accent"
                aria-hidden="true"
              >
                <path d="M24 6v24" />
                <path d="m14 16 10-10 10 10" />
                <path d="M10 30v6a6 6 0 0 0 6 6h16a6 6 0 0 0 6-6v-6" />
              </svg>
            </div>
          ),
        } satisfies LibraryCarouselItem;
      }),
    [libraryItems, openImagePicker, recentlyAddedLibraryItemId]
  );

  const primaryPreviewContent = (
    <>
      <div
        data-library-preview-stack
        className="flex w-full flex-col"
        style={{ gap: "0.5cm" }}
      >
        <div
          ref={previewContainerRef}
          className="w-full lg:max-w-[960px]"
          onWheel={handlePreviewWheel}
          onTouchStart={handlePreviewTouchStart}
          onTouchMove={handlePreviewTouchMove}
          onTouchEnd={handlePreviewTouchEnd}
          onTouchCancel={handlePreviewTouchCancel}
        >
          <button
            type="button"
            onClick={(event) => {
              if (previewSwipeHandledRef.current) {
                previewSwipeHandledRef.current = false;
                event.preventDefault();
                return;
              }

              openImagePicker();
            }}
            className="block w-full cursor-pointer border-0 bg-transparent p-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            aria-label="Aggiorna immagine della libreria"
          >
            <span
              data-library-preview-image
              className="relative block aspect-[3/2] w-full overflow-hidden rounded-[4px] border-2 border-[#B7B7B7]"
            >
              {selectedImageData ? (
                <Image
                  src={selectedImageData}
                  alt="Selected trade context"
                  fill
                  className="h-full w-full object-contain"
                  sizes="100vw"
                  unoptimized
                />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-neutral-100 text-muted-fg">
                  <UploadIcon />
                  <span className="text-xs text-muted-fg/80">
                    Aggiungi uno screenshot o un chart di contesto.
                  </span>
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
        aria-label="Upload trade image"
      />
    </>
  );
  const libraryPreview = primaryPreviewContent;

  const libraryNotesField = (
    <textarea
      id="library-note-editor"
      value={selectedLibraryNote}
      onChange={(event) => {
        handleSelectedLibraryNoteChange(event.target.value);
      }}
      placeholder="Scrivi le tue note"
      aria-label="Note"
      className="min-h-[120px] w-full resize-none rounded-none border border-[#D9D9D9] bg-[#fffde6] px-5 py-4 text-sm font-medium text-fg transition focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
    />
  );

  const tabContent =
    activeTab === "main"
      ? (
          <div className="mx-auto w-full max-w-3xl sm:max-w-4xl">
            <div className="flex w-full flex-col gap-8">
              <div className="w-full surface-panel px-4 py-4 md:px-6 md:py-6">
                <div className="mx-auto flex w-full max-w-xl items-center gap-3">
                  <div
                    className="relative flex min-w-0 flex-1 overflow-hidden rounded-full border border-border bg-surface px-1 py-1"
                    onWheel={handleWeekWheel}
                    onPointerDown={handleWeekPointerDown}
                    onPointerUp={handleWeekPointerUp}
                    onPointerCancel={handleWeekPointerCancel}
                    onPointerLeave={handleWeekPointerCancel}
                  >
                    <div className="flex w-full items-center justify-center gap-2">
                      {visibleWeekDays.map((date) => renderWeekDayPill(date))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg ${
                      isCalendarOpen ? "bg-subtle text-fg" : ""
                    }`}
                    onClick={openCalendar}
                    aria-haspopup="dialog"
                    aria-expanded={isCalendarOpen}
                    aria-label="Open calendar"
                    title="Open calendar"
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
                  </button>
                </div>

                <p className="mt-4 text-center text-sm text-muted-fg md:mt-5 md:text-base">
                  Day of the week: <span className="font-semibold text-fg">{dayOfWeekLabel}</span>
                </p>
              </div>

              <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Symbol</span>
                      <div className="flex flex-wrap justify-center gap-6">
                        <button
                          type="button"
                          onClick={() => setIsSymbolListOpen((prev) => !prev)}
                          className="group flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-center shadow-sm transition-all focus:outline-none focus:ring-0 hover:shadow-md"
                          aria-haspopup="listbox"
                          aria-expanded={isSymbolListOpen}
                        >
                          <span className="text-2xl" aria-hidden="true">
                            {selectedSymbol.flag}
                          </span>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
                              {selectedSymbol.code}
                            </span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`h-4 w-4 text-gray-500 opacity-100 transition-transform transition-opacity group-hover:opacity-80 ${
                                isSymbolListOpen ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRealTrade((prev) => !prev)}
                          className={`group flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-2xl border text-center shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-0 hover:shadow-md ${
                            isRealTrade
                              ? "border-green-200 bg-green-100 text-green-700"
                              : "border-gray-200 bg-gray-50 text-gray-600"
                          }`}
                          aria-pressed={isRealTrade}
                        >
                          {isRealTrade ? (
                            <CheckCircle
                              className="h-5 w-5 text-green-500 transition-colors duration-200 ease-in-out"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="h-5 w-5 text-gray-400 transition-colors duration-200 ease-in-out"
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-sm font-medium tracking-[0.08em]">
                            {isRealTrade ? "Real Trade" : "Paper Trade"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isSymbolListOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2"
                        role="listbox"
                        aria-activedescendant={`symbol-${selectedSymbol.code}`}
                      >
                        {availableSymbols.map((symbol) => {
                          const isActive = symbol.code === selectedSymbol.code;

                          return (
                            <button
                              key={symbol.code}
                              id={`symbol-${symbol.code}`}
                              type="button"
                              className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-sm font-medium transition md:text-base ${
                                isActive
                                  ? "text-accent"
                                  : "text-muted-fg hover:bg-subtle hover:text-fg"
                              }`}
                              style={
                                isActive
                                  ? {
                                      backgroundColor: "rgb(var(--accent) / 0.1)",
                                    }
                                  : undefined
                              }
                              onClick={() => handleSelectSymbol(symbol)}
                              aria-selected={isActive}
                              role="option"
                            >
                              <span className="text-2xl" aria-hidden="true">
                                {symbol.flag}
                              </span>
                              <span className="tracking-[0.18em]">{symbol.code}</span>
                              {isActive ? (
                                <span
                                  className="ml-auto text-xs font-medium uppercase tracking-[0.24em]"
                                  style={{ color: "rgb(var(--accent) / 0.8)" }}
                                >
                                  Selected
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-3">
                        <label
                          htmlFor="open-time-input"
                          className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg"
                          onClick={(event) => {
                            event.preventDefault();
                            toggleOpenTimePicker();
                          }}
                        >
                          Open Time
                        </label>
                        <div
                          className="relative"
                          onPointerDown={(event) => {
                            const input = openTimeInputRef.current;
                            if (!input) {
                              return;
                            }

                            const clickedInsideInput =
                              event.target instanceof Node && input.contains(event.target);

                            const wasActive = document.activeElement === input;

                            if (wasActive || !clickedInsideInput) {
                              event.preventDefault();
                            }

                            toggleOpenTimePicker();
                          }}
                        >
                          <input
                            id="open-time-input"
                            ref={openTimeInputRef}
                            type="datetime-local"
                            className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl border-0 bg-transparent opacity-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                            value={openTime ? formatDateTimeLocal(openTime) : ""}
                            onChange={(event) => {
                              const { value } = event.target;
                              if (!value) {
                                setOpenTime(null);
                                return;
                              }

                              const parsed = new Date(value);
                              if (Number.isNaN(parsed.getTime())) {
                                return;
                              }

                              setOpenTime(parsed);
                            }}
                            aria-label="Select open date and time"
                          />
                          <div className="pointer-events-none relative flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left">
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
                      </div>

                      <div className="flex flex-col gap-3">
                        <label
                          htmlFor="close-time-input"
                          className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg"
                          onClick={(event) => {
                            event.preventDefault();
                            toggleCloseTimePicker();
                          }}
                        >
                          Close Time
                        </label>
                        <div
                          className="relative"
                          onPointerDown={(event) => {
                            const input = closeTimeInputRef.current;
                            if (!input) {
                              return;
                            }

                            const clickedInsideInput =
                              event.target instanceof Node && input.contains(event.target);

                            const wasActive = document.activeElement === input;

                            if (wasActive || !clickedInsideInput) {
                              event.preventDefault();
                            }

                            toggleCloseTimePicker();
                          }}
                        >
                          <input
                            id="close-time-input"
                            ref={closeTimeInputRef}
                            type="datetime-local"
                            className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl border-0 bg-transparent opacity-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                            value={closeTime ? formatDateTimeLocal(closeTime) : ""}
                            onChange={(event) => {
                              const { value } = event.target;
                              if (!value) {
                                setCloseTime(null);
                                return;
                              }

                              const parsed = new Date(value);
                              if (Number.isNaN(parsed.getTime())) {
                                return;
                              }

                              setCloseTime(parsed);
                            }}
                            aria-label="Select close date and time"
                          />
                          <div className="pointer-events-none relative flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left">
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
                    </div>

                    <p className="mt-2 text-center text-sm text-gray-500">
                      Duration: {durationLabel}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <span className="text-gray-700 text-sm font-semibold mb-2 mt-6 block">
                      General Details
                    </span>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="position-select"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Position
                        </label>
                        <select
                          id="position-select"
                          value={position}
                          onChange={(event) =>
                            setPosition(event.target.value === "SHORT" ? "SHORT" : "LONG")
                          }
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg focus:outline-none focus:ring-0"
                        >
                          <option value="LONG">Long</option>
                          <option value="SHORT">Short</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="entry-price-input"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Entry Price
                        </label>
                        <input
                          id="entry-price-input"
                          type="number"
                          value={entryPrice}
                          onChange={(event) => setEntryPrice(event.target.value)}
                          placeholder="Insert price"
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="stop-loss-input"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Stop Loss
                        </label>
                        <input
                          id="stop-loss-input"
                          type="number"
                          value={stopLoss}
                          onChange={(event) => setStopLoss(event.target.value)}
                          placeholder="Insert price"
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      {targetFieldConfigs.slice(0, 3).map((fieldConfig) => {
                        const normalizedValues = padMultiValue(fieldConfig.values, targetColumnCount);

                        return (
                          <div className="flex flex-col gap-2" key={fieldConfig.idPrefix}>
                            <div
                              className="grid gap-3"
                              style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                            >
                              {normalizedValues.map((value, columnIndex) => {
                                const isFirstColumn = columnIndex === 0;
                                const isRemovableColumn =
                                  targetColumnCount > 1 && columnIndex === targetColumnCount - 1;

                                return (
                                  <div className="flex flex-col gap-2" key={`${fieldConfig.idPrefix}-${columnIndex}`}>
                                    <label
                                      htmlFor={`${fieldConfig.idPrefix}-input-${columnIndex}`}
                                      className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                                    >
                                      {`${fieldConfig.label} ${columnIndex + 1}`}
                                    </label>
                                    <div className="relative">
                                      <input
                                        id={`${fieldConfig.idPrefix}-input-${columnIndex}`}
                                        type={fieldConfig.type}
                                        value={value}
                                        onChange={(event) => fieldConfig.onChange(columnIndex, event.target.value)}
                                        placeholder={fieldConfig.placeholder}
                                        className={`rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0${
                                          isFirstColumn ? " pr-12" : ""
                                        }${isRemovableColumn ? " pr-12" : ""}`}
                                      />
                                      {isFirstColumn && (
                                        <button
                                          type="button"
                                          onClick={handleAddTargetColumn}
                                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-sm transition hover:bg-[#1d4ed8] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#93c5fd]"
                                          aria-label={`Aggiungi colonna per ${fieldConfig.label}`}
                                        >
                                          <Plus aria-hidden="true" className="h-4 w-4" />
                                        </button>
                                      )}
                                      {isRemovableColumn && (
                                        <button
                                          type="button"
                                          onClick={handleRemoveTargetColumn}
                                          className="absolute right-3 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-muted-fg shadow-sm ring-1 ring-border transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#93c5fd]"
                                          aria-label={`Rimuovi ultima colonna per ${fieldConfig.label}`}
                                        >
                                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="lot-size-input"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Lot Size
                        </label>
                        <input
                          id="lot-size-input"
                          type="text"
                          value={lotSize}
                          onChange={(event) => setLotSize(event.target.value)}
                          placeholder="0.10"
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="risk-input"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Risk
                        </label>
                        <input
                          id="risk-input"
                          type="text"
                          value={risk}
                          onChange={(event) => setRisk(event.target.value)}
                          placeholder="2%"
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      {pnlFieldConfig && (
                        <div className="flex flex-col gap-2" key={pnlFieldConfig.idPrefix}>
                          <div
                            className="grid gap-3"
                            style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                          >
                            {padMultiValue(pnlFieldConfig.values, targetColumnCount).map((value, columnIndex) => {
                              const isFirstColumn = columnIndex === 0;
                              const isRemovableColumn =
                                targetColumnCount > 1 && columnIndex === targetColumnCount - 1;

                              return (
                                <div className="flex flex-col gap-2" key={`${pnlFieldConfig.idPrefix}-${columnIndex}`}>
                                  <label
                                    htmlFor={`${pnlFieldConfig.idPrefix}-input-${columnIndex}`}
                                    className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                                  >
                                    {`${pnlFieldConfig.label} ${columnIndex + 1}`}
                                  </label>
                                  <div className="relative">
                                    <input
                                      id={`${pnlFieldConfig.idPrefix}-input-${columnIndex}`}
                                      type={pnlFieldConfig.type}
                                      value={value}
                                      onChange={(event) => pnlFieldConfig.onChange(columnIndex, event.target.value)}
                                      placeholder={pnlFieldConfig.placeholder}
                                      className={`rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0${
                                        isFirstColumn ? " pr-12" : ""
                                      }${isRemovableColumn ? " pr-12" : ""}`}
                                    />
                                    {isFirstColumn && (
                                      <button
                                        type="button"
                                        onClick={handleAddTargetColumn}
                                        className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-sm transition hover:bg-[#1d4ed8] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#93c5fd]"
                                        aria-label={`Aggiungi colonna per ${pnlFieldConfig.label}`}
                                      >
                                        <Plus aria-hidden="true" className="h-4 w-4" />
                                      </button>
                                    )}
                                    {isRemovableColumn && (
                                      <button
                                        type="button"
                                        onClick={handleRemoveTargetColumn}
                                        className="absolute right-3 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-muted-fg shadow-sm ring-1 ring-border transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#93c5fd]"
                                        aria-label={`Rimuovi ultima colonna per ${pnlFieldConfig.label}`}
                                      >
                                        <X aria-hidden="true" className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 mt-6" />
                    <span className="text-gray-700 text-sm font-semibold mb-2 mt-6 block">
                      Psychology & Mindset
                    </span>
                    <div className="flex flex-col">
                      <StyledSelect
                        label="Stato mentale prima del trade"
                        value={preTradeMentalState}
                        onChange={(nextValue) => setPreTradeMentalState(nextValue)}
                        placeholder="Seleziona opzione"
                      >
                        {preTradeMentalStateOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Emozioni durante il trade"
                        value={emotionsDuringTrade}
                        onChange={(nextValue) => setEmotionsDuringTrade(nextValue)}
                        placeholder="Seleziona opzione"
                      >
                        {emotionsDuringTradeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Emozioni dopo il trade"
                        value={emotionsAfterTrade}
                        onChange={(nextValue) => setEmotionsAfterTrade(nextValue)}
                        placeholder="Seleziona opzione"
                      >
                        {emotionsAfterTradeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <div className="mb-4">
                        <label
                          htmlFor="confidence-level-input"
                          className="text-gray-600 text-xs font-medium mb-1 block"
                        >
                          Livello di fiducia (1–10)
                        </label>
                        <input
                          id="confidence-level-input"
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          value={confidenceLevel}
                          onChange={(event) => {
                            const rawValue = event.target.value;

                            if (rawValue === "") {
                              setConfidenceLevel("");
                              return;
                            }

                            const numericValue = Number(rawValue);

                            if (Number.isNaN(numericValue)) {
                              return;
                            }

                            const clampedValue = Math.min(10, Math.max(1, numericValue));
                            setConfidenceLevel(String(clampedValue));
                          }}
                          placeholder="Seleziona livello"
                          className="w-full rounded-lg border border-gray-200 bg-white text-gray-800 text-sm placeholder-gray-400 p-2 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <StyledSelect
                        label="Trigger emotivi"
                        value={emotionalTrigger}
                        onChange={(nextValue) => setEmotionalTrigger(nextValue)}
                        placeholder="Seleziona opzione"
                      >
                        {emotionalTriggerOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Ho seguito il mio piano?"
                        value={followedPlan}
                        onChange={(nextValue) => setFollowedPlan(nextValue)}
                        placeholder="Seleziona risposta"
                      >
                        {followedPlanOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Ho rispettato il rischio prefissato?"
                        value={respectedRiskChoice}
                        onChange={(nextValue) => setRespectedRiskChoice(nextValue)}
                        placeholder="Seleziona risposta"
                      >
                        {respectedRiskOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Rifarei questo trade?"
                        value={wouldRepeatTrade}
                        onChange={(nextValue) => setWouldRepeatTrade(nextValue)}
                        placeholder="Seleziona risposta"
                      >
                        {repeatTradeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>
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
            onAddAction={handleAddLibraryItem}
            onRemoveAction={handleRemoveLibraryItem}
            errorMessage={imageError}
          />
        );

  const handleSaveTrade = useCallback(async () => {
    if (isSaving || isLoadingTrade) {
      return;
    }

    const normalizedLibraryItems = libraryItems
      .map((item) => ({
        ...item,
        imageData: item.imageData ?? null,
        notes: typeof item.notes === "string" ? item.notes : "",
      }))
      .filter((item) => {
        if (item.persisted && item.recordId) {
          return true;
        }

        const hasImage = typeof item.imageData === "string" && item.imageData.length > 0;
        const hasNotes = item.notes.trim().length > 0;
        return hasImage || hasNotes;
      });

    const serializedTakeProfit = serializeMultiValueField(takeProfitTargets);
    const serializedRiskReward = serializeMultiValueField(riskRewardTargets);
    const serializedPips = serializeMultiValueField(pipsTargets);
    const serializedPnl = serializeMultiValueField(pnlTargets);

    const payload: TradePayload = {
      id: editingTradeId ?? undefined,
      symbolCode: selectedSymbol.code,
      isPaperTrade: !isRealTrade,
      date: selectedDate.toISOString(),
      openTime: openTime ? openTime.toISOString() : null,
      closeTime: closeTime ? closeTime.toISOString() : null,
      position,
      riskReward: serializedRiskReward,
      risk: risk.trim() || null,
      pips: serializedPips,
      lotSize: lotSize.trim() || null,
      entryPrice: entryPrice.trim() || null,
      exitPrice: exitPrice.trim() || null,
      stopLoss: stopLoss.trim() || null,
      takeProfit: serializedTakeProfit,
      pnl: serializedPnl,
      preTradeMentalState: preTradeMentalState.trim() || null,
      emotionsDuringTrade: emotionsDuringTrade.trim() || null,
      emotionsAfterTrade: emotionsAfterTrade.trim() || null,
      confidenceLevel: confidenceLevel.trim() || null,
      emotionalTrigger: emotionalTrigger.trim() || null,
      followedPlan: followedPlan.trim() || null,
      respectedRisk: respectedRiskChoice.trim() || null,
      wouldRepeatTrade: wouldRepeatTrade.trim() || null,
      notes: null,
      libraryItems: normalizedLibraryItems,
    };

    setIsSaving(true);

    try {
      let destination: string;

      if (isEditing && editingTradeId) {
        await updateTrade(payload, { removedLibraryItems });
        destination = `/registered-trades/${editingTradeId}`;
      } else {
        const { libraryFailures } = await saveTrade(payload);
        destination = "/";

        if (libraryFailures.length > 0) {
          console.error("Alcune immagini non sono state salvate", libraryFailures);
          window.alert(
            "Trade salvato, ma alcune immagini non sono state caricate correttamente. Riprova a caricarle.",
          );
        }
      }

      setRemovedLibraryItems([]);

      startNavigation(() => {
        router.push(destination);
      });

      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/new-trade")) {
          window.location.href = destination;
        }
      }, 150);
    } catch (error) {
      console.error("Failed to save trade", error);
      window.alert("Impossibile salvare il trade. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }, [
    closeTime,
    editingTradeId,
    emotionsAfterTrade,
    emotionsDuringTrade,
    entryPrice,
    exitPrice,
    followedPlan,
    isEditing,
    isLoadingTrade,
    isRealTrade,
    isSaving,
    libraryItems,
    openTime,
    pipsTargets,
    lotSize,
    position,
    preTradeMentalState,
    removedLibraryItems,
    respectedRiskChoice,
    risk,
    riskRewardTargets,
    router,
    selectedDate,
    selectedSymbol.code,
    startNavigation,
    stopLoss,
    takeProfitTargets,
    pnlTargets,
    confidenceLevel,
    emotionalTrigger,
    wouldRepeatTrade,
  ]);

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

        <Button
          type="button"
          variant="primary"
          size="md"
          className="ml-auto min-w-[140px]"
          onClick={handleSaveTrade}
          disabled={isSaving || isLoadingTrade}
        >
          {isSaving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
      </div>

      <div className="flex w-full flex-1 flex-col gap-12">
        <div className="mx-auto w-full max-w-3xl sm:max-w-4xl">
          <div className="flex w-full flex-col gap-8">
            <header className="space-y-2">
              <p className="text-sm text-muted-fg">Trading Journal</p>
              <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
                Register a trade
              </h1>
            </header>

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
          </div>
        </div>

        {tabContent}
      </div>
      {isCalendarOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onClick={closeCalendar}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-bg p-4 shadow-xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Select a date"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg"
                  onClick={goToPreviousMonth}
                  aria-label="Previous month"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-lg font-semibold capitalize text-fg sm:text-xl">
                  {calendarMonthLabel}
                </span>
                <button
                  type="button"
                  className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-fg transition hover:text-fg"
                  onClick={handleCalendarToday}
                >
                  Today
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg"
                  onClick={closeCalendar}
                  aria-label="Close calendar"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
              {weekdayHeadings.map((heading, index) => (
                <span key={`${heading}-${index}`}>{heading}</span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarDays.map((date) => {
                const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const dayNumber = date.getDate();
                const accessibleLabel = date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <button
                    key={`${date.toISOString()}-calendar`}
                    type="button"
                    onClick={() => handleCalendarDayClick(new Date(date))}
                    className={`flex h-10 items-center justify-center rounded-full border text-sm font-medium transition sm:h-11 ${
                      isSelected
                        ? "border-transparent bg-accent text-white"
                        : isToday
                          ? "border-accent/60 text-accent"
                          : isCurrentMonth
                            ? "border-transparent text-fg hover:bg-subtle"
                            : "border-transparent text-muted-fg/50 hover:text-muted-fg"
                    }`}
                    aria-pressed={isSelected}
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={`Select ${accessibleLabel}`}
                    title={accessibleLabel}
                  >
                    <span className="text-sm font-medium">{dayNumber}</span>
                    {isToday ? <span className="sr-only">Today</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-14 w-14 text-accent"
      aria-hidden="true"
    >
      <path d="M24 6v24" />
      <path d="m14 16 10-10 10 10" />
      <path d="M10 30v6a6 6 0 0 0 6 6h16a6 6 0 0 0 6-6v-6" />
    </svg>
  );
}

export default function NewTradePage() {
  return (
    <Suspense fallback={null}>
      <NewTradePageContent />
    </Suspense>
  );
}
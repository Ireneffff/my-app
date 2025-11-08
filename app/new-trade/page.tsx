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
import { TakeProfitOutcomeSelect } from "@/components/TakeProfitOutcomeSelect";
import {
  loadTradeById,
  saveTrade,
  updateTrade,
  type StoredLibraryItem,
  type TradePayload,
  type RemovedLibraryItem,
} from "@/lib/tradesStorage";
import { calculateDuration } from "@/lib/duration";
import {
  getTakeProfitOutcomeStyle as getOutcomeStyle,
  type TakeProfitOutcome,
} from "@/lib/takeProfitOutcomeStyles";
import {
  calculateOverallPips,
  calculatePips,
  calculateStopLossDistance,
  calculateTakeProfitDistance,
  formatPips,
} from "@/lib/pips";

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

const tradeOutcomeOptions = [
  { value: "profit", label: "Profit" },
  { value: "loss", label: "Loss" },
] as const;

type TradeOutcome = (typeof tradeOutcomeOptions)[number]["value"];

const createTakeProfitOutcome = (): TakeProfitOutcome => "";

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

function alignTimeWithDate(time: Date | null, baseDate: Date) {
  if (!time || Number.isNaN(time.getTime())) {
    return null;
  }

  const aligned = new Date(baseDate);
  aligned.setHours(time.getHours(), time.getMinutes(), 0, 0);
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

function padMultiValue<T>(values: T[], length: number, createFiller: () => T) {
  const next = values.slice(0, length);

  while (next.length < length) {
    next.push(createFiller());
  }

  return next;
}

type NumericFieldState = {
  raw: string;
  value: number | null;
};

function parseNumericInput(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function createNumericFieldState(rawValue = ""): NumericFieldState {
  return {
    raw: rawValue,
    value: parseNumericInput(rawValue),
  };
}

function createNumericFieldStateFromNumber(value: number | null): NumericFieldState {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { raw: String(value), value };
  }

  return createNumericFieldState("");
}

function numericFieldStatesAreEqual(
  a: readonly NumericFieldState[],
  b: readonly NumericFieldState[],
) {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const prev = a[index];
    const next = b[index];

    if (prev.raw !== next.raw || prev.value !== next.value) {
      return false;
    }
  }

  return true;
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

type TargetFieldConfig = {
  label: string;
  idPrefix: string;
  placeholder: string;
  type: "number" | "text";
  values: string[];
  onChange?: (index: number, value: string) => void;
  readOnly?: boolean;
};

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

  const [openTime, setOpenTime] = useState<Date | null>(null);
  const [closeTime, setCloseTime] = useState<Date | null>(null);
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

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption | null>(null);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);
  const [tradeOutcome, setTradeOutcome] = useState<TradeOutcome | null>(null);
  const [isOutcomeListOpen, setIsOutcomeListOpen] = useState(false);
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
  const [position, setPosition] = useState<"LONG" | "SHORT" | null>(null);
  const [entryPrice, setEntryPrice] = useState<NumericFieldState>(createNumericFieldState());
  const [exitPrice, setExitPrice] = useState<NumericFieldState>(createNumericFieldState());
  const [stopLoss, setStopLoss] = useState<NumericFieldState>(createNumericFieldState());
  const [takeProfitTargets, setTakeProfitTargets] = useState<NumericFieldState[]>([
    createNumericFieldState(),
  ]);
  const [takeProfitOutcomes, setTakeProfitOutcomes] = useState<TakeProfitOutcome[]>([
    createTakeProfitOutcome(),
  ]);
  const [pnlTargets, setPnlTargets] = useState<NumericFieldState[]>([createNumericFieldState()]);
  const [preTradeMentalState, setPreTradeMentalState] = useState<string | null>(null);
  const [emotionsDuringTrade, setEmotionsDuringTrade] = useState<string | null>(null);
  const [emotionsAfterTrade, setEmotionsAfterTrade] = useState<string | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<string | null>(null);
  const [emotionalTrigger, setEmotionalTrigger] = useState<string | null>(null);
  const [followedPlan, setFollowedPlan] = useState<string | null>(null);
  const [respectedRiskChoice, setRespectedRiskChoice] = useState<boolean | null>(null);
  const [respectedRiskSelection, setRespectedRiskSelection] = useState<
    "" | "Insert" | "true" | "false"
  >("");
  const [wouldRepeatTrade, setWouldRepeatTrade] = useState<boolean | null>(null);
  const [repeatTradeSelection, setRepeatTradeSelection] = useState<
    "" | "Insert" | "true" | "false" | "maybe"
  >("");
  const [riskRewardTargets, setRiskRewardTargets] = useState<string[]>([""]);
  const [riskTargets, setRiskTargets] = useState<NumericFieldState[]>([
    createNumericFieldState(),
  ]);
  const [pipsTargets, setPipsTargets] = useState<NumericFieldState[]>([createNumericFieldState()]);
  const [isAddButtonAnimating, setIsAddButtonAnimating] = useState(false);
  const [recentlyAddedColumnIndex, setRecentlyAddedColumnIndex] = useState<number | null>(null);
  const [lotSizeTargets, setLotSizeTargets] = useState<string[]>([""]);
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
        riskTargets.length,
        lotSizeTargets.length,
      ),
    [
      pnlTargets.length,
      pipsTargets.length,
      riskTargets.length,
      riskRewardTargets.length,
      takeProfitTargets.length,
      lotSizeTargets.length,
    ],
  );

  const handleAddTargetColumn = useCallback(() => {
    const nextCount = targetColumnCount + 1;

    setIsAddButtonAnimating(true);
    setRecentlyAddedColumnIndex(nextCount - 1);
    setTakeProfitTargets((prev) => padMultiValue(prev, nextCount, () => createNumericFieldState()));
    setTakeProfitOutcomes((prev) =>
      padMultiValue<TakeProfitOutcome>(prev, nextCount, createTakeProfitOutcome),
    );
    setRiskRewardTargets((prev) => padMultiValue(prev, nextCount, () => ""));
    setPipsTargets((prev) => padMultiValue(prev, nextCount, () => createNumericFieldState()));
    setRiskTargets((prev) => padMultiValue(prev, nextCount, () => createNumericFieldState()));
    setLotSizeTargets((prev) => padMultiValue(prev, nextCount, () => ""));
    setPnlTargets((prev) => padMultiValue(prev, nextCount, () => createNumericFieldState()));
  }, [targetColumnCount]);

  const handleRemoveTargetColumn = useCallback(() => {
    if (targetColumnCount <= 1) {
      return;
    }

    const nextCount = targetColumnCount - 1;

    setTakeProfitTargets((prev) => prev.slice(0, nextCount));
    setTakeProfitOutcomes((prev) => prev.slice(0, nextCount));
    setRiskRewardTargets((prev) => prev.slice(0, nextCount));
    setPipsTargets((prev) => prev.slice(0, nextCount));
    setRiskTargets((prev) => prev.slice(0, nextCount));
    setLotSizeTargets((prev) => prev.slice(0, nextCount));
    setPnlTargets((prev) => prev.slice(0, nextCount));
  }, [targetColumnCount]);

  useEffect(() => {
    if (!isAddButtonAnimating) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsAddButtonAnimating(false);
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [isAddButtonAnimating]);

  useEffect(() => {
    if (recentlyAddedColumnIndex === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRecentlyAddedColumnIndex(null);
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [recentlyAddedColumnIndex]);

  useEffect(() => {
    setPipsTargets((previous) => {
      const normalizedTakeProfitTargets = padMultiValue(
        takeProfitTargets,
        targetColumnCount,
        () => createNumericFieldState(),
      );
      const normalizedTakeProfitOutcomeValues = padMultiValue(
        takeProfitOutcomes,
        targetColumnCount,
        createTakeProfitOutcome,
      );

      const computedPips = normalizedTakeProfitTargets.map((target, index) => {
        const outcome = normalizedTakeProfitOutcomeValues[index];

        const pipsValue = calculatePips({
          entryPrice: entryPrice.value,
          takeProfitPrice: target.value,
          stopLossPrice: stopLoss.value,
          position,
          outcome,
        });

        return pipsValue === null
          ? createNumericFieldState()
          : createNumericFieldStateFromNumber(pipsValue);
      });

      return numericFieldStatesAreEqual(previous, computedPips) ? previous : computedPips;
    });
  }, [
    entryPrice,
    position,
    stopLoss,
    takeProfitOutcomes,
    takeProfitTargets,
    targetColumnCount,
  ]);

  const handleTakeProfitChange = useCallback(
    (index: number, value: string) => {
      setTakeProfitTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount, () => createNumericFieldState());
        next[index] = createNumericFieldState(value);
        return next;
      });
    },
    [targetColumnCount],
  );

  const handleTakeProfitOutcomeChange = useCallback(
    (index: number, value: string) => {
      setTakeProfitOutcomes((prev) => {
        const next = padMultiValue<TakeProfitOutcome>(
          prev,
          targetColumnCount,
          createTakeProfitOutcome,
        );
        next[index] = value === "profit" || value === "loss" ? value : "";
        return next;
      });
    },
    [targetColumnCount],
  );

  const handleRiskRewardChange = useCallback(
    (index: number, value: string) => {
      setRiskRewardTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount, () => "");
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const handleLotSizeChange = useCallback(
    (index: number, value: string) => {
      setLotSizeTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount, () => "");
        next[index] = value;
        return next;
      });
    },
    [targetColumnCount],
  );

  const handleRiskChange = useCallback(
    (index: number, value: string) => {
      setRiskTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount, () => createNumericFieldState());
        next[index] = createNumericFieldState(value);
        return next;
      });
    },
    [targetColumnCount],
  );

  const handlePnlChange = useCallback(
    (index: number, value: string) => {
      setPnlTargets((prev) => {
        const next = padMultiValue(prev, targetColumnCount, () => createNumericFieldState());
        next[index] = createNumericFieldState(value);
        return next;
      });
    },
    [targetColumnCount],
  );

  const normalizedTakeProfitOutcomeValues = useMemo(
    () =>
      padMultiValue<TakeProfitOutcome>(
        takeProfitOutcomes,
        targetColumnCount,
        createTakeProfitOutcome,
      ),
    [takeProfitOutcomes, targetColumnCount],
  );
  const entryPriceNumber = entryPrice.value;
  const stopLossNumber = stopLoss.value;
  const stopLossDistancePips = useMemo(
    () =>
      calculateStopLossDistance({
        entryPrice: entryPriceNumber,
        stopLossPrice: stopLossNumber,
        position,
      }),
    [entryPriceNumber, position, stopLossNumber],
  );
  const stopLossPipInputValue = useMemo(
    () => (stopLossDistancePips === null ? "" : stopLossDistancePips.toFixed(1)),
    [stopLossDistancePips],
  );
  const stopLossPipInputTextClassName =
    stopLossDistancePips === null ? "text-muted-fg" : "text-fg";
  const takeProfitDistancePipValues = useMemo(
    () =>
      padMultiValue<number | null>(
        takeProfitTargets.map((target) =>
          calculateTakeProfitDistance({
            entryPrice: entryPriceNumber,
            takeProfitPrice: target.value,
            position,
          }),
        ),
        targetColumnCount,
        () => null,
      ),
    [entryPriceNumber, position, takeProfitTargets, targetColumnCount],
  );
  const targetFieldConfigs = useMemo<TargetFieldConfig[]>(
    () =>
      [
        {
          label: "Take Profit",
          idPrefix: "take-profit",
          placeholder: "Insert price",
          type: "number" as const,
          values: takeProfitTargets.map((target) => target.raw),
          onChange: handleTakeProfitChange,
        },
        {
          label: "R/R",
          idPrefix: "risk-reward",
          placeholder: "Insert",
          type: "text" as const,
          values: riskRewardTargets,
          onChange: handleRiskRewardChange,
        },
        {
          label: "Nr. Pips",
          idPrefix: "pips",
          placeholder: "Insert",
          type: "text" as const,
          values: takeProfitDistancePipValues.map((distance) => {
            if (distance === null) {
              return "";
            }

            const formatted = formatPips(distance);
            return formatted === "0" ? "0.0" : formatted;
          }),
          readOnly: true,
        },
        {
          label: "P&L",
          idPrefix: "pnl",
          placeholder: "Insert",
          type: "number" as const,
          values: pnlTargets.map((target) => target.raw),
          onChange: handlePnlChange,
        },
      ],
    [
      handlePnlChange,
      handleRiskRewardChange,
      handleTakeProfitChange,
      pnlTargets,
      riskRewardTargets,
      takeProfitDistancePipValues,
      takeProfitTargets,
    ],
  );
  const pnlFieldConfig = targetFieldConfigs[targetFieldConfigs.length - 1];

  const riskDetailFieldConfigs = useMemo<TargetFieldConfig[]>(
    () =>
      [
        {
          label: "Lot Size",
          idPrefix: "lot-size",
          placeholder: "0.10",
          type: "text" as const,
          values: lotSizeTargets,
          onChange: handleLotSizeChange,
        },
        {
          label: "Risk",
          idPrefix: "risk",
          placeholder: "Insert",
          type: "number" as const,
          values: riskTargets.map((target) => target.raw),
          onChange: handleRiskChange,
        },
      ],
    [handleLotSizeChange, handleRiskChange, lotSizeTargets, riskTargets],
  );

  const overallPips = useMemo(
    () => calculateOverallPips(pipsTargets.map((target) => target.value)),
    [pipsTargets],
  );
  const formattedOverallPips = overallPips === null ? null : formatPips(overallPips);
  const overallPipsSummary = useMemo(() => {
    if (overallPips === null) {
      return null;
    }

    if (overallPips > 0 && formattedOverallPips) {
      return {
        label: `Overall Profit (${formattedOverallPips} pips)`,
        className: "text-[#2E7D32]",
      } as const;
    }

    if (overallPips < 0 && formattedOverallPips) {
      return {
        label: `Overall Loss (${formattedOverallPips} pips)`,
        className: "text-[#C62828]",
      } as const;
    }

    return { label: "Break-even (0 pips)", className: "text-muted-fg" } as const;
  }, [formattedOverallPips, overallPips]);
  const overallPipsDetailDisplay = overallPipsSummary ?? {
    label: "—",
    className: "text-muted-fg",
  };

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

      setOpenTime((prev) => alignTimeWithDate(prev, normalized));
      setCloseTime((prev) => alignTimeWithDate(prev, normalized));
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
      "flex min-w-16 flex-col items-center gap-1 rounded-full border border-transparent px-2 py-2 text-xs font-medium transition md:min-w-24 md:text-sm",
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
        setTradeOutcome(match.tradeOutcome ?? null);

        const parsedDate = new Date(match.date);
        const isDateValid = !Number.isNaN(parsedDate.getTime());
        const effectiveDate = isDateValid ? parsedDate : selectedDate;

        if (isDateValid) {
          handleSelectDate(parsedDate);
        }

        if (match.openTime) {
          const parsedOpen = new Date(match.openTime);
          setOpenTime(!Number.isNaN(parsedOpen.getTime()) ? parsedOpen : alignTimeWithDate(null, effectiveDate));
        } else {
          setOpenTime((prev) => alignTimeWithDate(prev, effectiveDate));
        }

        if (match.closeTime) {
          const parsedClose = new Date(match.closeTime);
          setCloseTime(!Number.isNaN(parsedClose.getTime()) ? parsedClose : alignTimeWithDate(null, effectiveDate));
        } else {
          setCloseTime((prev) => alignTimeWithDate(prev, effectiveDate));
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

        setPosition(match.position === "SHORT" ? "SHORT" : match.position === "LONG" ? "LONG" : null);
        setEntryPrice(createNumericFieldStateFromNumber(match.entryPrice ?? null));
        setExitPrice(createNumericFieldStateFromNumber(match.exitPrice ?? null));
        setStopLoss(createNumericFieldStateFromNumber(match.stopLoss ?? null));
        const mappedTakeProfit = (match.takeProfit ?? []).map((value) =>
          createNumericFieldStateFromNumber(value ?? null),
        );
        const mappedTakeProfitOutcomes = (match.takeProfitOutcomes ?? []).map((value) =>
          value === "profit" || value === "loss" ? value : "",
        );
        const mappedRiskReward = match.riskReward?.length ? match.riskReward : [""];
        const mappedLotSizeRaw = (match.lotSize ?? []).map((value) => value ?? "");
        const mappedLotSize =
          mappedLotSizeRaw.length > 0 ? mappedLotSizeRaw : [""];
        const mappedRisk = (match.risk ?? []).map((value) =>
          createNumericFieldStateFromNumber(value ?? null),
        );
        const mappedPips = (match.pips ?? []).map((value) =>
          createNumericFieldStateFromNumber(value ?? null),
        );
        const mappedPnl = (match.pnl ?? []).map((value) =>
          createNumericFieldStateFromNumber(value ?? null),
        );
        const columnCount = Math.max(
          1,
          mappedTakeProfit.length,
          mappedTakeProfitOutcomes.length,
          mappedRiskReward.length,
          mappedLotSize.length,
          mappedRisk.length,
          mappedPips.length,
          mappedPnl.length,
        );
        setTakeProfitTargets(
          padMultiValue(mappedTakeProfit, columnCount, () => createNumericFieldState()),
        );
        setTakeProfitOutcomes(
          padMultiValue(mappedTakeProfitOutcomes, columnCount, () => ""),
        );
        setRiskRewardTargets(padMultiValue(mappedRiskReward, columnCount, () => ""));
        setLotSizeTargets(padMultiValue(mappedLotSize, columnCount, () => ""));
        setRiskTargets(
          padMultiValue(mappedRisk, columnCount, () => createNumericFieldState()),
        );
        setPipsTargets(padMultiValue(mappedPips, columnCount, () => createNumericFieldState()));
        setPnlTargets(padMultiValue(mappedPnl, columnCount, () => createNumericFieldState()));
        setPreTradeMentalState(match.preTradeMentalState ?? null);
        setEmotionsDuringTrade(match.emotionsDuringTrade ?? null);
        setEmotionsAfterTrade(match.emotionsAfterTrade ?? null);
        setConfidenceLevel(match.confidenceLevel ?? null);
        setEmotionalTrigger(match.emotionalTrigger ?? null);
        setFollowedPlan(match.followedPlan ?? null);
        setRespectedRiskChoice(match.respectedRisk ?? null);
        setRespectedRiskSelection(
          match.respectedRisk === true ? "true" : match.respectedRisk === false ? "false" : "",
        );
        setWouldRepeatTrade(match.wouldRepeatTrade ?? null);
        setRepeatTradeSelection(
          match.wouldRepeatTrade === true
            ? "true"
            : match.wouldRepeatTrade === false
              ? "false"
              : "",
        );

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
    setSelectedSymbol((previous) => {
      if (previous?.code === symbol.code) {
        return null;
      }

      return symbol;
    });
    setIsSymbolListOpen(false);
    setIsOutcomeListOpen(false);
  };

  const handleSelectOutcome = (value: TradeOutcome) => {
    setTradeOutcome((previous) => (previous === value ? null : value));
    setIsOutcomeListOpen(false);
    setIsSymbolListOpen(false);
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

  const handleMoveLibraryItem = useCallback((itemId: string, direction: "up" | "down") => {
    setLibraryItems((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const currentIndex = prev.findIndex((item) => item.id === itemId);
      if (currentIndex === -1) {
        return prev;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const nextItems = prev.slice();
      const [movedItem] = nextItems.splice(currentIndex, 1);
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    });
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
            <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-[color:rgb(var(--surface)/0.85)] text-muted-fg">
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
          className="w-full lg:max-w-5xl"
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
              className="relative block aspect-[3/2] w-full overflow-hidden rounded-[4px] border-2"
              style={{ borderColor: "color-mix(in srgb, rgba(var(--border-strong)) 60%, transparent)" }}
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
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[color:rgb(var(--surface)/0.94)] to-[color:rgb(var(--surface)/0.78)] text-muted-fg">
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
      className="min-h-[120px] w-full resize-none rounded-none border border-border bg-[color:rgb(var(--accent)/0.06)] px-5 py-4 text-sm font-medium text-fg transition focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
    />
  );

  const tabContent =
    activeTab === "main"
      ? (
          <div className="mx-auto w-full max-w-3xl sm:max-w-4xl">
            <div className="flex w-full flex-col gap-8">
              <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
                <div className="flex flex-col gap-6">
                  <div>
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

                  <div className="mt-10 flex w-full justify-center md:mt-12">
                    <div className="flex flex-col items-center gap-3">
                      <span className="block pb-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Trade Setup</span>
                      <div className="flex w-full flex-col items-center justify-center gap-6 md:flex-row md:justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSymbolListOpen((prev) => !prev);
                            setIsOutcomeListOpen(false);
                          }}
                          className="group flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[color:rgb(var(--surface)/0.9)] px-6 text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)] md:w-72 lg:w-80"
                          aria-haspopup="listbox"
                          aria-expanded={isSymbolListOpen}
                        >
                          {selectedSymbol ? (
                            <div className="flex w-full items-center justify-center gap-3 text-fg transition-colors transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                              <span
                                className="text-2xl transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                                aria-hidden="true"
                              >
                                {selectedSymbol.flag}
                              </span>
                              <span className="text-lg font-semibold tracking-[0.2em] leading-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:text-xl">
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
                                className={`h-4 w-4 text-muted-fg opacity-100 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-80 ${
                                  isSymbolListOpen ? "rotate-180" : ""
                                }`}
                                aria-hidden="true"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-center text-[color:rgb(var(--muted-fg)/0.6)]">
                              <div className="flex items-center justify-center gap-2 animate-soft-fade text-xs font-medium tracking-[0.18em] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:text-sm">
                                <span>Select symbol</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                    isSymbolListOpen ? "rotate-180" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOutcomeListOpen((prev) => !prev);
                            setIsSymbolListOpen(false);
                          }}
                          className={`group flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] md:w-52 lg:w-56 ${
                            tradeOutcome === "profit"
                              ? "border-[#A6E8B0] bg-[#E6F9EC] text-[#2E7D32] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)]"
                              : tradeOutcome === "loss"
                                ? "border-[#F5B7B7] bg-[#FCE8E8] text-[#C62828] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)]"
                                : "border-border bg-[color:rgb(var(--surface)/0.9)] text-[color:rgb(var(--muted-fg)/0.7)] hover:-translate-y-0.5 hover:text-fg hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)]"
                          }`}
                          aria-haspopup="listbox"
                          aria-expanded={isOutcomeListOpen}
                          aria-label="Select outcome"
                          title="Select outcome"
                        >
                          {tradeOutcome ? (
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`text-lg font-semibold tracking-[0.14em] capitalize transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:text-xl ${
                                  tradeOutcome === "profit" ? "text-[#2E7D32]" : "text-[#C62828]"
                                }`}
                              >
                                {tradeOutcome === "profit" ? "Profit" : "Loss"}
                              </span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                  isOutcomeListOpen ? "rotate-180" : ""
                                } ${tradeOutcome === "profit" ? "text-[#2E7D32]" : "text-[#C62828]"}`}
                                aria-hidden="true"
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-center text-[color:rgb(var(--muted-fg)/0.6)]">
                              <div className="flex items-center justify-center gap-2 animate-soft-fade text-xs font-medium tracking-[0.18em] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:text-sm">
                                <span>Select outcome</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                    isOutcomeListOpen ? "rotate-180" : ""
                                  }`}
                                  aria-hidden="true"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRealTrade((prev) => !prev);
                            setIsSymbolListOpen(false);
                            setIsOutcomeListOpen(false);
                          }}
                          className={`group flex h-32 w-full max-w-full flex-col items-center justify-center gap-3 rounded-2xl border text-center shadow-[0_16px_32px_rgba(15,23,42,0.08)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] md:w-52 lg:w-56 ${
                            isRealTrade
                              ? "border-[#A7C8FF] bg-[#E6EEFF] text-[#2F6FED] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)]"
                              : "border-[#D7DDE5] bg-[#F5F7FA] text-[#6B7280] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.14)]"
                          }`}
                          aria-pressed={isRealTrade}
                          title={isRealTrade ? "Real Trade" : "Paper Trade"}
                        >
                          {isRealTrade ? (
                            <CheckCircle
                              className="h-5 w-5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="h-5 w-5 transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
                              aria-hidden="true"
                            />
                          )}
                          <span className="text-sm font-medium tracking-[0.08em] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
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
                        aria-activedescendant={
                          selectedSymbol ? `symbol-${selectedSymbol.code}` : undefined
                        }
                      >
                        {availableSymbols.map((symbol) => {
                          const isActive = selectedSymbol?.code === symbol.code;

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

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOutcomeListOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2"
                        role="listbox"
                        aria-activedescendant={tradeOutcome ? `outcome-${tradeOutcome}` : undefined}
                      >
                        {tradeOutcomeOptions.map(({ value, label }) => {
                          const isActive = tradeOutcome === value;
                          const activeTone =
                            value === "profit"
                              ? "bg-[#E6F9EC] text-[#2E7D32]"
                              : "bg-[#FCE8E8] text-[#C62828]";
                          const borderColor = value === "profit" ? "#A6E8B0" : "#F5B7B7";

                          return (
                            <button
                              key={value}
                              id={`outcome-${value}`}
                              type="button"
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition md:text-base ${
                                isActive
                                  ? `${activeTone} shadow-[0_16px_32px_rgba(15,23,42,0.08)]`
                                  : "border-border text-muted-fg hover:bg-subtle hover:text-fg"
                              }`}
                              style={isActive ? { borderColor } : undefined}
                              onClick={() => handleSelectOutcome(value)}
                              role="option"
                              aria-selected={isActive}
                            >
                              <span className="tracking-[0.18em] uppercase">{label}</span>
                              {isActive ? (
                                <CheckCircle
                                  className={`h-4 w-4 ${
                                    value === "profit" ? "text-[#2E7D32]" : "text-[#C62828]"
                                  }`}
                                  aria-hidden="true"
                                />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-fg" aria-hidden="true" />
                              )}
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

                    <p className="mt-2 text-center text-sm text-muted-fg">
                      Duration: {durationLabel}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
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
                          value={position ?? ""}
                          onChange={(event) => {
                            const nextValue = event.target.value;

                            if (nextValue === "SHORT") {
                              setPosition("SHORT");
                              return;
                            }

                            if (nextValue === "LONG") {
                              setPosition("LONG");
                              return;
                            }

                            setPosition(null);
                          }}
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg focus:outline-none focus:ring-0"
                          style={position ? undefined : { color: "rgb(var(--muted-fg) / 0.6)" }}
                        >
                          <option value="" disabled hidden>
                            Insert position
                          </option>
                          <option value="LONG">Long</option>
                          <option value="SHORT">Short</option>
                          <option value="INSERT">Insert</option>
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
                          value={entryPrice.raw}
                          onChange={(event) => setEntryPrice(createNumericFieldState(event.target.value))}
                          placeholder="Insert price"
                          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:gap-2">
                          <label
                            htmlFor="stop-loss-input"
                            className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                          >
                            Stop Loss
                          </label>
                          <label
                            htmlFor="stop-loss-pips-input"
                            className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg md:justify-self-end md:text-right"
                          >
                            Nr. Pips (SL)
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:gap-2 md:items-end">
                          <input
                            id="stop-loss-input"
                            type="number"
                            value={stopLoss.raw}
                            onChange={(event) => setStopLoss(createNumericFieldState(event.target.value))}
                            placeholder="Insert price"
                            className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                          />
                          <input
                            id="stop-loss-pips-input"
                            type="text"
                            inputMode="decimal"
                            value={stopLossPipInputValue}
                            readOnly
                            placeholder="—"
                            className={`rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0 ${stopLossPipInputTextClassName}`}
                            aria-readonly="true"
                          />
                        </div>
                      </div>

                      {targetFieldConfigs.slice(0, 3).map((fieldConfig) => {
                        const normalizedValues = padMultiValue(
                          fieldConfig.values,
                          targetColumnCount,
                          () => "",
                        );

                        return (
                          <div className="flex flex-col gap-2" key={fieldConfig.idPrefix}>
                            <div
                              className="grid gap-3 pr-12"
                              style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                            >
                              {normalizedValues.map((_, columnIndex) => {
                                const inputId = `${fieldConfig.idPrefix}-input-${columnIndex}`;
                                const labelId = `${fieldConfig.idPrefix}-label-${columnIndex}`;
                                const outcomeValue =
                                  normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                const outcomeStyle = getOutcomeStyle(outcomeValue);

                                if (fieldConfig.idPrefix === "take-profit") {
                                  const outcomeSelectId = `${fieldConfig.idPrefix}-outcome-${columnIndex}`;
                                  return (
                                    <div
                                      key={labelId}
                                      className="flex items-center justify-between gap-3"
                                    >
                                      <label
                                        id={labelId}
                                        htmlFor={outcomeSelectId}
                                        className={`flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-200 ease-in-out ${outcomeStyle.label}`}
                                      >
                                        <span>{`${fieldConfig.label} ${columnIndex + 1}`}</span>
                                      </label>
                                      <TakeProfitOutcomeSelect
                                        id={outcomeSelectId}
                                        value={outcomeValue}
                                        onChange={(nextValue) =>
                                          handleTakeProfitOutcomeChange(
                                            columnIndex,
                                            nextValue,
                                          )
                                        }
                                        ariaLabelledBy={labelId}
                                      />
                                    </div>
                                  );
                                }

                                return (
                                  <label
                                    key={labelId}
                                    id={labelId}
                                    htmlFor={inputId}
                                    className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-200 ease-in-out ${outcomeStyle.label}`}
                                  >
                                    {`${fieldConfig.label} ${columnIndex + 1}`}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="relative">
                              <div
                                className="grid gap-3 pr-12"
                                style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                              >
                                {normalizedValues.map((value, columnIndex) => {
                                  const inputId = `${fieldConfig.idPrefix}-input-${columnIndex}`;
                                  const isRemovableColumn =
                                    targetColumnCount > 1 && columnIndex === targetColumnCount - 1;
                                  const isNewColumn = recentlyAddedColumnIndex === columnIndex;
                                  const outcomeValue =
                                    normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                  const outcomeStyle = getOutcomeStyle(outcomeValue);

                                  return (
                                    <div
                                      className={`group relative${
                                        isNewColumn ? " animate-target-column-enter" : ""
                                      }`}
                                      key={inputId}
                                    >
                                      <input
                                        id={inputId}
                                        type={fieldConfig.type}
                                        value={value}
                                        onChange={(event) =>
                                          fieldConfig.onChange?.(
                                            columnIndex,
                                            event.target.value,
                                          )
                                        }
                                        placeholder={fieldConfig.placeholder}
                                        readOnly={fieldConfig.readOnly ?? false}
                                        aria-readonly={fieldConfig.readOnly ?? undefined}
                                        className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium placeholder:opacity-60 focus:outline-none focus:ring-0 transition-colors duration-200 ease-in-out ${outcomeStyle.border} ${outcomeStyle.background} ${outcomeStyle.text} ${outcomeStyle.placeholder}`}
                                      />
                                      {isRemovableColumn && (
                                        <button
                                          type="button"
                                          onClick={handleRemoveTargetColumn}
                                          className="absolute -right-2 -top-2 inline-flex h-6 w-6 transform items-center justify-center rounded-full border border-border bg-[color:rgb(var(--surface))] text-muted-fg shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:opacity-100 hover:text-fg focus:outline-none focus-visible:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--surface))]"
                                          aria-label={`Rimuovi ultima colonna per ${fieldConfig.label}`}
                                        >
                                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={handleAddTargetColumn}
                                className={`absolute right-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[color:rgb(var(--accent))] text-white shadow-[0_12px_28px_rgba(0,122,255,0.35)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] ${
                                  isAddButtonAnimating ? "animate-add-button-press" : ""
                                }`}
                                aria-label={`Aggiungi colonna per ${fieldConfig.label}`}
                              >
                                <Plus
                                  aria-hidden="true"
                                  className={`h-4 w-4 ${
                                    isAddButtonAnimating ? "animate-add-icon-bounce" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex w-full items-center justify-center rounded-2xl border border-border bg-surface px-6 py-4 text-center">
                        <span className={`text-sm font-semibold ${overallPipsDetailDisplay.className}`}>
                          {overallPipsDetailDisplay.label}
                        </span>
                      </div>

                    </div>

                    <div className="my-6 border-t border-border" />

                    <div className="flex flex-col gap-4">
                      <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
                        Risk Details
                      </span>
                      {riskDetailFieldConfigs.map((fieldConfig) => {
                        const normalizedValues = padMultiValue(
                          fieldConfig.values,
                          targetColumnCount,
                          () => "",
                        );

                        return (
                          <div className="flex flex-col gap-2" key={fieldConfig.idPrefix}>
                            <div
                              className="grid gap-3 pr-12"
                              style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                            >
                              {normalizedValues.map((_, columnIndex) => {
                                const inputId = `${fieldConfig.idPrefix}-input-${columnIndex}`;
                                const labelId = `${fieldConfig.idPrefix}-label-${columnIndex}`;
                                const outcomeValue =
                                  normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                const outcomeStyle = getOutcomeStyle(outcomeValue);

                                return (
                                  <label
                                    key={labelId}
                                    id={labelId}
                                    htmlFor={inputId}
                                    className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-200 ease-in-out ${outcomeStyle.label}`}
                                  >
                                    {`${fieldConfig.label} ${columnIndex + 1}`}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="relative">
                              <div
                                className="grid gap-3 pr-12"
                                style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                              >
                                {normalizedValues.map((value, columnIndex) => {
                                  const inputId = `${fieldConfig.idPrefix}-input-${columnIndex}`;
                                  const isRemovableColumn =
                                    targetColumnCount > 1 && columnIndex === targetColumnCount - 1;
                                  const isNewColumn = recentlyAddedColumnIndex === columnIndex;
                                  const outcomeValue =
                                    normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                  const outcomeStyle = getOutcomeStyle(outcomeValue);

                                  return (
                                    <div
                                      className={`group relative${
                                        isNewColumn ? " animate-target-column-enter" : ""
                                      }`}
                                      key={inputId}
                                    >
                                      <input
                                        id={inputId}
                                        type={fieldConfig.type}
                                        value={value}
                                        onChange={(event) =>
                                          fieldConfig.onChange?.(
                                            columnIndex,
                                            event.target.value,
                                          )
                                        }
                                        placeholder={fieldConfig.placeholder}
                                        readOnly={fieldConfig.readOnly ?? false}
                                        aria-readonly={fieldConfig.readOnly ?? undefined}
                                        className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium placeholder:opacity-60 focus:outline-none focus:ring-0 transition-colors duration-200 ease-in-out ${outcomeStyle.border} ${outcomeStyle.background} ${outcomeStyle.text} ${outcomeStyle.placeholder}`}
                                      />
                                      {isRemovableColumn && (
                                        <button
                                          type="button"
                                          onClick={handleRemoveTargetColumn}
                                          className="absolute -right-2 -top-2 inline-flex h-6 w-6 transform items-center justify-center rounded-full border border-border bg-[color:rgb(var(--surface))] text-muted-fg shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:opacity-100 hover:text-fg focus:outline-none focus-visible:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--surface))]"
                                          aria-label={`Rimuovi ultima colonna per ${fieldConfig.label}`}
                                        >
                                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={handleAddTargetColumn}
                                className={`absolute right-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[color:rgb(var(--accent))] text-white shadow-[0_12px_28px_rgba(0,122,255,0.35)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] ${
                                  isAddButtonAnimating ? "animate-add-button-press" : ""
                                }`}
                                aria-label={`Aggiungi colonna per ${fieldConfig.label}`}
                              >
                                <Plus
                                  aria-hidden="true"
                                  className={`h-4 w-4 ${
                                    isAddButtonAnimating ? "animate-add-icon-bounce" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {pnlFieldConfig && (() => {
                        const normalizedValues = padMultiValue(
                          pnlFieldConfig.values,
                          targetColumnCount,
                          () => "",
                        );

                        return (
                          <div className="flex flex-col gap-2" key={pnlFieldConfig.idPrefix}>
                            <div
                              className="grid gap-3 pr-12"
                              style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                            >
                              {normalizedValues.map((_, columnIndex) => {
                                const outcomeValue = normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                const outcomeStyle = getOutcomeStyle(outcomeValue);

                                return (
                                  <label
                                    key={`${pnlFieldConfig.idPrefix}-label-${columnIndex}`}
                                    htmlFor={`${pnlFieldConfig.idPrefix}-input-${columnIndex}`}
                                    className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-200 ease-in-out ${outcomeStyle.label}`}
                                  >
                                    {`${pnlFieldConfig.label} ${columnIndex + 1}`}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="relative">
                              <div
                                className="grid gap-3 pr-12"
                                style={{ gridTemplateColumns: `repeat(${targetColumnCount}, minmax(0, 1fr))` }}
                              >
                                {normalizedValues.map((value, columnIndex) => {
                                  const inputId = `${pnlFieldConfig.idPrefix}-input-${columnIndex}`;
                                  const isRemovableColumn =
                                    targetColumnCount > 1 && columnIndex === targetColumnCount - 1;
                                  const isNewColumn = recentlyAddedColumnIndex === columnIndex;
                                  const outcomeValue = normalizedTakeProfitOutcomeValues[columnIndex] ?? "";
                                  const outcomeStyle = getOutcomeStyle(outcomeValue);

                                  return (
                                    <div
                                      className={`group relative${
                                        isNewColumn ? " animate-target-column-enter" : ""
                                      }`}
                                      key={inputId}
                                    >
                                      <input
                                        id={inputId}
                                        type={pnlFieldConfig.type}
                                        value={value}
                                        onChange={(event) =>
                                          pnlFieldConfig.onChange?.(
                                            columnIndex,
                                            event.target.value,
                                          )
                                        }
                                        placeholder={pnlFieldConfig.placeholder}
                                        readOnly={pnlFieldConfig.readOnly ?? false}
                                        aria-readonly={pnlFieldConfig.readOnly ?? undefined}
                                        className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium placeholder:opacity-60 focus:outline-none focus:ring-0 transition-colors duration-200 ease-in-out ${outcomeStyle.border} ${outcomeStyle.background} ${outcomeStyle.text} ${outcomeStyle.placeholder}`}
                                      />
                                      {isRemovableColumn && (
                                        <button
                                          type="button"
                                          onClick={handleRemoveTargetColumn}
                                          className="absolute -right-2 -top-2 inline-flex h-6 w-6 transform items-center justify-center rounded-full border border-border bg-[color:rgb(var(--surface))] text-muted-fg shadow-[0_8px_20px_rgba(15,23,42,0.12)] opacity-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:opacity-100 hover:text-fg focus:outline-none focus-visible:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--surface))]"
                                          aria-label={`Rimuovi ultima colonna per ${pnlFieldConfig.label}`}
                                        >
                                          <X aria-hidden="true" className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={handleAddTargetColumn}
                                className={`absolute right-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[color:rgb(var(--accent))] text-white shadow-[0_12px_28px_rgba(0,122,255,0.35)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))] ${
                                  isAddButtonAnimating ? "animate-add-button-press" : ""
                                }`}
                                aria-label={`Aggiungi colonna per ${pnlFieldConfig.label}`}
                              >
                                <Plus
                                  aria-hidden="true"
                                  className={`h-4 w-4 ${
                                    isAddButtonAnimating ? "animate-add-icon-bounce" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-6 border-t border-border" />
                    <span className="mt-6 mb-3 block text-sm font-semibold uppercase tracking-widest text-muted-fg">
                      Psychology & Mindset
                    </span>
                    <div className="flex flex-col gap-4">
                      <StyledSelect
                        label="Mental state before the trade"
                        value={preTradeMentalState ?? ""}
                        onChange={(nextValue) =>
                          setPreTradeMentalState(
                            !nextValue || nextValue === "Insert" ? null : nextValue,
                          )
                        }
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        {preTradeMentalStateOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Emotions during the trade"
                        value={emotionsDuringTrade ?? ""}
                        onChange={(nextValue) =>
                          setEmotionsDuringTrade(
                            !nextValue || nextValue === "Insert" ? null : nextValue,
                          )
                        }
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        {emotionsDuringTradeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Emotions after the trade"
                        value={emotionsAfterTrade ?? ""}
                        onChange={(nextValue) =>
                          setEmotionsAfterTrade(
                            !nextValue || nextValue === "Insert" ? null : nextValue,
                          )
                        }
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        {emotionsAfterTradeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <div className="flex flex-col gap-2">
                        <label
                          htmlFor="confidence-level-input"
                          className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                        >
                          Confidence level (1–10)
                        </label>
                        <input
                          id="confidence-level-input"
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          value={confidenceLevel ?? ""}
                          onChange={(event) => {
                            const rawValue = event.target.value;

                            if (rawValue === "") {
                              setConfidenceLevel(null);
                              return;
                            }

                            const numericValue = Number(rawValue);

                            if (Number.isNaN(numericValue)) {
                              return;
                            }

                            const clampedValue = Math.min(10, Math.max(1, numericValue));
                            setConfidenceLevel(String(clampedValue));
                          }}
                          placeholder="Insert"
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <StyledSelect
                        label="Emotional triggers"
                        value={emotionalTrigger ?? ""}
                        onChange={(nextValue) =>
                          setEmotionalTrigger(
                            !nextValue || nextValue === "Insert" ? null : nextValue,
                          )
                        }
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        {emotionalTriggerOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Ho seguito il mio piano?"
                        value={followedPlan ?? ""}
                        onChange={(nextValue) =>
                          setFollowedPlan(
                            !nextValue || nextValue === "Insert" ? null : nextValue,
                          )
                        }
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        {followedPlanOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </StyledSelect>

                      <StyledSelect
                        label="Ho rispettato il rischio prefissato?"
                        value={respectedRiskSelection}
                        onChange={(nextValue) => {
                          if (nextValue === "true") {
                            setRespectedRiskChoice(true);
                            setRespectedRiskSelection("true");
                            return;
                          }

                          if (nextValue === "false") {
                            setRespectedRiskChoice(false);
                            setRespectedRiskSelection("false");
                            return;
                          }

                          setRespectedRiskChoice(null);
                          setRespectedRiskSelection(nextValue === "Insert" ? "Insert" : "");
                        }}
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        <option value="true">Sì</option>
                        <option value="false">No</option>
                      </StyledSelect>

                      <StyledSelect
                        label="Rifarei questo trade?"
                        value={repeatTradeSelection}
                        onChange={(nextValue) => {
                          if (nextValue === "true") {
                            setWouldRepeatTrade(true);
                            setRepeatTradeSelection("true");
                            return;
                          }

                          if (nextValue === "false") {
                            setWouldRepeatTrade(false);
                            setRepeatTradeSelection("false");
                            return;
                          }

                          if (nextValue === "maybe") {
                            setWouldRepeatTrade(null);
                            setRepeatTradeSelection("maybe");
                            return;
                          }

                          if (nextValue === "Insert") {
                            setWouldRepeatTrade(null);
                            setRepeatTradeSelection("Insert");
                            return;
                          }

                          setWouldRepeatTrade(null);
                          setRepeatTradeSelection("");
                        }}
                        placeholder="Select option"
                      >
                        <option value="Insert">Insert</option>
                        <option value="true">Sì</option>
                        <option value="false">No</option>
                        <option value="maybe">Forse</option>
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
            onMoveAction={handleMoveLibraryItem}
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

    const normalizedPosition: "LONG" | "SHORT" | null =
      position === "SHORT" ? "SHORT" : position === "LONG" ? "LONG" : null;

    const takeProfitValues = takeProfitTargets.map((target) => target.value);
    const normalizedTakeProfitOutcomes = padMultiValue(
      takeProfitOutcomes,
      targetColumnCount,
      () => "",
    ).map((value) => (value === "profit" || value === "loss" ? value : null));
    const riskRewardValues = riskRewardTargets.slice();
    const riskValues = riskTargets.map((target) => target.value);
    const pipsValues = pipsTargets.map((target) => target.value);
    const lotSizeValues = lotSizeTargets.map((value) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    });
    const pnlValues = pnlTargets.map((target) => target.value);

    const payload: TradePayload = {
      id: editingTradeId ?? undefined,
      symbolCode: selectedSymbol?.code ?? "",
      isPaperTrade: !isRealTrade,
      tradeOutcome,
      date: selectedDate.toISOString(),
      openTime: openTime ? openTime.toISOString() : null,
      closeTime: closeTime ? closeTime.toISOString() : null,
      position: normalizedPosition,
      riskReward: riskRewardValues,
      risk: riskValues,
      pips: pipsValues,
      lotSize: lotSizeValues,
      entryPrice: entryPrice.value,
      exitPrice: exitPrice.value,
      stopLoss: stopLoss.value,
      takeProfit: takeProfitValues,
      takeProfitOutcomes: normalizedTakeProfitOutcomes,
      pnl: pnlValues,
      preTradeMentalState: preTradeMentalState?.trim() || null,
      emotionsDuringTrade: emotionsDuringTrade?.trim() || null,
      emotionsAfterTrade: emotionsAfterTrade?.trim() || null,
      confidenceLevel: confidenceLevel?.trim() || null,
      emotionalTrigger: emotionalTrigger?.trim() || null,
      followedPlan: followedPlan?.trim() || null,
      respectedRisk: respectedRiskChoice,
      wouldRepeatTrade: wouldRepeatTrade,
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
    lotSizeTargets,
    position,
    preTradeMentalState,
    removedLibraryItems,
    respectedRiskChoice,
    riskTargets,
    riskRewardTargets,
    router,
    selectedDate,
    selectedSymbol?.code,
    tradeOutcome,
    startNavigation,
    stopLoss,
    takeProfitTargets,
    pnlTargets,
    confidenceLevel,
    emotionalTrigger,
    wouldRepeatTrade,
    takeProfitOutcomes,
    targetColumnCount,
  ]);

  return (
    <section
      className="page-shell page-shell--wide relative flex min-h-dvh flex-col gap-12 pb-20 pt-24 text-fg sm:pt-28"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-12 w-12 flex-none rounded-full border border-border bg-[color:rgb(var(--surface)/0.92)] p-0 text-lg text-muted-fg backdrop-blur hover:text-fg"
          onClick={() => {
            startNavigation(() => {
              router.push("/");
            });
          }}
          aria-label="Close"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          className="ml-auto w-full min-w-0 sm:w-auto sm:min-w-36"
          onClick={handleSaveTrade}
          disabled={isSaving || isLoadingTrade}
        >
          {isSaving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
      </div>

      <div className="flex w-full flex-1 flex-col gap-14">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex w-full flex-col gap-8">
            <header className="section-heading items-start text-left">
              <p>Trading Journal</p>
              <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
                Register a trade
              </h1>
            </header>

            <nav className="mt-12 flex w-full items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-muted-fg sm:gap-4">
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
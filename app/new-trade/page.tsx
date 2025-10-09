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
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Button from "@/components/ui/Button";
import { loadTrades, saveTrade, updateTrade, type StoredTrade } from "@/lib/tradesStorage";

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

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffFromMonday);
  return start;
}

function getStartOfMonth(date: Date) {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

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

  const openTimeInputRef = useRef<HTMLInputElement | null>(null);
  const closeTimeInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const weekSwipeOriginRef = useRef<{ x: number; time: number } | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[2]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [position, setPosition] = useState<"LONG" | "SHORT">("LONG");
  const [riskReward, setRiskReward] = useState("");
  const [risk, setRisk] = useState("");
  const [pips, setPips] = useState("");
  const [activeTab, setActiveTab] = useState<"main" | "library">("main");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getStartOfMonth(initialSelectedDate),
  );
  const [, startNavigation] = useTransition();
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

  const handleSelectDate = useCallback((targetDate: Date) => {
    const normalized = new Date(targetDate);
    normalized.setHours(0, 0, 0, 0);
    const normalizedWeekStart = getStartOfWeek(normalized);

    setSelectedDate((prev) => {
      if (isSameDay(prev, normalized)) {
        return prev;
      }
      return normalized;
    });

    setVisibleWeekStart((prev) => {
      if (isSameDay(prev, normalizedWeekStart)) {
        return prev;
      }
      return normalizedWeekStart;
    });

    setOpenTime((prev) => alignTimeWithDate(prev, normalized, 9));
    setCloseTime((prev) => alignTimeWithDate(prev, normalized, 17));
  }, []);

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

      shiftWeek(primaryDelta > 0 ? 1 : -1);
    },
    [shiftWeek],
  );

  const handleWeekPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") {
        event.currentTarget.setPointerCapture(event.pointerId);
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

      if (Math.abs(deltaX) > 40 && duration < 600) {
        shiftWeek(deltaX < 0 ? 1 : -1);
      }

      weekSwipeOriginRef.current = null;
    },
    [shiftWeek],
  );

  const handleWeekPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      weekSwipeOriginRef.current = null;
    },
    [],
  );

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
      return;
    }

    const trades = loadTrades();
    const match = trades.find((trade) => trade.id === editingTradeId);

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

    setImageData(match.imageData ?? null);
    setImageError(null);

    setPosition(match.position === "SHORT" ? "SHORT" : "LONG");
    setRiskReward(match.riskReward ?? "");
    setRisk(match.risk ?? "");
    setPips(match.pips ?? "");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [editingTradeId, handleSelectDate, imageInputRef, isEditing, router, selectedDate]);

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

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageData(reader.result);
        setImageError(null);
      }
    };

    reader.onerror = () => {
      setImageError("Failed to load the selected image. Please try another file.");
      setImageData(null);
    };

    reader.readAsDataURL(file);
  }, []);

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageData(null);
    setImageError(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

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
          onClick={() => {
            const targetTradeId = editingTradeId ?? Date.now().toString(36);
            const trade: StoredTrade = {
              id: targetTradeId,
              symbolCode: selectedSymbol.code,
              symbolFlag: selectedSymbol.flag,
              date: selectedDate.toISOString(),
              openTime: openTime ? openTime.toISOString() : null,
              closeTime: closeTime ? closeTime.toISOString() : null,
              imageData: imageData ?? null,
              position,
              riskReward: riskReward.trim() || null,
              risk: risk.trim() || null,
              pips: pips.trim() || null,
            };

            if (isEditing && editingTradeId) {
              updateTrade(trade);
            } else {
              saveTrade(trade);
            }

            const destination = isEditing && editingTradeId ? `/registered-trades/${editingTradeId}` : "/";

            startNavigation(() => {
              router.push(destination);
            });

            window.setTimeout(() => {
              if (window.location.pathname.startsWith("/new-trade")) {
                window.location.href = destination;
              }
            }, 150);
          }}
        >
          {isEditing ? "Update" : "Save"}
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 sm:max-w-4xl">
        <header className="space-y-2">
          <p className="text-sm text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-5xl">
            Register a trade
          </h1>
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
            <div
              className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-hidden rounded-full border border-border bg-surface px-1 py-1"
              onWheel={handleWeekWheel}
              onPointerDown={handleWeekPointerDown}
              onPointerUp={handleWeekPointerUp}
              onPointerCancel={handleWeekPointerCancel}
              onPointerLeave={handleWeekPointerCancel}
            >
              {visibleWeekDays.map((date) => {
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

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleSelectDate(new Date(date))}
                    className={`flex min-w-[62px] flex-col items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition md:min-w-[88px] md:text-sm ${
                      isSelected
                        ? "border-transparent bg-accent text-white"
                        : isToday
                          ? "border-accent/60 text-accent"
                          : "border-transparent text-muted-fg hover:text-fg"
                    }`}
                    aria-pressed={isSelected}
                    aria-current={isSelected ? "date" : undefined}
                    aria-label={`Select ${accessibleLabel}`}
                    title={accessibleLabel}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-semibold" : "font-medium"}`}>
                      {dayNumber}
                    </span>
                    <span
                      className={`text-[10px] tracking-[0.3em] md:text-xs ${
                        isSelected ? "opacity-100" : "opacity-80"
                      }`}
                    >
                      {monthLabel}
                    </span>
                    {isToday ? <span className="sr-only">Today</span> : null}
                  </button>
                );
              })}

              <button
                type="button"
                className={`ml-auto flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg ${
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Symbol</span>
                  <button
                    type="button"
                    onClick={() => setIsSymbolListOpen((prev) => !prev)}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-accent/40"
                    aria-haspopup="listbox"
                    aria-expanded={isSymbolListOpen}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {selectedSymbol.flag}
                    </span>
                    <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
                      {selectedSymbol.code}
                    </span>
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-fg hover:text-fg"
                  onClick={() => setIsSymbolListOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isSymbolListOpen}
                >
                  {isSymbolListOpen ? "Hide symbols" : "Show symbols"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 transition-transform ${isSymbolListOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Button>
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
                      className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl border-0 bg-transparent opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
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
                      className="absolute inset-0 h-full w-full cursor-pointer rounded-2xl border-0 bg-transparent opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/40"
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

              <div className="mt-6 flex flex-col gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Conditions</span>
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
                      onChange={(event) => setPosition(event.target.value === "SHORT" ? "SHORT" : "LONG")}
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="LONG">Long</option>
                      <option value="SHORT">Short</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="risk-reward-input"
                      className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                    >
                      R/R
                    </label>
                    <input
                      id="risk-reward-input"
                      type="text"
                      value={riskReward}
                      onChange={(event) => setRiskReward(event.target.value)}
                      placeholder="1:4"
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent/30"
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
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="pips-input"
                      className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg"
                    >
                      Nr. Pips
                    </label>
                    <input
                      id="pips-input"
                      type="text"
                      value={pips}
                      onChange={(event) => setPips(event.target.value)}
                      placeholder="55"
                      className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg placeholder:text-muted-fg placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full surface-panel px-5 py-6 md:px-6 md:py-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-fg">Images</span>
                <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg opacity-80">
                  Before the position
                </span>
              </div>

              <button
                type="button"
                onClick={openImagePicker}
                className={`group relative flex min-h-[220px] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed ${
                  imageData
                    ? "border-transparent bg-surface"
                    : "bg-subtle text-muted-fg transition hover:text-accent"
                } aspect-video`}
                style={
                  imageData
                    ? undefined
                    : { borderColor: "color-mix(in srgb, rgba(var(--border)) 100%, transparent)" }
                }
              >
                {imageData ? (
                  <Image
                    src={imageData}
                    alt="Selected trade context"
                    fill
                    sizes="(min-width: 768px) 480px, 90vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center text-sm font-medium">
                    <span className="rounded-full bg-bg px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-muted-fg">
                      Enter image
                    </span>
                    <span className="text-xs text-muted-fg opacity-80">PNG, JPG or WEBP · max 5 MB</span>
                    <span className="text-xs text-muted-fg opacity-70">
                      Tap to upload a snapshot of your setup before entering the trade.
                    </span>
                  </div>
                )}
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
                aria-label="Upload trade image"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-fg">
                <p className="max-w-[70%]">
                  {imageData ? "Tap the preview to replace the image." : "Tap the area above to select or capture an image."}
                </p>
                {imageData ? (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-[11px] font-medium uppercase tracking-[0.24em] text-accent transition hover:opacity-80"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              {imageError ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{imageError}</p>
              ) : null}
            </div>
          </div>
            </>
          ) : (
            <div className="w-full surface-panel px-5 py-6 text-center text-sm text-muted-fg md:px-6 md:py-8">
              Library gallery will be available soon.
            </div>
          )}
        </div>
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

export default function NewTradePage() {
  return (
    <Suspense fallback={null}>
      <NewTradePageContent />
    </Suspense>
  );
}
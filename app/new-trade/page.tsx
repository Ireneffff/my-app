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

  const currentWeekDays = useMemo(() => {
    const baseDate = new Date(today);
    const baseDay = baseDate.getDay();
    const diffFromMonday = (baseDay + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - diffFromMonday);

    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [today]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
    const initialDate = currentWeekDays.at(dayIndex) ?? currentWeekDays[0] ?? today;
    return new Date(initialDate);
  });

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

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[2]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [position, setPosition] = useState<"LONG" | "SHORT">("LONG");
  const [riskReward, setRiskReward] = useState("");
  const [risk, setRisk] = useState("");
  const [pips, setPips] = useState("");
  const [, startNavigation] = useTransition();

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
    (targetDate: Date) => {
      const normalized = new Date(targetDate);
      normalized.setHours(0, 0, 0, 0);

      const shouldUpdateDate =
        selectedDate.toDateString() !== normalized.toDateString();

      if (shouldUpdateDate) {
        setSelectedDate(normalized);
      }

      setOpenTime((prev) => alignTimeWithDate(prev, normalized, 9));
      setCloseTime((prev) => alignTimeWithDate(prev, normalized, 17));
    },
    [selectedDate],
  );

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
          <nav className="flex w-full flex-wrap items-center gap-2 px-1 py-2 text-sm text-muted-fg">
            {[
              { label: "Main data", isActive: true },
              { label: "Performance", isActive: false },
              { label: "Mindset", isActive: false },
            ].map(({ label, isActive }) => (
              <button
                key={label}
                type="button"
                className={`rounded-full border px-4 py-2 transition ${
                  isActive
                    ? "border-border bg-surface text-fg"
                    : "border-transparent text-muted-fg hover:border-border hover:text-fg"
                }`}
                aria-pressed={isActive}
                disabled={!isActive}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="w-full surface-panel px-4 py-6 md:px-6 md:py-8">
            <div className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-x-auto rounded-full border border-border bg-surface px-1 py-1">
              {currentWeekDays.map((date) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const dayNumber = date.getDate();
                const monthLabel = date
                  .toLocaleDateString(undefined, {
                    month: "short",
                  })
                  .toUpperCase();

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleSelectDate(new Date(date))}
                    className={`flex min-w-[62px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition md:min-w-[88px] md:text-sm ${
                      isSelected ? "bg-accent text-white" : "text-muted-fg hover:text-fg"
                    }`}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-semibold" : "font-medium"}`}>
                      {dayNumber}
                    </span>
                    <span className="text-[10px] tracking-[0.3em] md:text-xs">
                      {monthLabel}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                className="ml-auto flex h-12 w-12 flex-none items-center justify-center rounded-full border border-border text-muted-fg transition hover:bg-subtle hover:text-fg"
                onClick={() => {
                  const dayIndex = Math.min((today.getDay() + 6) % 7, 4);
                  const targetDate = currentWeekDays.at(dayIndex) ?? currentWeekDays[0] ?? today;
                  handleSelectDate(new Date(targetDate));
                }}
                aria-label="Select today"
                title="Select today"
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

            <p className="mt-5 text-sm text-muted-fg md:text-base">
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
        </div>
      </div>
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
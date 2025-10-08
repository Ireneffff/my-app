"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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

  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption>(availableSymbols[2]);
  const [isSymbolListOpen, setIsSymbolListOpen] = useState(false);
  const [, startNavigation] = useTransition();

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
  }, [editingTradeId, handleSelectDate, isEditing, router, selectedDate]);

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

  const openDateTimePicker = useCallback((input: HTMLInputElement | null) => {
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    try {
      if (typeof pickerInput.showPicker === "function") {
        pickerInput.showPicker();
        return;
      }
    } catch {
      // Some browsers may throw if showPicker fails; fall back to focus + click
    }

    input.focus();
    input.click();
  }, []);

  const openTimeDisplay = getDateTimeDisplayParts(openTime);
  const closeTimeDisplay = getDateTimeDisplayParts(closeTime);

  return (
    <section
      className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#ffffff,_#f1f1f1)] px-4 pb-10 text-fg sm:px-6 md:px-10"
      style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="mx-auto mb-6 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-full bg-transparent px-3 py-2">
        <button
          type="button"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/80 text-lg font-semibold text-muted-fg shadow-[0_10px_24px_-16px_rgba(15,23,42,0.3)] transition hover:scale-105 hover:text-fg"
          onClick={() => {
            router.back();
          }}
          aria-label="Close"
        >
          ×
        </button>

        <button
          type="button"
          className="ml-auto min-w-[140px] rounded-full bg-accent px-6 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_14px_32px_-18px_rgba(15,23,42,0.3)] transition hover:scale-105"
          onClick={() => {
            const targetTradeId = editingTradeId ?? Date.now().toString(36);
            const trade: StoredTrade = {
              id: targetTradeId,
              symbolCode: selectedSymbol.code,
              symbolFlag: selectedSymbol.flag,
              date: selectedDate.toISOString(),
              openTime: openTime ? openTime.toISOString() : null,
              closeTime: closeTime ? closeTime.toISOString() : null,
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
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Trading Journal</p>
          <h1 className="text-4xl font-black tracking-tight text-fg drop-shadow-sm md:text-5xl">
            Register a Trade
          </h1>
        </header>

        <div className="flex w-full flex-col items-center gap-8">
          <nav className="flex w-full flex-wrap items-center justify-center gap-2 px-2 py-2">
            {[
              { label: "Main data", isActive: true },
              { label: "Performance", isActive: false },
              { label: "Mindset", isActive: false },
            ].map(({ label, isActive }) => (
              <button
                key={label}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive ? "text-fg" : "text-muted-fg hover:text-fg"
                }`}
                aria-pressed={isActive}
                disabled={!isActive}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="w-full rounded-[2.5rem] bg-white/85 px-4 py-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.32)] backdrop-blur md:px-6 md:py-8">
            <div className="mx-auto flex w-full max-w-xl items-center gap-2 overflow-x-auto rounded-full bg-transparent px-1 py-1">
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
                    className={`flex min-w-[62px] flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition md:min-w-[88px] md:text-sm ${
                      isSelected
                        ? "bg-accent text-white shadow-[0_12px_26px_-18px_rgba(15,23,42,0.3)]"
                        : "text-muted-fg hover:text-fg"
                    }`}
                  >
                    <span className={`text-xl md:text-2xl ${isSelected ? "font-black" : "font-bold"}`}>
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
                className="ml-auto flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white/90 text-muted-fg shadow-[0_12px_30px_-20px_rgba(15,23,42,0.3)] transition hover:text-fg"
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

            <p className="mt-5 text-sm font-medium text-muted-fg md:text-base">
              Day of the week: <span className="font-semibold capitalize text-fg">{dayOfWeekLabel}</span>
            </p>
          </div>

          <div className="w-full rounded-[2.5rem] bg-white/85 px-5 py-6 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.32)] backdrop-blur md:px-6 md:py-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg">Symbol</span>
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]">
                    <span className="text-2xl" aria-hidden="true">
                      {selectedSymbol.flag}
                    </span>
                    <span className="text-lg font-semibold tracking-[0.2em] text-fg md:text-xl">
                      {selectedSymbol.code}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSymbolListOpen((prev) => !prev)}
                  className="ml-auto flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-muted-fg shadow-[0_12px_30px_-20px_rgba(15,23,42,0.3)] transition hover:text-fg"
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
                </button>
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  isSymbolListOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex flex-col gap-2 rounded-[1.75rem] bg-white/90 p-2 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.3)]"
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
                          className={`flex w-full items-center gap-4 rounded-2xl px-5 py-3 text-sm font-semibold transition md:text-base ${
                            isActive
                              ? "bg-accent text-white shadow-[0_12px_28px_-16px_rgba(59,130,246,0.35)]"
                              : "bg-transparent text-fg hover:bg-muted/30"
                          }`}
                          onClick={() => handleSelectSymbol(symbol)}
                          aria-selected={isActive}
                          role="option"
                        >
                          <span className="text-2xl" aria-hidden="true">
                            {symbol.flag}
                          </span>
                          <span className="tracking-[0.2em]">{symbol.code}</span>
                          {isActive ? (
                            <span className="ml-auto text-xs font-bold uppercase tracking-[0.3em] text-white/80">
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
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg"
                  >
                    Open Time
                  </label>
                  <button
                    type="button"
                    className="relative flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]"
                    onClick={() => openDateTimePicker(openTimeInputRef.current)}
                  >
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
                  </button>
                  <input
                    id="open-time-input"
                    ref={openTimeInputRef}
                    type="datetime-local"
                    className="sr-only"
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
                </div>

                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="close-time-input"
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-fg"
                  >
                    Close Time
                  </label>
                  <button
                    type="button"
                    className="relative flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_14px_32px_-20px_rgba(15,23,42,0.28)]"
                    onClick={() => openDateTimePicker(closeTimeInputRef.current)}
                  >
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
                  </button>
                  <input
                    id="close-time-input"
                    ref={closeTimeInputRef}
                    type="datetime-local"
                    className="sr-only"
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
                </div>
              </div>
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
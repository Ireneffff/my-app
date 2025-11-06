"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { TakeProfitOutcome } from "@/lib/takeProfitOutcomeStyles";

export type TakeProfitOutcomeValue = TakeProfitOutcome;

type Option = {
  value: TakeProfitOutcomeValue;
  label: string;
};

type TakeProfitOutcomeSelectProps = {
  id: string;
  value: TakeProfitOutcomeValue;
  onChange: (value: TakeProfitOutcomeValue) => void;
  ariaLabelledBy?: string;
  className?: string;
};

const OPTIONS: Option[] = [
  { value: "", label: "Outcome" },
  { value: "profit", label: "Profit" },
  { value: "loss", label: "Loss" },
];

export function TakeProfitOutcomeSelect({
  id,
  value,
  onChange,
  ariaLabelledBy,
  className,
}: TakeProfitOutcomeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = useMemo(() => {
    const index = OPTIONS.findIndex((option) => option.value === value);
    return index === -1 ? 0 : index;
  }, [value]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      const target = event.target as Node | null;

      if (!trigger || !menu || !target) {
        return;
      }

      if (!trigger.contains(target) && !menu.contains(target)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus();
    });
  }, [isOpen, selectedIndex]);

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!isOpen) {
          openMenu();
        }
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (selectedIndex + delta + OPTIONS.length) % OPTIONS.length;
        window.requestAnimationFrame(() => {
          optionRefs.current[nextIndex]?.focus();
        });
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      }
    },
    [closeMenu, isOpen, openMenu, selectedIndex],
  );

  const handleOptionKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (index + delta + OPTIONS.length) % OPTIONS.length;
        optionRefs.current[nextIndex]?.focus();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = OPTIONS[index];
        if (option) {
          onChange(option.value);
        }
        closeMenu();
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    },
    [closeMenu, onChange],
  );

  const handleTriggerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setIsOpen((previous) => !previous);
    },
    [],
  );

  const displayLabel = OPTIONS[selectedIndex]?.label ?? OPTIONS[0].label;

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={
          ariaLabelledBy ? `${ariaLabelledBy} ${id}` : undefined
        }
        className="inline-flex h-8 min-w-[120px] cursor-pointer items-center justify-between gap-2 rounded-full border border-gray-300 bg-white/60 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition-colors duration-200 ease-out hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--surface))]"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className={`h-3 w-3 text-slate-500 transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        ref={menuRef}
        role="listbox"
        aria-labelledby={ariaLabelledBy}
        className={`absolute right-0 z-30 mt-2 min-w-[150px] rounded-2xl border border-gray-200 bg-white/95 p-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-200 ease-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        {OPTIONS.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value || "empty"}
              type="button"
              role="option"
              aria-selected={isSelected}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                isSelected
                  ? "bg-blue-50 text-slate-700"
                  : "text-slate-600 hover:bg-blue-50 hover:text-slate-700"
              }`}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(option.value);
                closeMenu();
                window.requestAnimationFrame(() => {
                  triggerRef.current?.focus();
                });
              }}
            >
              <span>{option.label}</span>
              {isSelected ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="h-4 w-4 text-accent"
                >
                  <path
                    d="M5 10.5L8.5 14L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

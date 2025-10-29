import { type ReactNode } from "react";

const base =
  "w-full rounded-2xl border border-border bg-surface/90 px-4 py-2.5 text-sm text-fg transition-all duration-300 ease-in-out focus:outline-none focus-visible:outline-none appearance-none shadow-[0_12px_26px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]";

type StyledSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
};

export function StyledSelect({
  label,
  value,
  onChange,
  placeholder,
  children,
}: StyledSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase tracking-[0.26em] text-muted-fg">{label}</label>
      <select
        className={`${base} ${value ? "text-fg" : "text-muted-fg"}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {children}
      </select>
    </div>
  );
}

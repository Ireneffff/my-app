import { type ReactNode } from "react";

const base =
  "w-full appearance-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-fg focus:outline-none focus:ring-0";

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
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-fg">
        {label}
      </label>
      <select
        className={base}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={value ? undefined : { color: "rgb(var(--muted-fg) / 0.6)" }}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {children}
      </select>
    </div>
  );
}

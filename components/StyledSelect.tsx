import { type ReactNode } from "react";

const base =
  "w-full rounded-lg border border-gray-200 bg-white text-sm p-2 focus:outline-none focus:ring-2 focus:ring-gray-300 appearance-none";

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
    <div className="mb-4">
      <label className="text-gray-600 text-xs font-medium mb-1 block">{label}</label>
      <select
        className={`${base} ${value ? "text-gray-800" : "text-gray-400"}`}
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

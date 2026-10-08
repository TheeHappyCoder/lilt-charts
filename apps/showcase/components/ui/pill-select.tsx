'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';

export interface PillSelectOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface PillSelectProps<Value extends string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'> {
  /** Accessible name. Visually hidden; use `leading` for a visible cue. */
  label: string;
  value: Value;
  options: readonly PillSelectOption<Value>[];
  onValueChange: (value: Value) => void;
  /** A short glyph or icon before the select, e.g. "Aa". */
  leading?: ReactNode;
  className?: string;
}

/**
 * A compact glass pill around a native select: a quiet leading cue and the current choice. The
 * native control keeps keyboard, screen reader, and mobile pickers for free. Position it yourself,
 * e.g. as a floating setting in a corner.
 */
export function PillSelect<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  leading,
  className,
  ...select
}: PillSelectProps<Value>) {
  return (
    <label className={className ? `lilt-ui-pill-select ${className}` : 'lilt-ui-pill-select'}>
      {leading ? (
        <span className="lilt-ui-pill-select__leading" aria-hidden>
          {leading}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
      <select
        {...select}
        value={value}
        onChange={(event) => onValueChange(event.target.value as Value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

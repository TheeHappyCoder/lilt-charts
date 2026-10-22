'use client';

import Add01Icon from '@hugeicons/core-free-icons/Add01Icon';
import MinusSignIcon from '@hugeicons/core-free-icons/MinusSignIcon';
import { HugeiconsIcon } from '@hugeicons/react';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

/**
 * Settings tiles: one soft tile per setting, its name on the left and its value on the right, laid
 * out in a `FieldGrid`. A range fills its tile as it rises; the whole tile is the slider.
 */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="lilt-field-grid">{children}</div>;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  const id = useId();
  const share = (value - min) / (max - min);
  return (
    <div
      className="lilt-field lilt-field--range"
      style={{ '--lilt-field-share': share } as CSSProperties}
    >
      <span className="lilt-field__fill" aria-hidden="true" />
      <label className="lilt-field__label" htmlFor={id}>
        {label}
      </label>
      <output className="lilt-field__value" htmlFor={id}>
        {format(value)}
      </output>
      <input
        id={id}
        className="lilt-field__range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="lilt-field lilt-field--switch"
      onClick={() => onChange(!checked)}
    >
      <span className="lilt-field__label">{label}</span>
      <span className="lilt-field__switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export function ChoiceField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  const id = useId();
  return (
    <div className="lilt-field lilt-field--choice">
      <label className="lilt-field__label" htmlFor={id}>
        {label}
      </label>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next as Value);
        }}
      >
        <SelectTrigger id={id} className="lilt-field__select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** A run of colours, each a native picker; `min` and `max` bound how many there can be. */
export function ColorsField({
  label,
  value,
  onChange,
  min = 1,
  max = 1,
}: {
  label: string;
  value: readonly string[];
  onChange: (value: string[]) => void;
  min?: number;
  max?: number;
}) {
  const adjustable = max > min;
  return (
    <div className="lilt-field lilt-field--colors" role="group" aria-label={label}>
      <div className="lilt-field__head">
        <span className="lilt-field__label">{label}</span>
        {adjustable ? (
          <span className="lilt-field__steps">
            <button
              type="button"
              aria-label={`Remove a colour from ${label}`}
              disabled={value.length <= min}
              onClick={() => onChange(value.slice(0, -1))}
            >
              <HugeiconsIcon icon={MinusSignIcon} size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label={`Add a colour to ${label}`}
              disabled={value.length >= max}
              onClick={() => onChange([...value, value[value.length - 1] ?? '#ffffff'])}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
            </button>
          </span>
        ) : null}
      </div>
      <div className="lilt-field__swatches">
        {value.map((colour, index) => (
          <label key={index} className="lilt-field__swatch" style={{ background: colour }}>
            <span className="sr-only">
              {label} {index + 1}: {colour}
            </span>
            <input
              type="color"
              value={colour}
              onChange={(event) =>
                onChange(value.map((c, i) => (i === index ? event.target.value : c)))
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** One colour: the tile's value is a swatch that opens the native picker. */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="lilt-field lilt-field--color">
      <label className="lilt-field__label" htmlFor={id}>
        {label}
      </label>
      <span className="lilt-field__value lilt-field__color">
        {value}
        <span className="lilt-field__chip" style={{ background: value }} aria-hidden="true" />
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  );
}

/** A line of text, edited in place: its name on the left, the text on the right. */
export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="lilt-field lilt-field--text">
      <label className="lilt-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="lilt-field__value lilt-field__text"
        type="text"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

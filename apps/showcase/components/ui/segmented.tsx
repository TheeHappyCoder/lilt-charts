'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useId, type ReactNode } from 'react';

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: ReactNode;
}

/**
 * One choice from a few: equal cells in a soft track, with a filled square that glides to the
 * chosen one. Cells wrap onto more rows when the track is too narrow for them all.
 */
export function Segmented<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value | undefined;
  options: readonly SegmentedOption<Value>[];
  onChange: (value: Value) => void;
}) {
  const id = useId();
  const reduced = Boolean(useReducedMotion());
  return (
    <div className="lilt-seg" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className="lilt-seg__option"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {selected ? (
              <motion.span
                aria-hidden="true"
                className="lilt-seg__thumb"
                layoutId={`lilt-seg-${id}`}
                initial={false}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }
                }
              />
            ) : null}
            <span className="lilt-seg__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** On or off: a knob that springs across a track lit in the brand colour. */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="lilt-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="lilt-switch__knob" aria-hidden="true" />
    </button>
  );
}

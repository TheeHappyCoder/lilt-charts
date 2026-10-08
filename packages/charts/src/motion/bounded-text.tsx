import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

interface TextState {
  current: string;
  previous: string | null;
  changedAt: number;
}

export interface BoundedTextProps {
  value: string;
  duration?: number;
  offset?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * A deliberately bounded two-layer text slot. The logical value is always the
 * accessible value; only the visual layers are animated.
 */
export function BoundedText({
  value,
  duration = 160,
  offset = 4,
  className,
  'aria-label': ariaLabel,
}: BoundedTextProps): ReactElement {
  const stateRef = useRef<TextState>({ current: value, previous: null, changedAt: 0 });
  const [, force] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const state = stateRef.current;
    if (duration === 0) {
      state.current = value;
      state.previous = null;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    if (state.current === value) return;
    const now = performance.now();
    const rapid = now - state.changedAt < 75;
    state.previous = rapid ? state.previous : state.current;
    state.current = value;
    state.changedAt = now;
    // The parent already committed the new value. During pointer scrubbing,
    // an extra state commit per value can create an unbounded render chain.
    if (!rapid) force((current) => current + 1);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      stateRef.current.previous = null;
      force((current) => current + 1);
      timerRef.current = null;
    }, duration);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [duration, value]);

  const state = stateRef.current;
  return (
    <span
      aria-label={ariaLabel ?? value}
      className={['lilt-bounded-text', className].filter(Boolean).join(' ')}
      data-value={value}
      style={
        {
          '--lilt-text-duration': `${duration}ms`,
          '--lilt-text-offset': `${offset}px`,
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="lilt-bounded-text__visible">
        {value}
      </span>
      {duration > 0 && state.previous !== null ? (
        <span aria-hidden="true" className="lilt-bounded-text__outgoing">
          {state.previous}
        </span>
      ) : null}
    </span>
  );
}

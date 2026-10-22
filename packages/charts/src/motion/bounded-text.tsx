import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';

interface TextState {
  current: string;
  previous: string | null;
  changedAt: number;
  position: number | undefined;
  /** Bumped per outgoing layer, so each one plays its exit from the start. */
  ghost: number;
  /** Where the outgoing text leaves toward, in pixels. */
  out: readonly [number, number];
}

export interface BoundedTextProps {
  value: string;
  duration?: number;
  offset?: number;
  /**
   * Text that reads a travelling position slides along that axis: a new value comes in from
   * the side the position moved toward, through a light blur, and the old one leaves the other
   * way. Without an axis, a new value rises in from below.
   */
  axis?: 'x' | 'y';
  /** Where the value sits on `axis`: the x of an observation, or the value itself on y. */
  position?: number;
  className?: string;
  'aria-label'?: string;
}

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

/**
 * A deliberately bounded two-layer text slot. The logical value is always the
 * accessible value; only the visual layers are animated.
 */
export function BoundedText({
  value,
  duration = 160,
  offset = 4,
  axis,
  position,
  className,
  'aria-label': ariaLabel,
}: BoundedTextProps): ReactElement {
  const stateRef = useRef<TextState>({
    current: value,
    previous: null,
    changedAt: 0,
    position,
    ghost: 0,
    out: [0, -offset],
  });
  const visibleRef = useRef<HTMLSpanElement>(null);
  const [, force] = useState(0);
  const timerRef = useRef<number | null>(null);

  // A layout effect, so the first painted frame of a new value is already the start of its move.
  useLayoutEffect(() => {
    const state = stateRef.current;
    const from = state.position;
    state.position = position;
    if (duration === 0) {
      state.current = value;
      state.previous = null;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    if (state.current === value) return;
    // Which way the reading travelled: on x, a later observation enters from the right; on y,
    // a higher value enters from above, the way the pill itself moves.
    const step =
      axis && from !== undefined && position !== undefined && Number.isFinite(from - position)
        ? Math.sign(position - from)
        : 0;
    const vector: readonly [number, number] =
      step === 0 ? [0, offset] : axis === 'x' ? [step * offset, 0] : [0, -step * offset];
    const travels = step !== 0;
    const element = visibleRef.current;
    if (element && typeof element.animate === 'function') {
      element.animate(
        [
          {
            opacity: travels ? 0.25 : 0,
            transform: `translate(${vector[0]}px, ${vector[1]}px)`,
            filter: travels ? 'blur(1.5px)' : 'none',
          },
          { opacity: 1, transform: 'translate(0, 0)', filter: 'none' },
        ],
        { duration, easing: EASE },
      );
    }
    const now = performance.now();
    const rapid = now - state.changedAt < 75;
    state.previous = rapid ? state.previous : state.current;
    state.current = value;
    state.changedAt = now;
    if (!rapid) {
      state.out = [-vector[0], -vector[1]];
      state.ghost += 1;
    }
    // The parent already committed the new value. During pointer scrubbing,
    // an extra state commit per value can create an unbounded render chain.
    if (!rapid) force((current) => current + 1);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      stateRef.current.previous = null;
      force((current) => current + 1);
      timerRef.current = null;
    }, duration);
  }, [axis, duration, offset, position, value]);
  useLayoutEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    },
    [],
  );

  const state = stateRef.current;
  return (
    <span
      aria-label={ariaLabel ?? value}
      className={['lilt-bounded-text', className].filter(Boolean).join(' ')}
      data-value={value}
      data-axis={axis}
      style={
        {
          '--lilt-text-duration': `${duration}ms`,
          '--lilt-text-offset': `${offset}px`,
        } as CSSProperties
      }
    >
      <span aria-hidden="true" className="lilt-bounded-text__visible" ref={visibleRef}>
        {value}
      </span>
      {duration > 0 && state.previous !== null ? (
        <span
          aria-hidden="true"
          className="lilt-bounded-text__outgoing"
          key={state.ghost}
          style={
            {
              '--lilt-text-out-x': `${state.out[0]}px`,
              '--lilt-text-out-y': `${state.out[1]}px`,
            } as CSSProperties
          }
        >
          {state.previous}
        </span>
      ) : null}
    </span>
  );
}

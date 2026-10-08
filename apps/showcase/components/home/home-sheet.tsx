'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { StaticSlats } from '@/components/backgrounds/static-slats';

/** Centre line of the sheet's 1px top border; the notch stroke continues it exactly. */
const EDGE = 0.5;
/** The concave join where the sheet's edge turns down into the notch. */
const FILLET = 14;
const RADIUS = 18;
/** Handle length a little past a circular arc, so straight edges flow into curves. */
const SMOOTH = 0.62;

/** The docs shell's notch outline: fillet, side, rounded foot, side, fillet. */
function notchPath(width: number, height: number) {
  const f = FILLET;
  const right = f + width;
  const end = width + 2 * f;
  const foot = height - 0.5;
  const r = Math.max(0, Math.min(RADIUS, foot - EDGE - f));
  return [
    `M 0 ${EDGE}`,
    `C ${SMOOTH * f} ${EDGE} ${f} ${EDGE + f - SMOOTH * f} ${f} ${EDGE + f}`,
    `V ${foot - r}`,
    `C ${f} ${foot - r + SMOOTH * r} ${f + r - SMOOTH * r} ${foot} ${f + r} ${foot}`,
    `H ${right - r}`,
    `C ${right - r + SMOOTH * r} ${foot} ${right} ${foot - r + SMOOTH * r} ${right} ${foot - r}`,
    `V ${EDGE + f}`,
    `C ${right} ${EDGE + f - SMOOTH * f} ${end - SMOOTH * f} ${EDGE} ${end} ${EDGE}`,
  ].join(' ');
}

function footPath(width: number, height: number) {
  const f = FILLET;
  const right = f + width;
  const foot = height - 0.5;
  const r = Math.max(0, Math.min(RADIUS, foot - EDGE - f));
  return [
    `M ${f} ${foot - r}`,
    `C ${f} ${foot - r + SMOOTH * r} ${f + r - SMOOTH * r} ${foot} ${f + r} ${foot}`,
    `H ${right - r}`,
    `C ${right - r + SMOOTH * r} ${foot} ${right} ${foot - r + SMOOTH * r} ${right} ${foot - r}`,
  ].join(' ');
}

interface HomeSheetProps {
  /** What hangs in the notch: the sheet's own instruments and tools. */
  notch: ReactNode;
  children: ReactNode;
  className?: string;
  label?: string;
}

/**
 * The docs shell, brought to the home page: one sheet with a hairline edge, the site's slats in
 * its corner, and a notch hanging from its top edge that carries the sheet's tools. The notch
 * outline is measured from what it holds, so it always fits.
 */
export function HomeSheet({ notch, children, className, label }: HomeSheetProps) {
  const rest = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const lightId = useId();

  useLayoutEffect(() => {
    const element = rest.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: Math.ceil(element.offsetWidth), height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={['lilt-home-sheet', className].filter(Boolean).join(' ')}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      <div className="lilt-home-sheet__surface" aria-hidden="true">
        <StaticSlats className="lilt-home-sheet__slats" />
      </div>
      <div
        className="lilt-home-notch"
        data-ready={size ? '' : undefined}
        style={size ? { width: size.width + 2 * FILLET, height: size.height } : undefined}
      >
        {size ? (
          <svg className="lilt-home-notch__shape" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id={lightId}>
                <stop offset="0" className="lilt-home-notch__light-a" stopOpacity="0" />
                <stop offset="0.25" className="lilt-home-notch__light-a" />
                <stop offset="0.75" className="lilt-home-notch__light-b" />
                <stop offset="1" className="lilt-home-notch__light-b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="lilt-home-notch__fill" d={notchPath(size.width, size.height)} />
            <path className="lilt-home-notch__stroke" d={notchPath(size.width, size.height)} />
            <path
              className="lilt-home-notch__light"
              d={footPath(size.width, size.height)}
              stroke={`url(#${lightId})`}
            />
          </svg>
        ) : null}
        <div ref={rest} className="lilt-home-notch__rest">
          {notch}
        </div>
      </div>
      <div className="lilt-home-sheet__body">{children}</div>
    </div>
  );
}

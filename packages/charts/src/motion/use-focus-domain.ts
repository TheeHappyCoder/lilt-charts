import { useLayoutEffect, useRef, useState } from 'react';

export interface DomainFrame {
  x: readonly [number, number];
  y: readonly [number, number];
}

export function interpolateDomain(
  from: DomainFrame,
  to: DomainFrame,
  progress: number,
): DomainFrame {
  const t = Math.max(0, Math.min(1, progress));
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    x: [mix(from.x[0], to.x[0]), mix(from.x[1], to.x[1])],
    y: [mix(from.y[0], to.y[0]), mix(from.y[1], to.y[1])],
  };
}

/** One numerical clock for every spatial channel of a focus transition. */
export function useFocusDomain(
  target: DomainFrame | null,
  focusKey: string,
  dataIdentity: unknown,
  sizeKey: string,
  reducedMotion: boolean,
): DomainFrame | null {
  const [frame, setFrame] = useState<DomainFrame | null>(null);
  const displayed = useRef<DomainFrame | null>(null);
  const previous = useRef<{ focusKey: string; dataIdentity: unknown; sizeKey: string } | null>(
    null,
  );
  const activeFrame = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (activeFrame.current !== null) cancelAnimationFrame(activeFrame.current);
    activeFrame.current = null;
    const last = previous.current;
    previous.current = { focusKey, dataIdentity, sizeKey };
    if (!target) {
      displayed.current = null;
      setFrame(null);
      return;
    }
    const from = displayed.current;
    if (
      !last ||
      last.focusKey === focusKey ||
      last.dataIdentity !== dataIdentity ||
      last.sizeKey !== sizeKey ||
      reducedMotion ||
      !from
    ) {
      displayed.current = target;
      setFrame(null);
      return;
    }
    setFrame(from);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.max(0, Math.min(1, (now - start) / 420));
      const eased = 1 - Math.pow(1 - elapsed, 4);
      const next = interpolateDomain(from, target, eased);
      displayed.current = next;
      if (elapsed >= 1) {
        setFrame(null);
        activeFrame.current = null;
      } else {
        setFrame(next);
        activeFrame.current = requestAnimationFrame(tick);
      }
    };
    activeFrame.current = requestAnimationFrame(tick);
    return () => {
      if (activeFrame.current !== null) cancelAnimationFrame(activeFrame.current);
      activeFrame.current = null;
    };
  }, [
    target?.x[0],
    target?.x[1],
    target?.y[0],
    target?.y[1],
    focusKey,
    dataIdentity,
    sizeKey,
    reducedMotion,
  ]);

  return frame;
}

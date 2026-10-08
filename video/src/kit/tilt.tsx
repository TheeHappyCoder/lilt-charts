import { useRef, type ReactNode } from 'react';
import { useFrameStyle } from './overlay';
import { lerp, progress, travel } from './runtime';

/** A table-top tilt of the whole stage: `rx` leans it back, `rz` turns it. Ends at `t`. */
export interface TiltKey {
  t: number;
  rx: number;
  rz: number;
  /** Lift toward the viewer, px, so a tilted wall does not shrink. */
  z?: number;
  move?: number;
}

export function tiltAt(keys: readonly TiltKey[], t: number) {
  let index = keys.findIndex((key) => key.t > t);
  if (index === -1) index = keys.length;
  const previous = keys[index - 1] ?? keys[0]!;
  const next = keys[index];
  if (!next) return previous;
  const k = travel(progress(t, next.t - (next.move ?? next.t - previous.t), next.t));
  return {
    t,
    rx: lerp(previous.rx, next.rx, k),
    rz: lerp(previous.rz, next.rz, k),
    z: lerp(previous.z ?? 0, next.z ?? 0, k),
  };
}

export function Tilt({ keys, children }: { keys: readonly TiltKey[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrameStyle(ref, (t, element) => {
    const tilt = tiltAt(keys, t);
    const flat =
      Math.abs(tilt.rx) < 0.01 && Math.abs(tilt.rz) < 0.01 && Math.abs(tilt.z ?? 0) < 0.01;
    // Flat frames carry no transform at all, so hover hit-testing is exact.
    element.style.transform = flat
      ? ''
      : `translateZ(${tilt.z ?? 0}px) rotateX(${tilt.rx}deg) rotateZ(${tilt.rz}deg)`;
  });
  return (
    <div className="film-tilt">
      <div className="film-tilt__plane" ref={ref}>
        {children}
      </div>
    </div>
  );
}

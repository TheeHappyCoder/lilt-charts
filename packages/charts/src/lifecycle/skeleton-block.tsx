import type { CSSProperties } from 'react';

/** A neutral HTML bar; its container chooses motion and flat or solid paint. */
export function SkeletonBlock({
  width = '100%',
  height,
  step = 0,
}: {
  width?: string;
  height?: number;
  step?: number;
}) {
  return (
    <span
      className="lilt-skeleton__block"
      style={{ width, height, '--lilt-skeleton-step': step } as CSSProperties}
    />
  );
}

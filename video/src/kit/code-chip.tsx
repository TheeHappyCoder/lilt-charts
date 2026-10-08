import { useRef, type ReactNode } from 'react';
import { rise, useFrameStyle } from './overlay';

/**
 * A floating line of code that rises in for `show` and leaves after. Children are spans with
 * the `film-code__*` token classes; `off` marks the highlighted token as switched off.
 */
export function CodeChip({
  show,
  off,
  children,
}: {
  show: [number, number];
  off?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrameStyle(ref, (t, element) => {
    const phase = rise(t, show[0], show[1], 520, 320);
    element.style.visibility = phase.visible ? 'visible' : 'hidden';
    element.style.transform = `translate3d(-50%, ${phase.y * 0.4}%, 0)`;
    element.style.filter = phase.blur ? `blur(${phase.blur}px)` : '';
    element.style.opacity = String(phase.opacity);
  });
  return (
    <div className="film-code" ref={ref} data-off={off || undefined}>
      {children}
    </div>
  );
}

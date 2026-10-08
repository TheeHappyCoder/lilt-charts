import { useRef } from 'react';
import { useFrameStyle } from './overlay';
import { clamp01, easeOut, lerp, progress } from './runtime';

export interface PropChange {
  t: number;
  /** The prop as written, e.g. `palette`. A bare flag has no value. */
  name: string;
  value?: string;
  /** The element it's written on. Defaults to `Card`; `html` closes with `>`. */
  tag?: string;
  /** Print the value as an expression, `yaw={120}`, instead of a string. */
  raw?: boolean;
}

/**
 * The prop that just changed, as one line of code. Each change rolls the line up with a short
 * blur, and the pill eases to the new line's width.
 */
export function PropTicker({
  changes,
  show,
}: {
  changes: readonly PropChange[];
  show: [number, number];
}) {
  const box = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const lines = useRef<HTMLSpanElement[]>([]);
  useFrameStyle(box, (t, element) => {
    const visible = t >= show[0] && t < show[1];
    const enter = easeOut(progress(t, show[0], show[0] + 420));
    const exit = easeOut(progress(t, show[1] - 240, show[1]));
    element.style.visibility = visible ? 'visible' : 'hidden';
    element.style.opacity = String(clamp01(enter * (1 - exit)));
    element.style.transform = `translate3d(-50%, ${(1 - enter) * 14 - exit * 8}px, 0) scale(${0.96 + enter * 0.04})`;

    let current = 0;
    for (let i = 0; i < changes.length; i += 1) if (t >= changes[i]!.t) current = i;
    const k =
      current > 0 ? easeOut(progress(t, changes[current]!.t, changes[current]!.t + 260)) : 1;
    const width = (i: number) => lines.current[i]?.offsetWidth ?? 0;
    if (slot.current) {
      const from = current > 0 ? width(current - 1) : width(0);
      slot.current.style.width = `${lerp(from, width(current), k)}px`;
    }
    lines.current.forEach((line, i) => {
      if (i === current) {
        line.style.visibility = 'visible';
        line.style.transform = `translate3d(-50%, ${(1 - k) * 70}%, 0)`;
        line.style.opacity = String(k);
        line.style.filter = k < 0.98 ? `blur(${(1 - k) * 4}px)` : '';
      } else if (i === current - 1 && k < 1) {
        line.style.visibility = 'visible';
        line.style.transform = `translate3d(-50%, ${-k * 70}%, 0)`;
        line.style.opacity = String(1 - k);
        line.style.filter = `blur(${k * 4}px)`;
      } else {
        line.style.visibility = 'hidden';
      }
    });
  });
  return (
    <div className="film-ticker" ref={box} aria-hidden>
      <span className="film-ticker__slot" ref={slot}>
        {changes.map((change, i) => {
          const tag = change.tag ?? 'Card';
          return (
            <span
              className="film-ticker__line"
              key={i}
              ref={(element) => {
                if (element) lines.current[i] = element;
              }}
            >
              <span className="film-ticker__punct">&lt;</span>
              <span className="film-ticker__tag">{tag}</span>{' '}
              <span className="film-ticker__name">{change.name}</span>
              {change.value === undefined ? null : (
                <>
                  <span className="film-ticker__punct">=</span>
                  <span className="film-ticker__value">
                    {change.raw ? `{${change.value}}` : `"${change.value}"`}
                  </span>
                </>
              )}
              <span className="film-ticker__punct">{tag === 'html' ? '>' : ' />'}</span>
            </span>
          );
        })}
      </span>
    </div>
  );
}

import { useRef } from 'react';
import { rise, useFrameStyle } from './overlay';

export interface CaptionLine {
  from: number;
  to: number;
  text: string;
}

function Caption({ line }: { line: CaptionLine }) {
  const ref = useRef<HTMLSpanElement>(null);
  useFrameStyle(ref, (t, element) => {
    const phase = rise(t, line.from, line.to);
    element.style.visibility = phase.visible ? 'visible' : 'hidden';
    element.style.transform = `translate3d(0, ${phase.y}%, 0)`;
    element.style.filter = phase.blur ? `blur(${phase.blur}px)` : '';
    element.style.opacity = String(phase.opacity);
  });
  return (
    <span className="film-caption__line" ref={ref}>
      {line.text}
    </span>
  );
}

/** Lower-third captions, each rising out of its own mask line. */
export function Captions({ lines }: { lines: CaptionLine[] }) {
  const scrim = useRef<HTMLDivElement>(null);
  useFrameStyle(scrim, (t, element) => {
    // A soft floor of shade under whichever caption is up, so type never sits on axis labels.
    const strength = Math.max(
      0,
      ...lines.map((line) => rise(t, line.from - 120, line.to + 120, 520, 360).opacity),
    );
    element.style.opacity = String(strength);
  });
  return (
    <div className="film-caption" aria-hidden>
      <div className="film-caption__scrim" ref={scrim} />
      {lines.map((line) => (
        <span className="film-caption__mask" key={line.text}>
          <Caption line={line} />
        </span>
      ))}
    </div>
  );
}

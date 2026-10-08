import { useRef } from 'react';
import { clamp01, easeOut, progress } from './runtime';
import { rise, useFrameStyle } from './overlay';

function Piece({
  at,
  children,
  className,
}: {
  at: number;
  children: React.ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFrameStyle(ref, (t, element) => {
    const phase = rise(t, at, Infinity, 620);
    element.style.visibility = phase.visible ? 'visible' : 'hidden';
    element.style.transform = `translate3d(0, ${phase.y * 0.3}px, 0)`;
    element.style.filter = phase.blur ? `blur(${phase.blur}px)` : '';
    element.style.opacity = String(phase.opacity);
  });
  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}

export interface EndCardProps {
  from: number;
  line: string;
  install?: string;
  url?: string;
}

/** The lockup: the stage sinks behind a veil, the mark and name rise in a short stagger. */
export function EndCard({
  from,
  line,
  install = 'pnpm add @lilt-ui/charts',
  url = 'liltui.vercel.app',
}: EndCardProps) {
  const veil = useRef<HTMLDivElement>(null);
  useFrameStyle(veil, (t, element) => {
    const k = easeOut(progress(t, from, from + 1100));
    element.style.opacity = String(clamp01(k));
    element.style.backdropFilter = `blur(${k * 10}px)`;
    element.style.visibility = t >= from ? 'visible' : 'hidden';
  });
  return (
    <div className="film-end" aria-hidden>
      <div className="film-end__veil" ref={veil} />
      <div className="film-end__stack">
        <Piece at={from + 350} className="film-end__mark">
          <svg viewBox="31 26 254 345" width="46" height="62">
            <path
              fill="currentColor"
              d="M31 65.5A39.5 39.5 0 0 1 110 65.5L110 255C110 278 130 294 148 294C172 294 214 262 214 222L214 184A35.5 35.5 0 0 1 285 184L285 292Q285 302 277 303L268 305C260 306.5 255 309 250 314L236 331C210 358 180 370.5 143 370.5A112 112 0 0 1 31 258.5Z"
            />
            <path fill="#7c5cff" d="M285.3 94A35.3 35.3 0 1 1 214.7 94A35.3 35.3 0 1 1 285.3 94Z" />
          </svg>
        </Piece>
        <Piece at={from + 450} className="film-end__name">
          Lilt Charts
        </Piece>
        <Piece at={from + 560} className="film-end__line">
          {line}
        </Piece>
        <Piece at={from + 760} className="film-end__install">
          <span className="film-end__prompt">$</span> {install}
        </Piece>
        <Piece at={from + 860} className="film-end__url">
          {url}
        </Piece>
      </div>
    </div>
  );
}

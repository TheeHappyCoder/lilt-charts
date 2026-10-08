import { useLayoutEffect, useRef } from 'react';
import { film, onFrame } from './runtime';

/** The visible cursor: drawn where the real pointer is, pressing in on clicks. */
export function Cursor({ scale = 1 }: { scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let press = 0;
    return onFrame(() => {
      const pointer = film.pointer();
      const element = ref.current;
      if (!element) return;
      if (!pointer) {
        element.style.opacity = '0';
        return;
      }
      // Press eases toward its target so a click reads as a short squeeze.
      press += ((pointer.down ? 1 : 0) - press) * 0.45;
      element.style.opacity = '1';
      element.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) scale(${scale * Math.pow(film.zoom, 0.5) * (1 - press * 0.14)})`;
    });
  }, [scale]);
  return (
    <div className="film-cursor" ref={ref} aria-hidden>
      <svg width="26" height="30" viewBox="0 0 26 30">
        <path
          d="M3 2.2 L3 23.4 Q3 25 4.3 24 L9.2 19.6 L12.9 27.6 Q13.5 28.8 14.7 28.3 L17.3 27.1 Q18.4 26.5 17.9 25.4 L14.3 17.6 L21.2 17.3 Q22.8 17.2 21.6 16 L4.6 1.3 Q3 0.1 3 2.2 Z"
          fill="#fff"
          stroke="#111"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

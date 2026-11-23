'use client';

import { useRef, type ReactNode } from 'react';

/**
 * A row of links with one highlight that slides to whichever link is under the pointer or has
 * focus. The current link keeps its own fill, so the page you are on always reads.
 */
export function NavPill({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** The navigation landmark's name. */
  label: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const move = (target: EventTarget | null) => {
    const track = ref.current;
    const link = (target as Element | null)?.closest?.('a');
    if (!track || !link || !track.contains(link)) return;
    const first = track.dataset.on !== 'true';
    track.style.setProperty('--x', `${link.offsetLeft}px`);
    track.style.setProperty('--w', `${link.offsetWidth}px`);
    // The first time in, appear in place rather than sliding over from the left edge.
    if (first) {
      track.dataset.snap = 'true';
      void track.offsetWidth;
      delete track.dataset.snap;
    }
    track.dataset.on = 'true';
  };
  const leave = () => {
    if (ref.current) ref.current.dataset.on = 'false';
  };
  return (
    <nav
      ref={ref}
      aria-label={label}
      className={['lilt-pill-nav', className].filter(Boolean).join(' ')}
      onPointerOver={(event) => move(event.target)}
      onFocus={(event) => move(event.target)}
      onPointerLeave={leave}
      onBlur={leave}
    >
      <span className="lilt-pill-nav__ind" aria-hidden="true" />
      {children}
    </nav>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import type { DocExample } from '@/lib/card-docs/examples';

/**
 * A live card drawn at a comfortable width and scaled down to fit its tile, so a gallery shows
 * each chart as it really looks rather than squeezed. It mounts once the tile nears the screen.
 */
export function FittedPreview({
  example,
  width = 440,
  eager = false,
  fit = 'contain',
}: {
  example: DocExample;
  /** The width the card is laid out at before it is scaled to the tile. */
  width?: number;
  /** Mount straight away, for tiles in the first screen. */
  eager?: boolean;
  /**
   * `contain` shows the whole card; `peek` lets it rise from the tile's floor at a readable size,
   * its foot running out of view, as if looking into the room the chart sits in.
   */
  fit?: 'contain' | 'peek';
}) {
  const frame = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    if (visible) return;
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const outer = frame.current;
    const inner = card.current;
    if (!outer || !inner) return;
    const measure = () => {
      const room = outer.getBoundingClientRect();
      const natural = { width: inner.offsetWidth, height: inner.offsetHeight };
      if (!natural.width || !natural.height) return;
      setScale(
        fit === 'peek'
          ? Math.min(1, (room.width * 0.86) / natural.width)
          : Math.min(1, room.width / natural.width, room.height / natural.height),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  }, [visible, fit]);

  return (
    <div ref={frame} className="lilt-fitted" data-fit={fit} aria-hidden="true" inert>
      {visible ? (
        <div
          ref={card}
          className="lilt-fitted__card"
          data-ready={scale !== null || undefined}
          style={{
            width,
            transform:
              fit === 'peek'
                ? `translateX(-50%) scale(${scale ?? 1})`
                : `translate(-50%, -50%) scale(${scale ?? 1})`,
          }}
        >
          <CardExamplePreview example={example} />
        </div>
      ) : null}
    </div>
  );
}

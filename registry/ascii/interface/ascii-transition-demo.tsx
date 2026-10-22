'use client';

import { useEffect, useState } from 'react';
import { AsciiTransition, type AsciiTransitionProps } from './ascii-transition';

export interface AsciiTransitionDemoProps extends Omit<AsciiTransitionProps, 'id' | 'children'> {
  /** Seconds each slide stays before the next. Default 3.5. */
  interval?: number;
}

const SLIDES = [
  { title: 'Draw', body: 'Pictures made of type, painted on a canvas a frame at a time.' },
  { title: 'Move', body: 'Every scene runs on a steady clock and rests when it is off screen.' },
  { title: 'Ship', body: 'Named exports, strict types and nothing to install beyond React.' },
];

/**
 * Three slides that change every few seconds and on click, through an `AsciiTransition`. For
 * trying the transition without wiring up your own content.
 */
export function AsciiTransitionDemo({ interval = 3.5, ...props }: AsciiTransitionDemoProps) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      Math.max(1, interval) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [index, interval]);
  const slide = SLIDES[index]!;
  const accent = props.color ?? '#8b6cff';

  return (
    <button
      type="button"
      aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${slide.title}. Show the next slide.`}
      onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
      style={{
        display: 'block',
        padding: 0,
        border: 0,
        background: 'none',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <AsciiTransition id={String(index)} {...props}>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            gap: 12,
            width: 340,
            height: 210,
            padding: '22px 24px',
            boxSizing: 'border-box',
            border: '1px solid color-mix(in srgb, currentColor 16%, transparent)',
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <span style={{ fontSize: 12, letterSpacing: '0.08em', opacity: 0.55 }}>
            {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </span>
          <span style={{ display: 'grid', alignContent: 'end', gap: 8 }}>
            <strong style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, color: accent }}>
              {slide.title}
            </strong>
            <span style={{ lineHeight: 1.55, opacity: 0.72 }}>{slide.body}</span>
          </span>
          <span aria-hidden="true" style={{ fontSize: 12, opacity: 0.5 }}>
            {SLIDES.map((_, i) => (i === index ? '[#]' : '[ ]')).join(' ')}
          </span>
        </div>
      </AsciiTransition>
    </button>
  );
}

'use client';

import { useRef } from 'react';
import { AsciiScrollMeter, type AsciiScrollMeterProps } from './ascii-scroll-meter';

const PARAGRAPHS = [
  'Lilt draws charts that feel alive, and scenes made of type for the pages people land on.',
  'Every scene is a small world with its own clock. It fills its parent, takes its ink from the text colour, and rests when it scrolls out of sight.',
  'Components are complete pieces rather than primitives: a board that flips, a log that streams, a rail that tells you how the month went.',
  'Copy any of them into your project with the shadcn CLI. The source is yours from then on, to change as you like.',
  'The meter on the right fills as you read. Its leading cell scrambles like a cursor, and while you scroll it tells you how far through you are.',
  'Reduced motion is respected everywhere: scenes hold a still frame, text appears at once, and nothing slides.',
  'That is the end. Scroll back up and watch it drain.',
];

/** A scrolling article with a meter along its edge, to try the meter inside a box. */
export function AsciiScrollMeterDemo(props: Omit<AsciiScrollMeterProps, 'target'>) {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', width: 'min(520px, 100%)', height: 320 }}>
      <div
        ref={scroller}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: '8px 36px 8px 8px',
          scrollbarWidth: 'none',
        }}
      >
        {PARAGRAPHS.map((text, i) => (
          <p key={i} style={{ margin: '0 0 22px', lineHeight: 1.7, opacity: 0.8 }}>
            {text}
          </p>
        ))}
        <div style={{ height: 120 }} />
      </div>
      <AsciiScrollMeter {...props} target={scroller} />
    </div>
  );
}

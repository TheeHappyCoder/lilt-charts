'use client';

import { AsciiFrame, type AsciiFrameProps } from './ascii-frame';

/** A small card in an `AsciiFrame`, for trying the frame without bringing your own content. */
export function AsciiFrameDemo(props: Omit<AsciiFrameProps, 'children'>) {
  const accent = props.color ?? '#8b6cff';
  return (
    <AsciiFrame {...props}>
      <div style={{ display: 'grid', gap: 10, width: 264, fontSize: 14 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.08em', opacity: 0.55 }}>NEW IN 0.1</span>
        <strong style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.25 }}>
          Pictures made of type
        </strong>
        <p style={{ margin: 0, lineHeight: 1.55, opacity: 0.68 }}>
          Living ASCII for the pages people land on. Drop one in and it fills the space.
        </p>
        <button
          type="button"
          style={{
            justifySelf: 'start',
            marginTop: 8,
            padding: '8px 14px',
            border: 0,
            borderRadius: 6,
            background: accent,
            color: '#fff',
            font: 'inherit',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Get started -&gt;
        </button>
      </div>
    </AsciiFrame>
  );
}

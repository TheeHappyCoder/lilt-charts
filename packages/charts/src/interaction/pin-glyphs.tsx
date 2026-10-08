import type { ReactElement } from 'react';

// Drawn a unit below the box's centre: the head carries the weight, so this reads as centred.
const PIN = 'M9 4.5h6l-1 5 3 3v2H7v-2l3-3-1-5ZM12 14.5v7';

function Glyph({ release }: { release?: boolean }) {
  return (
    <svg
      className={
        release ? 'lilt-chart__pin-glyph lilt-chart__pin-glyph--release' : 'lilt-chart__pin-glyph'
      }
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={release ? `${PIN}M4.5 5.5l15 15` : PIN}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/**
 * Lilt's pin, shared by every control that pins something. With `release`, the struck-through
 * pin waits underneath and takes over on hover or focus, meaning "unpin".
 */
export function PinGlyphs({ release = false }: { release?: boolean }): ReactElement {
  return (
    <>
      <Glyph />
      {release ? <Glyph release /> : null}
    </>
  );
}

'use client';

import type { ReactNode } from 'react';

/** Keep both glyphs mounted so success and reset can crossfade without changing the slot. */
export function IconSwap({
  active,
  initial,
  alternate,
}: {
  active: boolean;
  initial: ReactNode;
  alternate: ReactNode;
}) {
  return (
    <span
      className="t-icon-swap lilt-ui-icon-swap"
      data-state={active ? 'b' : 'a'}
      aria-hidden="true"
    >
      <span className="t-icon" data-icon="a">
        {initial}
      </span>
      <span className="t-icon" data-icon="b">
        {alternate}
      </span>
    </span>
  );
}

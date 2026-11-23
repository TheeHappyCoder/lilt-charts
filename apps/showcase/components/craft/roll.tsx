/**
 * Hover details for buttons and links. Both are plain markup: the motion is CSS in craft.css,
 * driven by the hover or focus of whatever link or button they sit inside.
 */

/** A label that rolls up and out while a copy of it rolls in from below. */
export function Roll({ children }: { children: string }) {
  return (
    <span className="lilt-roll">
      <span>{children}</span>
      <span aria-hidden="true">{children}</span>
    </span>
  );
}

function ArrowIcon({ direction }: { direction: 'up-right' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d={direction === 'right' ? 'M2.5 7h9M8 3.5 11.5 7 8 10.5' : 'M4 10 10 4M5 4h5v5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * An arrow that leaves as a second one arrives: to the top right and in from the bottom left, or,
 * pointing `right`, out to the right and in from the left.
 */
export function ArrowSwap({ direction = 'up-right' }: { direction?: 'up-right' | 'right' }) {
  return (
    <span className="lilt-swap" data-direction={direction} aria-hidden="true">
      <ArrowIcon direction={direction} />
      <ArrowIcon direction={direction} />
    </span>
  );
}

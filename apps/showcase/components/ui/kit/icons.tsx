/**
 * The small strokes the kit draws with: a check (its path length is 1, so CSS can draw it in) and
 * a chevron.
 */

export function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
      <path
        d="M2.5 6.5 5 9l4.5-6"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Points down; turn it with CSS for the other ways. */
export function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
      <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Status icons. A badge or chip never uses a plain dot to say what state something is in: it gets
 * an icon that means it, a tick for live and a slowly turning dashed ring for in progress.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number, className?: string) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 14 14',
    fill: 'none',
    'aria-hidden': true,
    className: ['lilt-ico', className].filter(Boolean).join(' '),
  }) as const;

/** Done, live, shipped. */
export function IconLive({ size = 12, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path
        d="M3 7.2 5.8 10 11 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ready for you: a tick inside a ring. */
export function IconAvailable({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4.6 7.2 6.3 8.9 9.5 5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Under way, or new and still settling: a dashed ring that turns slowly. */
export function IconProgress({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, ['lilt-ico-spin', className].filter(Boolean).join(' '))}>
      <circle
        cx="7"
        cy="7"
        r="5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2.4 3.25"
      />
    </svg>
  );
}

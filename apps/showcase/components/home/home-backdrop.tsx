const COLUMNS = 72;
const CELLS = 22;
const CELL = 8;
const GAP = 4;
const WIDTH = 14;

/** A smooth, deterministic level for each column: two slow swells and a quicker ripple. */
const levelAt = (index: number) => {
  const t = index / (COLUMNS - 1);
  const swell =
    0.55 + 0.25 * Math.sin(t * Math.PI * 2.2 + 0.6) + 0.12 * Math.sin(t * Math.PI * 7.1);
  const ripple = 0.08 * Math.sin(index * 1.7) * Math.cos(index * 0.37);
  return Math.max(0.12, Math.min(1, swell + ripple));
};

/**
 * The hero's ground: Lilt's level meter, very large and very quiet. Columns of segmented cells
 * rise once from the floor in the default palette's hues, sweeping left to right, fading out
 * toward the edges and up behind the words. It is drawn, not fetched, so the server renders it whole.
 */
export function HomeBackdrop() {
  const height = CELLS * (CELL + GAP);
  const width = COLUMNS * (WIDTH + GAP);
  return (
    <div className="lilt-backdrop" aria-hidden="true">
      <div className="lilt-backdrop__glow" />
      <svg
        className="lilt-backdrop__meter"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="lilt-backdrop-ink"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={width}
            y2="0"
          >
            <stop offset="0" stopColor="#1d9bf0" />
            <stop offset="0.3" stopColor="#7c5cff" />
            <stop offset="0.5" stopColor="#3cc98f" />
            <stop offset="0.72" stopColor="#f0459a" />
            <stop offset="1" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        {Array.from({ length: COLUMNS }, (_, column) => {
          const lit = Math.round(levelAt(column) * CELLS);
          return (
            <g
              key={column}
              className="lilt-backdrop__column"
              style={{ '--i': Math.abs(column - COLUMNS / 2) } as React.CSSProperties}
            >
              {Array.from({ length: lit }, (_, cell) => (
                <rect
                  key={cell}
                  x={column * (WIDTH + GAP)}
                  y={height - (cell + 1) * (CELL + GAP)}
                  width={WIDTH}
                  height={CELL}
                  rx={2}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

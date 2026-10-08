/** A quiet field of chart bars, drawn here so the website owns its background artwork. */
export function HomeBackdrop() {
  return (
    <div className="lilt-home__backdrop" aria-hidden="true">
      <svg
        className="lilt-home__field"
        viewBox="0 0 1440 720"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {Array.from({ length: 32 }, (_, row) =>
          Array.from({ length: 76 }, (_, column) => {
            const wave = Math.sin(column * 0.16 + row * 0.24);
            const height = 5 + (wave + 1) * 6;
            return (
              <rect
                key={`${row}-${column}`}
                x={column * 24 - row * 9}
                y={row * 28 - height}
                width="3"
                height={height}
                rx="1.5"
                opacity={0.2 + (wave + 1) * 0.14}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

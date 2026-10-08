/** Fixed hero-style tiles, grouped into twelve shades without client code or an animation loop. */
const slats = (() => {
  const shades: string[] = Array.from({ length: 12 }, () => '');
  for (let row = 0; row < 10; row += 1) {
    for (let column = 0; column < 53; column += 1) {
      // Light moves across the grid in a broad crest; the tiles stay upright and evenly spaced.
      const crest = 4.5 + Math.sin(column * 0.12) * 2.2;
      const light = Math.exp(-Math.pow((row - crest) / 2.1, 2));
      const ripple = (Math.sin(column * 0.22 + row * 0.55) + 1) * 0.08;
      const shade = Math.min(11, Math.round((light * 0.84 + ripple) * 11));
      const x = column * 13;
      const y = row * 28;
      // A 10 × 24 rounded tile with a three-pixel radius, matching the hero's proportions.
      shades[shade] += `M${x + 3},${y}h4q3,0 3,3v18q0,3 -3,3h-4q-3,0 -3,-3v-18q0,-3 3,-3Z`;
    }
  }
  return shades;
})();

export function StaticSlats({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 680 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      {slats.map((d, index) => (
        <path key={index} d={d} opacity={0.12 + index * 0.046} />
      ))}
    </svg>
  );
}

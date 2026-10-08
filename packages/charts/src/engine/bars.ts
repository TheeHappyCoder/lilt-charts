export interface BarGeometry {
  /** Original observation identity, never a pixel coordinate. */
  valueX: number;
  x: number;
  y: number;
  width: number;
  height: number;
  baseline: number;
  negative: boolean;
}

/** Preserve real time/numeric spacing, including gaps, while keeping edge bars inside the plot. */
export function barSpacing(values: readonly number[], span: number, width: number) {
  let step = Infinity;
  for (let index = 1; index < values.length; index += 1) {
    step = Math.min(step, values[index] - values[index - 1]);
  }
  const slot =
    values.length <= 1 || !Number.isFinite(step) || span <= 0
      ? width
      : (width * step) / (span + step);
  return { inset: slot / 2, slot, groupWidth: Math.min(64, slot * 0.72) };
}

/** Whether a later nonempty segment covers this segment's value end. */
export function hasStackedSuccessor(
  geometry: Readonly<Record<string, readonly BarGeometry[]>>,
  seriesIds: readonly string[],
  seriesId: string,
  bar: BarGeometry,
): boolean {
  const index = seriesIds.indexOf(seriesId);
  return seriesIds
    .slice(index + 1)
    .some((id) =>
      geometry[id]?.some(
        (next) => next.valueX === bar.valueX && next.negative === bar.negative && next.height > 0,
      ),
    );
}

/** Round exposed value ends or both ends; trim covered ends to create deliberate gaps. */
export function barPath(
  bar: BarGeometry,
  progress = 1,
  options: {
    originY?: number;
    roundValueEnd?: boolean;
    roundBothEnds?: boolean;
    radius?: number;
    valueGap?: number;
  } = {},
): string {
  const { x, width, baseline, negative } = bar;
  let height = bar.height * progress;
  const origin = options.originY ?? baseline;
  let y = origin + (bar.y - origin) * progress;
  const trim = Math.min(options.valueGap ?? 0, height / 2);
  if (negative) height -= trim;
  else {
    y += trim;
    height -= trim;
  }
  const right = x + width;
  const bottom = y + height;
  const radius =
    options.roundValueEnd === false && !options.roundBothEnds
      ? 0
      : Math.min(options.radius ?? 3, width / 2, height / 2);
  if (radius === 0) return `M${x},${y}H${right}V${bottom}H${x}Z`;
  if (options.roundBothEnds) {
    return `M${x + radius},${y}H${right - radius}Q${right},${y} ${right},${y + radius}V${bottom - radius}Q${right},${bottom} ${right - radius},${bottom}H${x + radius}Q${x},${bottom} ${x},${bottom - radius}V${y + radius}Q${x},${y} ${x + radius},${y}Z`;
  }
  if (negative) {
    return `M${x},${y}H${right}V${bottom - radius}Q${right},${bottom} ${right - radius},${bottom}H${x + radius}Q${x},${bottom} ${x},${bottom - radius}Z`;
  }
  return `M${x},${bottom}V${y + radius}Q${x},${y} ${x + radius},${y}H${right - radius}Q${right},${y} ${right},${y + radius}V${bottom}Z`;
}

/** Use one path rule for resting marks and inspection highlights. */
export function barMarkPath(
  bar: BarGeometry,
  options: {
    stacked: boolean;
    geometry: Readonly<Record<string, readonly BarGeometry[]>>;
    seriesIds: readonly string[];
    seriesId: string;
    radius?: number;
    roundBothEnds?: boolean;
    segmentGap?: number;
    progress?: number;
    originY?: number;
  },
): string {
  const covered =
    options.stacked &&
    hasStackedSuccessor(options.geometry, options.seriesIds, options.seriesId, bar);
  const gap = covered ? (options.segmentGap ?? 0) : 0;
  return barPath(bar, options.progress ?? 1, {
    originY: options.originY,
    radius: options.radius ?? (options.stacked ? 0 : 3),
    roundValueEnd: !covered || gap > 0,
    roundBothEnds: options.roundBothEnds,
    valueGap: gap,
  });
}

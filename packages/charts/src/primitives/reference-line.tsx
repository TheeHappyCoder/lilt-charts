import type { ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import type { ReferenceLineProps } from '../types';

/** A horizontal line at one y value, such as a target, with an optional label at its end. */
export function ReferenceLine({
  value,
  label,
  color = 'var(--lilt-muted)',
  className,
}: ReferenceLineProps): ReactElement | null {
  const { snapshot } = useChartContext<unknown>();
  const domain = snapshot.yDomain;
  if (!domain || !Number.isFinite(value) || value < domain[0] || value > domain[1]) return null;
  const y = snapshot.yToPixel(value);
  const { left, right, top } = snapshot.plot;
  // The label sits above the line unless that would leave the plot.
  const labelY = y - 6 < top + 10 ? y + 14 : y - 6;
  return (
    <g
      className={['lilt-chart__reference-line', className].filter(Boolean).join(' ')}
      style={{ color }}
      aria-hidden="true"
    >
      <line x1={left} x2={right} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
      {label ? (
        <text x={right - 4} y={labelY} textAnchor="end">
          {label}
        </text>
      ) : null}
    </g>
  );
}

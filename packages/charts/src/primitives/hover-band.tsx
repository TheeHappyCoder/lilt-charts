import { m, useTransform } from 'motion/react';
import { useId, type ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import { useAxisCursor } from '../interaction/axis-cursor';

/**
 * Behind a bar or column chart, the inspected column is lit as a whole: a soft band the height of
 * the plot, a little wider than its bars. A column is what a reader inspects on a bar chart, so
 * the band says so where a thin crosshair would not. It takes the color of the column it holds,
 * so a falling candle is lit in red and a rising one in green.
 */
export function HoverBand(): ReactElement | null {
  const id = `lilt-band-${useId().replaceAll(':', '')}`;
  const { snapshot } = useChartContext<unknown>();
  const cursor = useAxisCursor();
  const rows = snapshot.data.rows;
  const step =
    rows.length > 1
      ? Math.abs(snapshot.xToPixel(rows[1]!.x) - snapshot.xToPixel(rows[0]!.x))
      : snapshot.plot.width;
  // Wider than the bars it holds, never wider than its slot.
  const width = Math.min(step, Math.max(snapshot.columnWidth + 8, step * 0.86));
  // Snaps with the bars that light up, rather than gliding behind them with the crosshair.
  const x = useTransform(cursor.columnX, (value) => value - width / 2);
  const color = useTransform(cursor.columnColor, (value) => value || 'var(--lilt-series-1)');
  if (!snapshot.bars && !snapshot.columns.length) return null;
  const { top, height } = snapshot.plot;
  return (
    <m.g
      aria-hidden="true"
      className="lilt-chart__hover-band"
      style={{ '--lilt-hover-band-color': color } as never}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="lilt-chart__hover-band-stop" stopOpacity={0.02} />
          <stop offset="0.35" className="lilt-chart__hover-band-stop" stopOpacity={0.09} />
          <stop offset="1" className="lilt-chart__hover-band-stop" stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <m.rect
        x={x}
        y={top}
        width={width}
        height={height}
        rx={Math.min(8, width / 4)}
        fill={`url(#${id})`}
        style={{ opacity: cursor.inspecting }}
      />
    </m.g>
  );
}

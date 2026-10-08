import type { ReactElement } from 'react';
import { useChartContext } from '../chart-context';
import { assertOrdered, bandPaths } from '../engine/ranges';
import { defineMark } from '../marks/contract';
import { useRangeMark } from '../marks/use-range-mark';
import { fillFor } from '../paint';
import type { IntervalBandProps } from '../types';

/** A supplied envelope between two of a line series' fields, e.g. a forecast's low and high. */
export const IntervalBand = defineMark(
  function IntervalBand({ series, lower, upper, className }: IntervalBandProps): ReactElement {
    const { paintId } = useChartContext<unknown>();
    const mark = useRangeMark('IntervalBand', series, [lower, upper], 'overlay');
    const rows = mark.snapshot.data.rows;
    assertOrdered('IntervalBand', rows, series, [lower, upper]);
    const paths = bandPaths(rows, series, lower, upper, mark.scales);
    const fill = fillFor(mark.color, undefined, 'fade', paintId(series, 'fade'));
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__interval-band', className].filter(Boolean).join(' ')}
        data-series={series}
        clipPath={mark.clipPath}
        style={{ opacity: mark.opacity }}
      >
        {paths.map((path, pathIndex) => (
          <path key={`${series}-${pathIndex}`} d={path} fill={fill} style={{ fill }} />
        ))}
      </g>
    );
  },
  {
    layout: 'overlay',
    series: (props) => props.series,
    fields: (props) => [props.lower, props.upper],
  },
);

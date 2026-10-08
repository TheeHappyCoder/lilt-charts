import type { ReactElement } from 'react';
import { ColorBatches, assertOrdered, columnsInView, dotPath, whiskerPath } from '../engine/ranges';
import { defineMark, observationColor, rowFields } from '../marks/contract';
import { scalesFor, useRangeMark } from '../marks/use-range-mark';
import { rangeLoadingMark } from '../marks/range-loading-mark';
import type { ErrorBarProps } from '../types';

const DOT_RADIUS = 3.25;

/** Whiskers from one field to another around each value, such as a measurement's uncertainty. */
export const ErrorBar = defineMark(
  function ErrorBar({ series, low, high, point = true, className }: ErrorBarProps): ReactElement {
    const mark = useRangeMark('ErrorBar', series, [low, high], 'column');
    const rows = mark.snapshot.data.rows;
    assertOrdered('ErrorBar', rows, series, [low, { value: true }, high]);
    const whiskers = new ColorBatches();
    const dots = new ColorBatches();
    for (const { row, cx } of columnsInView(rows, mark.scales)) {
      const values = rowFields(row, series, [low, high]);
      const color = observationColor(mark.descriptor, row, mark.color);
      if (values) whiskers.add(color, whiskerPath(cx, values[0], values[1], mark.scales));
      const value = row.values[series];
      if (point && value !== null && value !== undefined)
        dots.add(color, dotPath(cx, mark.scales.y(value), DOT_RADIUS));
    }
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__error-bars', className].filter(Boolean).join(' ')}
        data-series={series}
        clipPath={mark.clipPath}
        mask={mark.mask}
        style={{
          opacity: mark.opacity,
          transition: mark.reducedMotion ? undefined : 'opacity 160ms ease-out',
        }}
      >
        {whiskers.entries().map(({ color, d }) => (
          <path
            key={`whisker-${color}`}
            d={d}
            fill="none"
            strokeLinecap="round"
            strokeWidth={1.5}
            style={{ stroke: color }}
          />
        ))}
        {dots.entries().map(({ color, d }) => (
          <path
            key={`dot-${color}`}
            d={d}
            strokeWidth={1.5}
            style={{ fill: color, stroke: 'var(--lilt-point-ring, var(--lilt-surface))' }}
          />
        ))}
      </g>
    );
  },
  {
    layout: 'column',
    loading: () => rangeLoadingMark('error'),
    series: (props) => props.series,
    fields: (props) => [props.low, props.high],
    highlight: (props, { row, snapshot, descriptor, color }) => {
      const values = rowFields(row, props.series, [props.low, props.high]);
      if (!values) return null;
      const scales = scalesFor(snapshot, props.series);
      const cx = scales.x(row.x);
      const fill = observationColor(descriptor, row, color);
      const value = row.values[props.series];
      return (
        <>
          <path
            d={whiskerPath(cx, values[0], values[1], scales)}
            fill="none"
            strokeLinecap="round"
            strokeWidth={2}
            style={{ stroke: fill }}
          />
          {props.point !== false && value !== null && value !== undefined ? (
            <path
              d={dotPath(cx, scales.y(value), DOT_RADIUS + 0.75)}
              strokeWidth={2}
              style={{ fill, stroke: 'var(--lilt-point-ring, var(--lilt-surface))' }}
            />
          ) : null}
        </>
      );
    },
  },
);

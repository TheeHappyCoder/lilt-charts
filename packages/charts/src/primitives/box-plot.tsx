import type { ReactElement } from 'react';
import {
  ColorBatches,
  PrismBatches,
  assertOrdered,
  boxBlock,
  boxShape,
  columnsInView,
  dotPath,
  type RangeScales,
} from '../engine/ranges';
import type { NormalizedRow } from '../engine/normalize';
import { defineMark, observationColor, rowFields } from '../marks/contract';
import { scalesFor, useRangeMark } from '../marks/use-range-mark';
import { rangeLoadingMark } from '../marks/range-loading-mark';
import type { BoxPlotProps } from '../types';
import { DepthClip, PrismPaths, shade } from './depth-paint';

const OUTLIER_RADIUS = 2.5;

/** A solid box stays as pale as the flat one's tint, so the median line still reads on it. */
const solidBox = (color: string) => `color-mix(in oklab, ${color} 44%, var(--lilt-surface))`;

function boxValues(row: NormalizedRow<unknown>, props: BoxPlotProps) {
  const values = rowFields(row, props.series, [props.min, props.q1, props.q3, props.max]);
  const median = row.values[props.series];
  if (!values || median === null || median === undefined) return null;
  return { min: values[0], q1: values[1], median, q3: values[2], max: values[3] };
}

function outlierPath(
  row: NormalizedRow<unknown>,
  props: BoxPlotProps,
  scales: RangeScales,
  lift = 0,
) {
  const cx = scales.x(row.x);
  return (props.outliers?.(row.datum) ?? [])
    .filter((value) => Number.isFinite(value))
    .map((value) => dotPath(cx, scales.y(value) - lift, OUTLIER_RADIUS))
    .join('');
}

/** Quartile boxes with a median line and whiskers; the series value is the median. */
export const BoxPlot = defineMark(
  function BoxPlot(props: BoxPlotProps): ReactElement {
    const { series, min, q1, q3, max, className } = props;
    const mark = useRangeMark('BoxPlot', series, [min, q1, q3, max], 'column');
    const rows = mark.snapshot.data.rows;
    assertOrdered('BoxPlot', rows, series, [min, q1, { value: true }, q3, max]);
    const boxes = new ColorBatches();
    const prisms = new PrismBatches();
    const under = new ColorBatches();
    const lines = new ColorBatches();
    const outliers = new ColorBatches();
    for (const { row, cx } of columnsInView(rows, mark.scales)) {
      const values = boxValues(row, props);
      if (!values) continue;
      const color = observationColor(mark.descriptor, row, mark.color);
      let lift = 0;
      if (props.depth) {
        const block = boxBlock(cx, values, mark.scales);
        lift = block.lift;
        prisms.add(solidBox(color), block.faces);
        under.add(color, block.lower);
        lines.add(color, block.median + block.upper);
      } else {
        const shape = boxShape(cx, values, mark.scales);
        boxes.add(color, shape.box);
        lines.add(color, shape.median + shape.whiskers);
      }
      const dots = outlierPath(row, props, mark.scales, lift);
      if (dots) outliers.add(color, dots);
    }
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__box-plots', className].filter(Boolean).join(' ')}
        data-series={series}
        clipPath={props.depth ? `url(#${mark.depthClip.id})` : mark.clipPath}
        mask={mark.mask}
        style={{
          opacity: mark.opacity,
          transition: mark.reducedMotion ? undefined : 'opacity 160ms ease-out',
        }}
      >
        {props.depth ? (
          <>
            <DepthClip clip={mark.depthClip} />
            {under.entries().map(({ color, d }) => (
              <path
                key={`under-${color}`}
                d={d}
                fill="none"
                strokeLinecap="round"
                strokeWidth={1.5}
                style={{ stroke: color }}
              />
            ))}
            <PrismPaths batches={prisms} />
          </>
        ) : null}
        {boxes.entries().map(({ color, d }) => (
          <path
            key={`box-${color}`}
            d={d}
            fillOpacity={0.22}
            strokeWidth={1.5}
            style={{ fill: color, stroke: color }}
          />
        ))}
        {lines.entries().map(({ color, d }) => (
          <path
            key={`line-${color}`}
            d={d}
            fill="none"
            strokeLinecap={props.depth ? 'butt' : 'round'}
            strokeWidth={1.5}
            style={{ stroke: color }}
          />
        ))}
        {outliers.entries().map(({ color, d }) => (
          <path key={`outlier-${color}`} d={d} fillOpacity={0.7} style={{ fill: color }} />
        ))}
      </g>
    );
  },
  {
    layout: 'column',
    loading: (props) => rangeLoadingMark('boxplot', props.depth),
    series: (props) => props.series,
    fields: (props) => [props.min, props.q1, props.q3, props.max],
    highlight: (props, { row, snapshot, descriptor, color }) => {
      const values = boxValues(row, props);
      if (!values) return null;
      const scales = scalesFor(snapshot, props.series);
      const cx = scales.x(row.x);
      const shape = boxShape(cx, values, scales);
      const stroke = observationColor(descriptor, row, color);
      if (props.depth) {
        const block = boxBlock(cx, values, scales);
        const lifted = outlierPath(row, props, scales, block.lift);
        const prisms = new PrismBatches();
        prisms.add(`color-mix(in oklab, ${stroke} 58%, var(--lilt-surface))`, block.faces);
        const line = (d: string, cap: 'butt' | 'round') => (
          <path
            d={d}
            fill="none"
            strokeLinecap={cap}
            strokeWidth={2}
            style={{ stroke: shade(stroke, 12) }}
          />
        );
        return (
          <>
            {line(block.lower, 'round')}
            <PrismPaths batches={prisms} />
            {line(block.median, 'butt')}
            {line(block.upper, 'round')}
            {lifted ? <path d={lifted} style={{ fill: stroke }} /> : null}
          </>
        );
      }
      const dots = outlierPath(row, props, scales);
      return (
        <>
          <path d={shape.box} fillOpacity={0.4} strokeWidth={2} style={{ fill: stroke, stroke }} />
          <path
            d={shape.median + shape.whiskers}
            fill="none"
            strokeLinecap="round"
            strokeWidth={2}
            style={{ stroke }}
          />
          {dots ? <path d={dots} style={{ fill: stroke }} /> : null}
        </>
      );
    },
  },
);

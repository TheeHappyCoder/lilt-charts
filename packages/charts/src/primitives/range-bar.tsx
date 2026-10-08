import type { ReactElement } from 'react';
import {
  ColorBatches,
  PrismBatches,
  assertOrdered,
  columnsInView,
  rangeBarPath,
  rangeBarPrism,
} from '../engine/ranges';
import { DepthClip, PrismPaths } from './depth-paint';
import { defineMark, observationColor, rowFields } from '../marks/contract';
import { scalesFor, useRangeMark } from '../marks/use-range-mark';
import { rangeLoadingMark } from '../marks/range-loading-mark';
import type { RangeBarProps } from '../types';

/** A floating bar per observation, from one field to another, such as a low to a high. */
export const RangeBar = defineMark(
  function RangeBar({ series, low, high, depth = false, className }: RangeBarProps): ReactElement {
    const mark = useRangeMark('RangeBar', series, [low, high], 'column');
    const rows = mark.snapshot.data.rows;
    assertOrdered('RangeBar', rows, series, [low, high]);
    const batches = new ColorBatches();
    const prisms = new PrismBatches();
    for (const { row, cx } of columnsInView(rows, mark.scales)) {
      const values = rowFields(row, series, [low, high]);
      if (!values) continue;
      const color = observationColor(mark.descriptor, row, mark.color);
      if (depth) prisms.add(color, rangeBarPrism(cx, values[0], values[1], mark.scales));
      else batches.add(color, rangeBarPath(cx, values[0], values[1], mark.scales));
    }
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__range-bars', className].filter(Boolean).join(' ')}
        data-series={series}
        clipPath={depth ? `url(#${mark.depthClip.id})` : mark.clipPath}
        mask={mark.mask}
        style={{
          opacity: mark.opacity,
          transition: mark.reducedMotion ? undefined : 'opacity 160ms ease-out',
        }}
      >
        {depth ? (
          <>
            <DepthClip clip={mark.depthClip} />
            <PrismPaths batches={prisms} />
          </>
        ) : (
          batches
            .entries()
            .map(({ color, d }) => <path key={color} d={d} style={{ fill: color }} />)
        )}
      </g>
    );
  },
  {
    layout: 'column',
    loading: (props) => rangeLoadingMark('range', props.depth),
    series: (props) => props.series,
    fields: (props) => [props.low, props.high],
    highlight: (props, { row, snapshot, descriptor, color }) => {
      const values = rowFields(row, props.series, [props.low, props.high]);
      if (!values) return null;
      const scales = scalesFor(snapshot, props.series);
      const fill = observationColor(descriptor, row, color);
      if (props.depth) {
        const prisms = new PrismBatches();
        prisms.add(fill, rangeBarPrism(scales.x(row.x), values[0], values[1], scales));
        return (
          <g className="lilt-chart__range-bar-highlight">
            <PrismPaths batches={prisms} />
          </g>
        );
      }
      return (
        <path
          className="lilt-chart__range-bar-highlight"
          d={rangeBarPath(scales.x(row.x), values[0], values[1], scales)}
          style={{ fill }}
        />
      );
    },
  },
);

import { useMemo, type ReactElement } from 'react';
import { defineMark, observationColor } from '../marks/contract';
import { scalesFor, useRangeMark } from '../marks/use-range-mark';
import type { NormalizedRow } from '../engine/normalize';
import type { ChartSeries } from '../types';
import {
  CANDLE_DOWN,
  CANDLE_UP,
  assertCandles,
  candleAt,
  candlePaths,
  candleShape,
  type Candle,
  type CandleDisplay,
} from './candle-geometry';
import { DepthClip, prismShades } from '../primitives/depth-paint';

export interface CandlesProps {
  /** The series whose value is each candle's close. */
  series: string;
  /** Field IDs of each candle's open, high and low. */
  open: string;
  high: string;
  low: string;
  /** `candle` (default), `hollow` rising bodies, or `ohlc` bars. */
  display?: CandleDisplay;
  /**
   * Draws each body as a solid block receding up and to the right; the front keeps open and
   * close. OHLC bars stay flat.
   */
  depth?: boolean;
  className?: string;
}

/** A series' own `colorAt` wins; otherwise rising and falling candles take the candle tokens. */
function candleColor(
  descriptor: ChartSeries<unknown>,
  row: NormalizedRow<unknown>,
  candle: Candle,
) {
  return observationColor(descriptor, row, candle.up ? CANDLE_UP : CANDLE_DOWN);
}

function CandlePathGroup({
  paths,
  display,
}: {
  paths: ReturnType<typeof candlePaths>;
  display: CandleDisplay;
}): ReactElement {
  const strokeWidth = display === 'ohlc' ? 1.5 : 1;
  return (
    <>
      {paths.strokes.map(({ color, d }) => (
        <path
          key={`stroke-${color}`}
          d={d}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap={display === 'ohlc' ? 'round' : 'butt'}
          style={{ stroke: color }}
        />
      ))}
      {paths.sides.map(({ color, d }) => (
        <path key={`side-${color}`} d={d} style={{ fill: prismShades(color).side }} />
      ))}
      {paths.tops.map(({ color, d }) => (
        <path key={`top-${color}`} d={d} style={{ fill: prismShades(color).top }} />
      ))}
      {paths.bodies.map(({ color, d }) => (
        <path key={`body-${color}`} d={d} style={{ fill: color }} />
      ))}
      {paths.hollow.map(({ color, d }) => (
        <path
          key={`hollow-${color}`}
          d={d}
          strokeWidth={1}
          style={{ fill: 'var(--lilt-surface)', stroke: color }}
        />
      ))}
    </>
  );
}

/**
 * Open-high-low-close candles. The series value is the close; `open`, `high` and `low` name its
 * fields. Every candle in view draws into a few batched paths, so long histories stay fast.
 */
export const Candles = defineMark(
  function Candles({
    series,
    open,
    high,
    low,
    display = 'candle',
    depth = false,
    className,
  }: CandlesProps): ReactElement {
    const mark = useRangeMark('Candles', series, [open, high, low], 'column');
    const { snapshot, descriptor, scales } = mark;
    const paths = useMemo(() => {
      const fields = { open, high, low };
      assertCandles(snapshot.data.rows, series, fields);
      return candlePaths(
        snapshot.data.rows,
        series,
        fields,
        scales,
        display,
        (row, candle) => candleColor(descriptor, row, candle),
        depth,
      );
    }, [snapshot, series, open, high, low, scales, display, descriptor, depth]);
    return (
      <g
        aria-hidden="true"
        className={['lilt-chart__candles', className].filter(Boolean).join(' ')}
        data-series={series}
        data-display={display}
        clipPath={depth ? `url(#${mark.depthClip.id})` : mark.clipPath}
        mask={mark.mask}
        style={{
          opacity: mark.opacity,
          transition: mark.reducedMotion ? undefined : 'opacity 160ms ease-out',
        }}
      >
        {depth ? <DepthClip clip={mark.depthClip} /> : null}
        <CandlePathGroup paths={paths} display={display} />
      </g>
    );
  },
  {
    layout: 'column',
    loading: (props) => ({
      kind: props.display === 'ohlc' ? 'ohlc' : 'candle',
      depth: props.depth && props.display !== 'ohlc',
      render: ({ cx, low, high, scales, mask }) => {
        const paint = mask
          ? 'white'
          : 'color-mix(in srgb, var(--lilt-skeleton) 64%, var(--lilt-surface))';
        const shape = candleShape(
          cx,
          {
            low,
            high,
            open: low + (high - low) * 0.28,
            close: high - (high - low) * 0.23,
            up: true,
          },
          scales,
          props.display ?? 'candle',
          props.depth,
        );
        const shades = prismShades(paint);
        return (
          <>
            {shape.stroke ? (
              <path d={shape.stroke} fill="none" stroke={paint} strokeWidth={1.5} />
            ) : null}
            {shape.side ? <path d={shape.side} fill={mask ? paint : shades.side} /> : null}
            {shape.top ? <path d={shape.top} fill={mask ? paint : shades.top} /> : null}
            {shape.body ? <path d={shape.body} fill={paint} /> : null}
            {shape.hollow ? (
              <path d={shape.hollow} fill={mask ? 'black' : 'var(--lilt-surface)'} stroke={paint} />
            ) : null}
          </>
        );
      },
    }),
    series: (props) => props.series,
    fields: (props) => [props.open, props.high, props.low],
    color: (props, { row, descriptor }) => {
      const candle = candleAt(row, props.series, props);
      return candle ? candleColor(descriptor, row, candle) : undefined;
    },
    highlight: (props, { row, snapshot, descriptor }) => {
      const candle = candleAt(row, props.series, props);
      if (!candle) return null;
      const display = props.display ?? 'candle';
      const scales = scalesFor(snapshot, props.series);
      const shape = candleShape(scales.x(row.x), candle, scales, display, props.depth);
      const color = candleColor(descriptor, row, candle);
      return (
        <g className="lilt-chart__candle-highlight">
          <CandlePathGroup
            display={display}
            paths={{
              bodies: shape.body ? [{ color, d: shape.body }] : [],
              hollow: shape.hollow ? [{ color, d: shape.hollow }] : [],
              strokes: shape.stroke ? [{ color, d: shape.stroke }] : [],
              sides: shape.side ? [{ color, d: shape.side }] : [],
              tops: shape.top ? [{ color, d: shape.top }] : [],
            }}
          />
        </g>
      );
    },
  },
);

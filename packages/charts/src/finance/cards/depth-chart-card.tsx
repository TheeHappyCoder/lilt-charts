'use client';

import { useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { useChartContext } from '../../chart-context';
import { ChartPlot } from '../../chart-plot';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardValue,
} from '../../cards/chart-card';
import { numberFormatters } from '../../cards/format';
import { Area } from '../../primitives/area';
import { XAxis, YAxis } from '../../primitives/axes';
import { Grid } from '../../primitives/grid';
import { Line } from '../../primitives/line';
import { Chart } from '../../runtime/chart-runtime';
import type {
  ChartAxis,
  ChartBackground,
  ChartHoverStyle,
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartSeries,
  ChartStyle,
  ChartSurface,
} from '../../types';
import type { AnimatedNumberVariant } from '../../motion/animated-number';
import { CANDLE_DOWN, CANDLE_UP } from '../candle-geometry';
import { depthLevels, type BookLevel, type DepthLevel } from '../indicators';

export interface DepthChartCardProps {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** Resting buy orders: a price and the size at it. Order does not matter. */
  bids: readonly BookLevel[];
  /** Resting sell orders. */
  asks: readonly BookLevel[];
  /** Draws both sides' edges as lit tubes with a soft shadow; the steps keep their exact prices. */
  depth?: boolean;
  /** Price format for the mid, spread and axis, e.g. `{ style: 'currency', currency: 'USD' }`. */
  valueFormat?: Intl.NumberFormatOptions;
  /** Size format for depth. Defaults to compact numbers. */
  sizeFormat?: Intl.NumberFormatOptions;
  locale?: string;
  /** Plot height in pixels. Defaults to 220. */
  height?: number;
  axis?: ChartAxis;
  background?: ChartBackground;
  hoverStyle?: ChartHoverStyle;
  surface?: ChartSurface;
  numberStyle?: AnimatedNumberVariant;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows when there is no data: `dots` (default), the chart's own `shape`, your
   * own element such as `<ChartEmpty>No book yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

/** A dashed line at the mid price with its label, drawn inside the plot. */
function MidMarker({ price, label }: { price: number; label: string }): ReactElement | null {
  const { snapshot } = useChartContext<unknown>();
  if (price < snapshot.xDomain[0] || price > snapshot.xDomain[1]) return null;
  const x = snapshot.xToPixel(price);
  return (
    <g className="lilt-card__depth-mid" aria-hidden="true">
      <line
        x1={x}
        x2={x}
        y1={snapshot.plot.top + 18}
        y2={snapshot.plot.bottom}
        strokeDasharray="2 4"
        vectorEffect="non-scaling-stroke"
      />
      <text x={x} y={snapshot.plot.top + 10} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Order book depth: how much could trade at each price, buying and selling, as stepped areas, with
 * the mid, spread and total depth in the header. Hover reads the size resting at each price.
 */
export function DepthChartCard({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Depth chart',
  bids,
  asks,
  valueFormat = PRICE_FORMAT,
  sizeFormat,
  locale = 'en-US',
  height = 220,
  axis = 'minimal',
  background = 'dots',
  hoverStyle = 'soft',
  surface,
  numberStyle,
  loading = false,
  loadingStyle = 'shimmer',
  empty = 'dots',
  motion,
  className,
  style,
  depth = false,
}: DepthChartCardProps): ReactElement {
  const book = useMemo(() => depthLevels(bids, asks), [bids, asks]);
  const priceKey = JSON.stringify(valueFormat);
  const sizeKey = JSON.stringify(sizeFormat ?? null);
  const price = useMemo(() => numberFormatters(locale, valueFormat), [locale, priceKey]);
  const size = useMemo(() => numberFormatters(locale, sizeFormat), [locale, sizeKey]);
  const percent = useMemo(
    () => numberFormatters(locale, { style: 'percent', maximumFractionDigits: 3 }).full,
    [locale],
  );
  const [hovered, setHovered] = useState<DepthLevel | null>(null);
  const series = useMemo<readonly ChartSeries<DepthLevel>[]>(
    () => [
      {
        id: 'bid',
        label: 'Bids',
        accessor: (row) => row.bid,
        color: CANDLE_UP,
        curve: 'step-before',
        area: { treatment: 'fade' },
        line: { width: 1.5, depth },
        formatValue: size.full,
      },
      {
        id: 'ask',
        label: 'Asks',
        accessor: (row) => row.ask,
        color: CANDLE_DOWN,
        curve: 'step-after',
        area: { treatment: 'fade' },
        line: { width: 1.5, depth },
        formatValue: size.full,
      },
    ],
    [size, depth],
  );
  const spread =
    book.spread !== null && book.mid
      ? `${price.full(book.spread)} (${percent(book.spread / book.mid)})`
      : '—';
  const depthAtHover = hovered ? (hovered.bid ?? hovered.ask) : null;
  return (
    <ChartCard
      aria-label={ariaLabel}
      surface={surface}
      numberStyle={numberStyle}
      motion={motion}
      className={['lilt-card--depth', className].filter(Boolean).join(' ')}
      style={style}
    >
      {header ? (
        <>
          <ChartCardHeader>
            {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
            <ChartCardValue value={book.mid} format={price.full} loading={loading} motion={motion}>
              {loading ? null : hovered && depthAtHover !== null ? (
                <ChartCardCaption>
                  {size.full(depthAtHover)} {hovered.side === 'bid' ? 'bid' : 'ask'} depth at{' '}
                  {price.full(hovered.price)}
                </ChartCardCaption>
              ) : (
                <ChartCardCaption>Mid price</ChartCardCaption>
              )}
            </ChartCardValue>
          </ChartCardHeader>
          <dl className="lilt-card__stats">
            <div>
              <dt>Spread</dt>
              <dd>{loading ? '—' : spread}</dd>
            </div>
            <div data-side="bid">
              <dt>Bid depth</dt>
              <dd>{loading ? '—' : size.compact(book.bidDepth)}</dd>
            </div>
            <div data-side="ask">
              <dt>Ask depth</dt>
              <dd>{loading ? '—' : size.compact(book.askDepth)}</dd>
            </div>
          </dl>
        </>
      ) : null}
      <Chart
        className="lilt-card__chart"
        aria-label={`${ariaLabel} depth by price`}
        data={book.levels}
        x={{ type: 'number', accessor: (row) => row.price, format: price.full }}
        y={{ includeZero: true, ticks: 3, format: size.compact }}
        series={series}
        onSelectionChange={(selection) => setHovered(selection?.row ?? null)}
        motion={motion}
        status={loading ? 'loading' : 'ready'}
        loadingStyle={loadingStyle}
        empty={empty}
      >
        <ChartPlot
          height={height}
          axis={axis}
          background={background}
          pill={hoverStyle}
          margins={{ top: 8, right: 4, bottom: 28, left: 4 }}
        >
          <Grid pattern="lines" />
          <Area series="bid" />
          <Area series="ask" />
          <Line series="bid" />
          <Line series="ask" />
          {book.mid !== null ? (
            <MidMarker price={book.mid} label={`Mid ${price.full(book.mid)}`} />
          ) : null}
          <XAxis labels="fit" />
          <YAxis />
        </ChartPlot>
      </Chart>
    </ChartCard>
  );
}

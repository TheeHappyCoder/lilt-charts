'use client';

import { useId, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { useChartContext } from '../../chart-context';
import { ChartPlot } from '../../chart-plot';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardValue,
} from '../../cards/chart-card';
import { numberFormatters, signedFormat } from '../../cards/format';
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

/** One position in a strategy. */
export interface PayoffLeg {
  /** `call` or `put` options, or `stock` held from `strike`. */
  type: 'call' | 'put' | 'stock';
  /** `long` buys (default); `short` sells. */
  side?: 'long' | 'short';
  /** Strike price; for stock, the price paid or sold at. */
  strike: number;
  /** Premium per share paid (long) or received (short). Defaults to 0. */
  premium?: number;
  /** Contracts, or shares for stock. Defaults to 1. */
  quantity?: number;
}

export interface PayoffChartCardProps {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header and its stats. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** The strategy's positions, all expiring together. */
  legs: readonly PayoffLeg[];
  /** Today's price of the underlying: marked on the plot and read in the headline at rest. */
  spot?: number;
  /** Underlying prices to draw. Defaults to 30% either side of the strikes and spot. */
  priceRange?: readonly [number, number];
  /** Shares per option contract. Defaults to 100. */
  multiplier?: number;
  /** Money format for profit and loss, e.g. `{ style: 'currency', currency: 'EUR' }`. */
  valueFormat?: Intl.NumberFormatOptions;
  /** Price format for the underlying. Defaults to valueFormat. */
  priceFormat?: Intl.NumberFormatOptions;
  locale?: string;
  /** Plot height in pixels. Defaults to 220. */
  height?: number;
  /** Draws the payoff line as a lit tube with a soft shadow. */
  depth?: boolean;
  axis?: ChartAxis;
  background?: ChartBackground;
  hoverStyle?: ChartHoverStyle;
  surface?: ChartSurface;
  numberStyle?: AnimatedNumberVariant;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows with no legs: `dots` (default), the chart's own `shape`, your own element
   * such as `<ChartEmpty>No positions</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

export interface PayoffPoint {
  price: number;
  pnl: number;
}

/** Profit or loss of every leg together, at expiry, if the underlying ends at `price`. */
export function payoffAt(legs: readonly PayoffLeg[], multiplier: number, price: number): number {
  let total = 0;
  for (const leg of legs) {
    const sign = leg.side === 'short' ? -1 : 1;
    const quantity = leg.quantity ?? 1;
    if (leg.type === 'stock') {
      total += sign * quantity * (price - leg.strike);
      continue;
    }
    const intrinsic =
      leg.type === 'call' ? Math.max(0, price - leg.strike) : Math.max(0, leg.strike - price);
    total += sign * quantity * multiplier * (intrinsic - (leg.premium ?? 0));
  }
  return total;
}

export interface PayoffSummary {
  points: PayoffPoint[];
  breakevens: number[];
  /** Null when profit keeps growing as the price rises. */
  maxProfit: number | null;
  /** Null when losses keep growing as the price rises. */
  maxLoss: number | null;
}

/** The payoff curve across a price range, its breakevens, and its best and worst outcomes. */
export function payoffSummary(
  legs: readonly PayoffLeg[],
  multiplier: number,
  range: readonly [number, number],
  samples = 240,
): PayoffSummary {
  const [low, high] = range;
  const prices = new Set<number>();
  for (let index = 0; index <= samples; index++) prices.add(low + ((high - low) * index) / samples);
  // Kinks sit at the strikes; sample them exactly so the curve keeps its corners.
  for (const leg of legs) if (leg.strike >= low && leg.strike <= high) prices.add(leg.strike);
  const points = [...prices]
    .sort((a, b) => a - b)
    .map((price) => ({ price, pnl: payoffAt(legs, multiplier, price) }));
  const breakevens: number[] = [];
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (a.pnl === 0 && (index === 1 || points[index - 2]!.pnl !== 0)) breakevens.push(a.price);
    else if (a.pnl * b.pnl < 0)
      breakevens.push(a.price + ((b.price - a.price) * -a.pnl) / (b.pnl - a.pnl));
  }
  // Outcomes over every price from zero up: the strikes and zero hold the extremes, and the slope
  // past the highest strike says whether either side is unbounded.
  const strikes = legs.map((leg) => leg.strike);
  const top = Math.max(high, ...strikes);
  const candidates = [0, ...strikes, top].map((price) => payoffAt(legs, multiplier, price));
  const slope = payoffAt(legs, multiplier, top * 2 + 1) - payoffAt(legs, multiplier, top);
  return {
    points,
    breakevens,
    maxProfit: slope > 1e-9 ? null : Math.max(...candidates),
    maxLoss: slope < -1e-9 ? null : Math.min(...candidates),
  };
}

/** The area between the payoff and zero: green where it profits, red where it loses. */
function PayoffFill({ series }: { series: string }): ReactElement | null {
  const { snapshot, revealProgress } = useChartContext<PayoffPoint>();
  const clip = useId().replace(/:/g, '');
  const { rows } = snapshot.data;
  if (!rows.length || !snapshot.yDomain) return null;
  const zero = snapshot.yToPixel(0);
  const { left, right, top, bottom } = snapshot.plot;
  const points = rows.flatMap((row) => {
    const value = row.values[series];
    return value === null || value === undefined
      ? []
      : [`${snapshot.xToPixel(row.x)},${snapshot.yToPixel(value)}`];
  });
  if (!points.length) return null;
  const first = snapshot.xToPixel(rows[0]!.x);
  const last = snapshot.xToPixel(rows.at(-1)!.x);
  const d = `M${first},${zero} L${points.join(' L')} L${last},${zero} Z`;
  const above = Math.max(top, Math.min(bottom, zero));
  return (
    <g className="lilt-card__payoff-fill" aria-hidden="true" style={{ opacity: revealProgress }}>
      <defs>
        <clipPath id={`${clip}-gain`}>
          <rect x={left} y={top} width={right - left} height={above - top} />
        </clipPath>
        <clipPath id={`${clip}-loss`}>
          <rect x={left} y={above} width={right - left} height={bottom - above} />
        </clipPath>
      </defs>
      <path d={d} clipPath={`url(#${clip}-gain)`} data-side="gain" />
      <path d={d} clipPath={`url(#${clip}-loss)`} data-side="loss" />
      <line x1={left} x2={right} y1={zero} y2={zero} className="lilt-card__payoff-zero" />
    </g>
  );
}

/** A dashed line at today's price, and a dot at each breakeven on the zero line. */
function PayoffMarkers({
  spot,
  spotLabel,
  breakevens,
}: {
  spot?: number;
  spotLabel: string;
  breakevens: readonly number[];
}): ReactElement | null {
  const { snapshot } = useChartContext<PayoffPoint>();
  if (!snapshot.yDomain) return null;
  const [low, high] = snapshot.xDomain;
  const zero = snapshot.yToPixel(0);
  return (
    <g className="lilt-card__payoff-markers" aria-hidden="true">
      {spot !== undefined && spot >= low && spot <= high ? (
        <g className="lilt-card__depth-mid">
          <line
            x1={snapshot.xToPixel(spot)}
            x2={snapshot.xToPixel(spot)}
            y1={snapshot.plot.top + 18}
            y2={snapshot.plot.bottom}
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
          <text x={snapshot.xToPixel(spot)} y={snapshot.plot.top + 10} textAnchor="middle">
            {spotLabel}
          </text>
        </g>
      ) : null}
      {breakevens
        .filter((price) => price >= low && price <= high)
        .map((price) => (
          <circle
            key={price}
            className="lilt-card__payoff-breakeven"
            cx={snapshot.xToPixel(price)}
            cy={zero}
            r={3.5}
          />
        ))}
    </g>
  );
}

const MONEY: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
};

/**
 * An options strategy at expiry: profit or loss against where the underlying ends, green above
 * zero and red below, with today's price and every breakeven marked. The header reads the
 * outcome at today's price, or wherever the pointer is, beside the best and worst outcomes.
 */
export function PayoffChartCard({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Payoff chart',
  legs,
  spot,
  priceRange,
  multiplier = 100,
  valueFormat = MONEY,
  priceFormat,
  locale = 'en-US',
  height = 220,
  depth = false,
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
}: PayoffChartCardProps): ReactElement {
  const moneyKey = JSON.stringify(valueFormat);
  const priceKey = JSON.stringify(priceFormat ?? valueFormat);
  const money = useMemo(() => numberFormatters(locale, valueFormat), [locale, moneyKey]);
  const prices = useMemo(
    () =>
      numberFormatters(
        locale,
        priceFormat ?? { ...valueFormat, minimumFractionDigits: 2, maximumFractionDigits: 2 },
      ),
    [locale, priceKey],
  );
  const signed = useMemo(() => signedFormat(money.full), [money]);
  const range = useMemo((): readonly [number, number] => {
    if (priceRange) return priceRange;
    const anchors = [...legs.map((leg) => leg.strike), ...(spot !== undefined ? [spot] : [])];
    if (!anchors.length) return [0, 1];
    const low = Math.min(...anchors);
    const high = Math.max(...anchors);
    const pad = Math.max((high - low) * 0.6, high * 0.3, 1);
    return [Math.max(0, low - pad), high + pad];
  }, [priceRange, legs, spot]);
  const summary = useMemo(
    () => (legs.length ? payoffSummary(legs, multiplier, range) : null),
    [legs, multiplier, range],
  );
  const [hovered, setHovered] = useState<PayoffPoint | null>(null);
  const series = useMemo<readonly ChartSeries<PayoffPoint>[]>(
    () => [
      {
        id: 'pnl',
        label: 'Profit and loss',
        accessor: (row) => row.pnl,
        color: 'var(--lilt-text)',
        curve: 'linear',
        line: { width: 1.75, depth },
        formatValue: signed,
      },
    ],
    [signed, depth],
  );
  const atSpot = spot !== undefined && legs.length ? payoffAt(legs, multiplier, spot) : null;
  const value = hovered?.pnl ?? atSpot;
  const breakevens = summary?.breakevens ?? [];
  const outcome = (amount: number | null, unbounded: string) =>
    amount === null ? unbounded : signed(amount);
  return (
    <ChartCard
      aria-label={ariaLabel}
      surface={surface}
      numberStyle={numberStyle}
      motion={motion}
      className={['lilt-card--payoff', className].filter(Boolean).join(' ')}
      style={style}
    >
      {header ? (
        <>
          <ChartCardHeader>
            {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
            <ChartCardValue value={value} format={signed} loading={loading} motion={motion}>
              {loading || value === null ? null : (
                <ChartCardCaption>
                  {hovered ? `at ${prices.full(hovered.price)}` : `at ${prices.full(spot!)} today`}
                </ChartCardCaption>
              )}
            </ChartCardValue>
          </ChartCardHeader>
          <dl className="lilt-card__stats">
            <div data-side="bid">
              <dt>Max profit</dt>
              <dd>{loading || !summary ? '—' : outcome(summary.maxProfit, 'Unlimited')}</dd>
            </div>
            <div data-side="ask">
              <dt>Max loss</dt>
              <dd>{loading || !summary ? '—' : outcome(summary.maxLoss, 'Unlimited')}</dd>
            </div>
            <div>
              <dt>{breakevens.length === 1 ? 'Breakeven' : 'Breakevens'}</dt>
              <dd>
                {loading || !summary
                  ? '—'
                  : breakevens.length
                    ? breakevens.map((price) => prices.full(price)).join(' · ')
                    : 'None'}
              </dd>
            </div>
          </dl>
        </>
      ) : null}
      <Chart
        className="lilt-card__chart"
        aria-label={`${ariaLabel} by price at expiry`}
        data={summary?.points ?? []}
        x={{ type: 'number', accessor: (row) => row.price, format: prices.full }}
        y={{ includeZero: true, ticks: 3, format: money.compact }}
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
          <PayoffFill series="pnl" />
          <Line series="pnl" />
          <PayoffMarkers
            spot={spot}
            spotLabel={spot !== undefined ? `Today ${prices.full(spot)}` : ''}
            breakevens={breakevens}
          />
          <XAxis labels="fit" />
          <YAxis />
        </ChartPlot>
      </Chart>
    </ChartCard>
  );
}

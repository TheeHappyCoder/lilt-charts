'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { ChartCard } from '../cards/chart-card';
import { numberFormatters } from '../cards/format';
import { useReducedMotion } from '../motion/use-chart-motion';
import { SkeletonBlock } from '../lifecycle/skeleton-block';
import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { useSkeletonClock } from '../lifecycle/use-skeleton-clock';
import type {
  ChartEmptyState,
  ChartLoadingStyle,
  ChartMotion,
  ChartStyle,
  ChartSurface,
} from '../types';
import { EmptySlot } from '../lifecycle/chart-empty';
import type { BookLevel } from './indicators';

export interface OrderBookProps {
  /** Optional visible table caption. */
  title?: string;
  /** Show the caption. Column headings remain available. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible caption. */
  'aria-label'?: string;
  bids: readonly BookLevel[];
  asks: readonly BookLevel[];
  /** Price levels shown on each side of the spread. Defaults to 8. */
  levels?: number;
  /** Draws each level's bar as a solid block with a lit roof and a shaded end. */
  depth?: boolean;
  /** Price format, e.g. `{ style: 'currency', currency: 'USD' }`. */
  valueFormat?: Intl.NumberFormatOptions;
  /** Size format. Defaults to compact numbers. */
  sizeFormat?: Intl.NumberFormatOptions;
  locale?: string;
  /** Briefly highlight levels whose size changed. Defaults to true; reduced motion turns it off. */
  flash?: boolean;
  surface?: ChartSurface;
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

interface Level {
  price: number;
  size: number;
  total: number;
  side: 'bid' | 'ask';
}

/** The best `count` levels of one side with running totals from the spread outward. */
function sideLevels(levels: readonly BookLevel[], side: 'bid' | 'ask', count: number): Level[] {
  const sizes = new Map<number, number>();
  for (const level of levels)
    if (Number.isFinite(level.price) && Number.isFinite(level.size) && level.size > 0)
      sizes.set(level.price, (sizes.get(level.price) ?? 0) + level.size);
  const sorted = [...sizes]
    .map(([price, size]) => ({ price, size }))
    .sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price))
    .slice(0, count);
  let total = 0;
  return sorted.map((level) => {
    total += level.size;
    return { ...level, total, side };
  });
}

/** Prices whose size changed since the last render, so they can flash. */
function useChangedPrices(levels: readonly Level[], enabled: boolean): ReadonlySet<string> {
  const previous = useRef<Map<string, number> | null>(null);
  const [changed, setChanged] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const next = new Map(levels.map((level) => [`${level.side}:${level.price}`, level.size]));
    const before = previous.current;
    previous.current = next;
    if (!enabled || !before) return;
    const moved = new Set(
      [...next].filter(([key, size]) => before.get(key) !== size).map(([key]) => key),
    );
    if (!moved.size) return;
    setChanged(moved);
    const timer = window.setTimeout(() => setChanged(new Set()), 600);
    return () => window.clearTimeout(timer);
  }, [levels, enabled]);
  return changed;
}

/**
 * A price ladder: asks above, bids below, a spread row between, and a depth bar behind each
 * level sized by its running total. It is a real table, so screen readers read it row by row.
 */
export function OrderBook({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Order book',
  bids,
  asks,
  levels = 8,
  depth = false,
  valueFormat = { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  sizeFormat,
  locale = 'en-US',
  flash = true,
  surface,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion,
  className,
  style,
}: OrderBookProps): ReactElement {
  const reducedMotion = useReducedMotion(motion ?? 'auto');
  const skeletonRef = useSkeletonClock<HTMLTableElement>(loading, loadingStyle);
  const skeletonLeaving = useSkeletonExit(loading, reducedMotion);
  const priceKey = JSON.stringify(valueFormat);
  const sizeKey = JSON.stringify(sizeFormat ?? null);
  const price = useMemo(() => numberFormatters(locale, valueFormat).full, [locale, priceKey]);
  const size = useMemo(() => numberFormatters(locale, sizeFormat).compact, [locale, sizeKey]);
  const percent = useMemo(
    () => numberFormatters(locale, { style: 'percent', maximumFractionDigits: 3 }).full,
    [locale],
  );
  const bidLevels = useMemo(() => sideLevels(bids, 'bid', levels), [bids, levels]);
  const askLevels = useMemo(() => sideLevels(asks, 'ask', levels), [asks, levels]);
  const empty = !loading && askLevels.length === 0 && bidLevels.length === 0;
  const all = useMemo(() => [...askLevels, ...bidLevels], [askLevels, bidLevels]);
  const changed = useChangedPrices(all, flash && !reducedMotion && !loading);
  const largest = Math.max(1, askLevels.at(-1)?.total ?? 0, bidLevels.at(-1)?.total ?? 0);
  const bestBid = bidLevels[0]?.price;
  const bestAsk = askLevels[0]?.price;
  const spread =
    bestBid !== undefined && bestAsk !== undefined
      ? { value: bestAsk - bestBid, mid: (bestAsk + bestBid) / 2 }
      : null;

  const row = (level: Level) => (
    <tr
      key={`${level.side}:${level.price}`}
      className="lilt-order-book__level"
      data-side={level.side}
      data-flash={changed.has(`${level.side}:${level.price}`) || undefined}
      style={{ '--lilt-depth': `${(level.total / largest) * 100}%` } as CSSProperties}
    >
      <th scope="row">
        {depth ? <span className="lilt-order-book__bar" aria-hidden="true" /> : null}
        {price(level.price)}
      </th>
      <td>{size(level.size)}</td>
      <td>{size(level.total)}</td>
    </tr>
  );
  const placeholders = (side: 'ask' | 'bid') =>
    Array.from({ length: Math.max(1, Math.min(50, levels)) }, (_, index) => (
      <tr key={`${side}-${index}`} className="lilt-order-book__placeholder" aria-hidden="true">
        <td>
          <SkeletonBlock width={`${86 - index * 4}%`} step={index} />
        </td>
        <td>
          <SkeletonBlock width="60%" step={index} />
        </td>
        <td>
          <SkeletonBlock width="72%" step={index} />
        </td>
      </tr>
    ));

  return (
    <ChartCard
      aria-label={ariaLabel}
      surface={surface}
      motion={motion}
      className={['lilt-card--order-book', className].filter(Boolean).join(' ')}
      style={style}
    >
      {/* The book's skeleton freezes and sinks into the spread before the levels land. */}
      <SkeletonExit leaving={skeletonLeaving} origin="center">
        <table
          ref={skeletonRef}
          className={loading ? 'lilt-order-book lilt-skeleton' : 'lilt-order-book'}
          data-depth={depth || undefined}
          data-style={loading ? loadingStyle : undefined}
          data-reduced-motion={reducedMotion || undefined}
          aria-busy={loading}
          aria-label={ariaLabel}
        >
          {header && title ? <caption>{title}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Price</th>
              <th scope="col">Size</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          {empty ? null : (
            <>
              <tbody aria-label="Asks">
                {loading ? placeholders('ask') : [...askLevels].reverse().map(row)}
              </tbody>
              <tbody aria-label="Spread">
                <tr className="lilt-order-book__spread">
                  <th scope="row">{loading ? '—' : spread ? price(spread.mid) : '—'}</th>
                  <td colSpan={2}>
                    {loading
                      ? 'Loading order book'
                      : spread
                        ? `Spread ${price(spread.value)} · ${percent(spread.value / spread.mid)}`
                        : 'No spread'}
                  </td>
                </tr>
              </tbody>
              <tbody aria-label="Bids">{loading ? placeholders('bid') : bidLevels.map(row)}</tbody>
            </>
          )}
        </table>
      </SkeletonExit>
      {empty ? <EmptySlot block state={emptyState} shape="rows" /> : null}
    </ChartCard>
  );
}

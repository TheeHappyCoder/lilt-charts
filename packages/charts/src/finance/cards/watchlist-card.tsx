'use client';

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import type { CardRange } from '../../cards/cartesian-card';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from '../../cards/chart-card';
import { numberFormatters } from '../../cards/format';
import type { KeysOfType, NumericKey, TextKey } from '../../cards/keys';
import { readField, readNumber } from '../../cards/observations-card';
import { EmptyShapeContext, EmptySlot } from '../../lifecycle/chart-empty';
import { SkeletonBlock } from '../../lifecycle/skeleton-block';
import { SkeletonExit, useSkeletonExit } from '../../lifecycle/skeleton-exit';
import { useSkeletonClock } from '../../lifecycle/use-skeleton-clock';
import { AnimatedNumber, type AnimatedNumberVariant } from '../../motion/animated-number';
import { useReducedMotion } from '../../motion/use-chart-motion';
import type {
  ChartEmptyState,
  ChartLoadingStyle,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
} from '../../types';
import { percentFormat, signedPercent } from './change-tone';

/** A column the list can sort by. `none` keeps your order. */
export type WatchlistSort = 'none' | 'symbol' | 'price' | 'change';

export interface WatchlistCardProps<Row> {
  /** Optional visible title. Use aria-label to name an embedded list. */
  title?: string;
  /** Show the header, including the headline and period select. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per instrument. Omit when `ranges` supplies the rows. */
  data?: readonly Row[];
  /** Static period label, e.g. "Today". */
  range?: string;
  /** Period select. Each period swaps the rows; prices roll and sparklines reshape between them. */
  ranges?: readonly CardRange<Row>[];
  /** Initial period id. Defaults to the first. */
  defaultRange?: string;
  /** Text field holding the ticker, such as "SOL". Unique per row. */
  symbol: TextKey<Row>;
  /** Text field holding the full name beside the ticker. */
  name?: TextKey<Row>;
  /** Field holding the latest price. */
  price: NumericKey<Row>;
  /** Field holding the fractional change over the period: 0.012 is up 1.2%. */
  change: NumericKey<Row>;
  /** Field holding recent prices, oldest first, drawn as a sparkline. */
  history?: KeysOfType<Row, readonly (number | null)[]>;
  /** Fields holding the period's low and high, drawn as a range with the price marked on it. */
  low?: NumericKey<Row>;
  high?: NumericKey<Row>;
  /** Initial sort. Defaults to `none`, your order. */
  sort?: WatchlistSort;
  /** Let readers sort by symbol, price or change from the column headings. Defaults to true. */
  sortable?: boolean;
  /** Price format, e.g. `{ style: 'currency', currency: 'USD' }`. */
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  surface?: ChartSurface;
  palette?: ChartPalette;
  /** How prices animate when they change: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  loading?: boolean;
  /**
   * How the skeleton moves while `loading`: `shimmer` (default) sweeps a highlight over still rows,
   * `draw` lays them in order, `breathe` lets them rise and settle.
   */
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows with no rows: `dots` (default), the chart's own `shape`, your own element
   * such as `<ChartEmpty>Nothing watched yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
  /** Reports the hovered or focused row, or null when the pointer leaves. */
  onSelectionChange?: (row: Row | null) => void;
}

interface Entry<Row> {
  row: Row;
  symbol: string;
  name: string | null;
  price: number | null;
  change: number | null;
  history: readonly number[];
  low: number | null;
  high: number | null;
}

/** A sparkline path through recent prices, scaled to the box. */
export function sparkPath(values: readonly number[], width: number, height: number): string {
  if (values.length < 2) return '';
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - 2 - ((value - low) / span) * (height - 4);
      return `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

/** The same path resampled to a fixed number of points, so one period can morph into another. */
function resampled(values: readonly number[], count: number): number[] {
  if (values.length < 2) return [...values];
  return Array.from({ length: count }, (_, index) => {
    const at = (index / (count - 1)) * (values.length - 1);
    const before = Math.floor(at);
    const after = Math.min(values.length - 1, before + 1);
    return values[before]! + (values[after]! - values[before]!) * (at - before);
  });
}

const SPARK = { width: 72, height: 28, points: 32 };

/**
 * The sparkline. Its path is set as a CSS `d`, so where the browser supports it a new period
 * reshapes the line rather than redrawing it; the first paint draws it in from the left.
 */
function Sparkline({ values, up }: { values: readonly number[]; up: boolean }) {
  const id = useId().replace(/:/g, '');
  const line = sparkPath(resampled(values, SPARK.points), SPARK.width, SPARK.height);
  if (!line) return <span className="lilt-watchlist__spark" aria-hidden="true" />;
  const area = `${line} L${SPARK.width} ${SPARK.height} L0 ${SPARK.height}Z`;
  return (
    <svg
      className="lilt-watchlist__spark"
      data-direction={up ? 'up' : 'down'}
      viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
      width={SPARK.width}
      height={SPARK.height}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={area}
        className="lilt-watchlist__spark-area"
        fill={`url(#${id}-fade)`}
        style={{ d: `path('${area}')` } as CSSProperties}
      />
      <path
        d={line}
        className="lilt-watchlist__spark-line"
        pathLength={1}
        style={{ d: `path('${line}')` } as CSSProperties}
      />
    </svg>
  );
}

function compareBy<Row>(sort: WatchlistSort, entries: readonly Entry<Row>[]): Entry<Row>[] {
  if (sort === 'none') return [...entries];
  const rank = (entry: Entry<Row>) =>
    sort === 'price' ? entry.price : sort === 'change' ? entry.change : null;
  return [...entries].sort((a, b) => {
    if (sort === 'symbol') return a.symbol.localeCompare(b.symbol);
    const x = rank(a);
    const y = rank(b);
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    return y - x;
  });
}

const PRICE_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

const EMPTY: readonly never[] = [];

/**
 * Rows travel to their new places when the sort changes: each row's old position is read before
 * the change and played back from there. Only a sort moves rows, so updating prices never
 * measures the table.
 */
function useSortTravel(sort: WatchlistSort, reduced: boolean) {
  const body = useRef<HTMLTableSectionElement>(null);
  const before = useRef(new Map<string, number>());
  const previous = useRef(sort);
  const remember = () => {
    const rows = body.current?.querySelectorAll<HTMLElement>('tr[data-symbol]') ?? [];
    before.current = new Map([...rows].map((row) => [row.dataset.symbol!, row.offsetTop]));
  };
  useLayoutEffect(() => {
    if (previous.current === sort) return;
    previous.current = sort;
    if (reduced || !body.current) return;
    for (const row of body.current.querySelectorAll<HTMLElement>('tr[data-symbol]')) {
      const from = before.current.get(row.dataset.symbol!);
      if (from === undefined || from === row.offsetTop) continue;
      row.animate(
        [{ transform: `translateY(${from - row.offsetTop}px)` }, { transform: 'translateY(0)' }],
        { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }
  }, [sort, reduced]);
  return { body, remember };
}

/**
 * A watchlist: each instrument's ticker and name, a sparkline of its recent path, where it sits in
 * its range, its price and its move. Prices and moves roll when they update, sparklines reshape
 * between periods, and sorted rows travel to their new places. The headline is the average move;
 * hovering a row reads that instrument instead.
 */
export function WatchlistCard<Row>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Watchlist',
  data,
  range,
  ranges,
  defaultRange,
  symbol,
  name,
  price,
  change,
  history,
  low,
  high,
  sort: initialSort = 'none',
  sortable = true,
  valueFormat = PRICE_FORMAT,
  locale = 'en-US',
  surface,
  palette,
  numberStyle,
  loading = false,
  loadingStyle = 'shimmer',
  empty = 'dots',
  motion,
  className,
  style,
  onSelectionChange,
}: WatchlistCardProps<Row>): ReactElement {
  const reduced = useReducedMotion(motion ?? 'auto');
  const formatKey = JSON.stringify(valueFormat);
  const money = useMemo(() => numberFormatters(locale, valueFormat), [locale, formatKey]);
  const percent = useMemo(() => percentFormat(locale), [locale]);
  const signed = useMemo(() => (value: number) => signedPercent(value, percent), [percent]);
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const rows = activeRange?.data ?? data ?? EMPTY;
  const [sort, setSort] = useState<WatchlistSort>(initialSort);
  const [hovered, setHovered] = useState<string | null>(null);
  const skeletonRef = useSkeletonClock<HTMLTableElement>(loading, loadingStyle);
  const leaving = useSkeletonExit(loading, reduced);
  const busy = loading || leaving;
  const entries = useMemo(
    () =>
      rows.map((row) => {
        const points = history ? readField(row, history) : null;
        return {
          row,
          symbol: String(readField(row, symbol) ?? ''),
          name: name ? String(readField(row, name) ?? '') || null : null,
          price: readNumber(row, price),
          change: readNumber(row, change),
          history: Array.isArray(points)
            ? points.filter(
                (value): value is number => typeof value === 'number' && Number.isFinite(value),
              )
            : [],
          low: low ? readNumber(row, low) : null,
          high: high ? readNumber(row, high) : null,
        };
      }),
    [rows, symbol, name, price, change, history, low, high],
  );
  const ordered = useMemo(() => compareBy(sort, entries), [sort, entries]);
  const travel = useSortTravel(sort, reduced);
  const active = busy ? null : (entries.find((entry) => entry.symbol === hovered) ?? null);
  const moves = entries.flatMap((entry) => (entry.change === null ? [] : [entry.change]));
  const average = moves.length ? moves.reduce((sum, value) => sum + value, 0) / moves.length : null;
  const ups = moves.filter((value) => value > 0).length;
  const downs = moves.filter((value) => value < 0).length;
  const inspect = (entry: Entry<Row> | null) => {
    setHovered(entry?.symbol ?? null);
    onSelectionChange?.(entry?.row ?? null);
  };
  const columns = 3 + (history ? 1 : 0) + (low && high ? 1 : 0);
  const heading = (column: Exclude<WatchlistSort, 'none'>, text: string, align?: 'end') => {
    const current = sort === column;
    return (
      <th
        scope="col"
        data-align={align}
        aria-sort={current ? (column === 'symbol' ? 'ascending' : 'descending') : undefined}
      >
        {sortable ? (
          <button
            type="button"
            className="lilt-watchlist__sort"
            data-active={current || undefined}
            disabled={busy}
            onClick={() => {
              travel.remember();
              setSort(current ? 'none' : column);
            }}
          >
            {text}
            <span aria-hidden="true">{current ? (column === 'symbol' ? '↑' : '↓') : ''}</span>
          </button>
        ) : (
          text
        )}
      </th>
    );
  };
  const placeholders = Array.from(
    { length: Math.max(3, Math.min(6, entries.length || 5)) },
    (_, index) => (
      <tr key={`skeleton-${index}`} className="lilt-watchlist__placeholder" aria-hidden="true">
        <th scope="row">
          <SkeletonBlock width="70%" height={12} step={index} />
        </th>
        {history ? (
          <td data-column="spark">
            <SkeletonBlock width="72px" height={14} step={index} />
          </td>
        ) : null}
        {low && high ? (
          <td data-column="range">
            <SkeletonBlock width="64px" height={4} step={index} />
          </td>
        ) : null}
        <td data-align="end">
          <SkeletonBlock width={`${64 - index * 4}px`} height={12} step={index} />
        </td>
        <td data-align="end">
          <SkeletonBlock width="52px" height={18} step={index} />
        </td>
      </tr>
    ),
  );
  return (
    <ChartCard
      aria-label={ariaLabel}
      surface={surface}
      palette={palette}
      numberStyle={numberStyle}
      motion={motion}
      className={['lilt-watchlist', className].filter(Boolean).join(' ')}
      style={style}
    >
      {header ? (
        <ChartCardHeader
          aside={
            ranges || range ? (
              <ChartCardRange
                label={range}
                options={ranges?.map(({ id, label }) => ({ id, label }))}
                value={activeRange?.id}
                onValueChange={setRangeId}
              />
            ) : null
          }
        >
          {title ? <ChartCardTitle>{title}</ChartCardTitle> : null}
          <ChartCardValue
            value={active ? active.price : average}
            format={active ? money.full : signed}
            loading={busy}
            motion={motion}
          >
            {busy ? null : active ? (
              <ChartCardCaption>
                {active.symbol}
                {active.change !== null ? ` · ${signed(active.change)}` : ''}
              </ChartCardCaption>
            ) : average !== null ? (
              <ChartCardCaption>
                average move · {ups} up, {downs} down
              </ChartCardCaption>
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}
      {!busy && !entries.length ? (
        <EmptyShapeContext.Provider value="rows">
          <EmptySlot block state={empty} />
        </EmptyShapeContext.Provider>
      ) : (
        <div className="lilt-watchlist__scroll">
          {/* The skeleton freezes and fades out before the rows land, like every Lilt card. */}
          <SkeletonExit leaving={leaving} origin="center">
            <table
              ref={skeletonRef}
              className={busy ? 'lilt-watchlist__table lilt-skeleton' : 'lilt-watchlist__table'}
              data-style={busy ? loadingStyle : undefined}
              data-period={activeRange?.id}
              aria-busy={loading}
              onMouseLeave={() => inspect(null)}
            >
              <caption className="lilt-chart__sr-only">{ariaLabel}</caption>
              <thead>
                <tr>
                  {heading('symbol', 'Symbol')}
                  {history ? (
                    <th scope="col" data-column="spark">
                      <span className="lilt-chart__sr-only">Recent prices</span>
                    </th>
                  ) : null}
                  {low && high ? (
                    <th scope="col" data-column="range">
                      Range
                    </th>
                  ) : null}
                  {heading('price', 'Price', 'end')}
                  {heading('change', 'Change', 'end')}
                </tr>
              </thead>
              <tbody ref={travel.body} data-columns={columns}>
                {busy
                  ? placeholders
                  : ordered.map((entry, index) => {
                      const up = (entry.change ?? 0) >= 0;
                      const place =
                        entry.low !== null &&
                        entry.high !== null &&
                        entry.price !== null &&
                        entry.high > entry.low
                          ? Math.max(
                              0,
                              Math.min(1, (entry.price - entry.low) / (entry.high - entry.low)),
                            )
                          : null;
                      const tone =
                        entry.change === null || entry.change === 0
                          ? 'neutral'
                          : entry.change > 0
                            ? 'positive'
                            : 'negative';
                      return (
                        <tr
                          key={entry.symbol}
                          data-symbol={entry.symbol}
                          tabIndex={0}
                          data-active={hovered === entry.symbol || undefined}
                          data-muted={(hovered !== null && hovered !== entry.symbol) || undefined}
                          style={
                            {
                              '--lilt-watchlist-delay': `${Math.min(index, 12) * 36}ms`,
                            } as CSSProperties
                          }
                          onMouseEnter={() => inspect(entry)}
                          onFocus={() => inspect(entry)}
                          onBlur={() => inspect(null)}
                        >
                          <th scope="row">
                            <span className="lilt-watchlist__symbol">{entry.symbol}</span>
                            {entry.name ? (
                              <span className="lilt-watchlist__name">{entry.name}</span>
                            ) : null}
                          </th>
                          {history ? (
                            <td data-column="spark">
                              <Sparkline values={entry.history} up={up} />
                            </td>
                          ) : null}
                          {low && high ? (
                            <td data-column="range">
                              {place !== null ? (
                                <span
                                  className="lilt-watchlist__range"
                                  role="img"
                                  aria-label={`${money.full(entry.low!)} to ${money.full(entry.high!)}`}
                                  style={{ '--lilt-watchlist-place': place } as CSSProperties}
                                >
                                  <span className="lilt-watchlist__range-mark" />
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          ) : null}
                          <td data-align="end" className="lilt-watchlist__price">
                            {entry.price === null ? (
                              '—'
                            ) : (
                              <AnimatedNumber
                                value={entry.price}
                                format={money.full}
                                variant={numberStyle}
                                motion={motion}
                              />
                            )}
                          </td>
                          <td data-align="end">
                            {entry.change === null ? (
                              '—'
                            ) : (
                              <span className="lilt-card__delta" data-tone={tone}>
                                <AnimatedNumber
                                  value={entry.change}
                                  format={signed}
                                  variant={numberStyle}
                                  motion={motion}
                                />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </SkeletonExit>
        </div>
      )}
    </ChartCard>
  );
}

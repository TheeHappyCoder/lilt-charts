'use client';

import { SkeletonBlock } from '../lifecycle/skeleton-block';
import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { useSkeletonClock } from '../lifecycle/use-skeleton-clock';

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { AnimatePresence, m } from 'motion/react';
import { rankingBar, rankingDomain } from '../engine/ranking';
import { REVEAL_EASE, useReducedMotion } from '../motion/use-chart-motion';
import { entranceStagger } from '../motion/entrance';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { glideTarget, useTouchGlide } from '../interaction/use-touch-glide';
import type {
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
  RankingOrder,
} from '../types';
import {
  ChartCard,
  ChartCardCaption,
  ChartCardDelta,
  ChartCardHeader,
  ChartCardRange,
  ChartCardTitle,
  ChartCardValue,
} from './chart-card';
import type { CardRange } from './cartesian-card';
import type { NumericKey, TextKey } from './keys';
import { useCardSelection } from './use-card-selection';
import { useCardFormat } from './format';
import { rankRows, sharePercent as percent, shareTotals } from './rank';
import type { AnimatedNumberVariant } from '../motion/animated-number';
import { MotionScope } from '../motion/motion-scope';

export { rankRows } from './rank';

export interface HorizontalBarChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per category. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field that names each row. Names must be unique. */
  category: TextKey<Row>;
  /** Numeric field to rank by. `null` rows show "No data" and sort last. */
  value: Key;
  /** Resting headline. Defaults to the total of every row. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.082 → +8.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "This month". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; rows re-rank smoothly. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  /** `descending` (default) puts the largest first; `input` keeps your order. */
  sort?: RankingOrder;
  /** Show the first rows only and add the rest together as one "Other" row. */
  limit?: number;
  /** Label of the combined row. Defaults to "Other". */
  otherLabel?: string;
  /** Each row's share of the total. Defaults to true; hidden when values are negative. */
  share?: boolean;
  /** Number each row by rank. Defaults to false. */
  rank?: boolean;
  /**
   * `inline` (default) sets each label on a soft bar; `track` draws a slim bar under the label;
   * `isometric` draws a solid block under the label whose front ends at the value, with a lit
   * roof and a shaded end receding behind it.
   */
  barStyle?: 'inline' | 'track' | 'isometric' | 'lollipop';
  /** Shorthand for depth across every card family: here it makes `barStyle` default to `isometric`. */
  depth?: boolean;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  /** Any CSS color for the bars. Defaults to the palette's first color. */
  color?: string;
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
  /**
   * The pinned category, by name, for a selection you own: external filters and a click on the
   * chart then share it. `null` pins nothing. Omit it and the card keeps its own pin.
   */
  selected?: string | null;
  /** Asked when a click, tap, or Escape pins or releases a category. */
  onSelectedChange?: (category: string | null) => void;
  palette?: ChartPalette;
  loading?: boolean;
  loadingStyle?: ChartLoadingStyle;
  /**
   * What the card shows when the period has no data: `dots` (default), the chart's own `shape`,
   * your own element such as `<ChartEmpty>No visits yet</ChartEmpty>`, or `null` for nothing.
   */
  empty?: ChartEmptyState;
  /** `none` turns off decorative motion; reduced-motion users get this automatically. */
  motion?: ChartMotion;
  className?: string;
  style?: CSSProperties | ChartStyle;
}

const EMPTY: readonly never[] = [];

/**
 * A ranked list card: each row carries a bar, its value, and its share of the total. Hovering a
 * row reads it in the headline; click pins it and the arrow keys move through the list.
 */
export function HorizontalBarChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Horizontal bar chart',
  data: suppliedData,
  category,
  value,
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  sort = 'descending',
  limit,
  otherLabel = 'Other',
  share = true,
  rank = false,
  depth = false,
  barStyle = depth ? 'isometric' : 'inline',
  valueFormat,
  locale,
  formatValue: suppliedFormatValue,
  color,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  selected,
  onSelectedChange,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion: motionMode = 'auto',
  className,
  style,
}: HorizontalBarChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonRef = useSkeletonClock<HTMLDivElement>(loading, loadingStyle);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;

  const ranked = useMemo(() => {
    try {
      return { rows: rankRows(data, category, value, sort, limit, otherLabel), error: null };
    } catch (cause) {
      return { rows: [], error: cause instanceof Error ? cause.message : 'Invalid rows.' };
    }
  }, [data, category, value, sort, limit, otherLabel]);
  const rows = ranked.rows;
  const totals = shareTotals(rows);
  const total = totals.total;
  // A share of a total that mixes gains and losses has no meaning, so it is left out.
  const shareable = share && totals.shareable;
  const domain = useMemo(() => rankingDomain(rows.map((row) => ({ ...row, datum: row }))), [rows]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const [pinned, setPinned] = useCardSelection(
    selected,
    onSelectedChange,
    ids,
    !loading && ranked.error === null,
  );
  const activeId = pinned ?? focused ?? hovered;
  const active = rows.find((row) => row.id === activeId);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const glideRef = useTouchGlide<string>({
    resolve: glideTarget,
    onGlide: setHovered,
    onLift: (id) => id !== null && setPinned(id),
    pinned: pinned !== null,
    onRelease: () => setPinned(null),
  });

  const restingHeadline =
    activeRange?.headline ?? suppliedHeadline ?? (totals.observed ? total : null);
  const shareOf = (amount: number | null) =>
    shareable && amount !== null ? percent.format(amount / total) : null;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(rows.length - 1, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = rows.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setPinned(null);
      return;
    } else return;
    event.preventDefault();
    buttons.current.get(rows[next]!.id)?.focus();
  };

  // Rows are objects: they spring to a new rank, arrive soft-focused and drain away on leaving.
  const spring = reduced
    ? { duration: 0 }
    : ({ type: 'spring', duration: 0.55, bounce: 0.18 } as const);
  // Rows whose rank changed blur while they travel; the counter restarts that blur each time.
  const order = rows.map((row) => row.id).join('|');
  const ranks = useRef<Map<string, number> | null>(null);
  // Rows that pass each other cross at different depths: a climbing row lifts over, a falling
  // row sinks under, so they never clip through one another.
  const [travel, setTravel] = useState<{
    passes: ReadonlyMap<string, 'over' | 'under'>;
    count: number;
  }>({
    passes: new Map(),
    count: 0,
  });
  useLayoutEffect(() => {
    const before = ranks.current;
    ranks.current = new Map(rows.map((row, index) => [row.id, index]));
    if (!before || reduced) return;
    const passes = new Map<string, 'over' | 'under'>();
    rows.forEach((row, index) => {
      const was = before.get(row.id);
      if (was !== undefined && was !== index) passes.set(row.id, index < was ? 'over' : 'under');
    });
    if (passes.size) setTravel((current) => ({ passes, count: current.count + 1 }));
    // `order` names every rank; the rows themselves are read through it.
  }, [order, reduced]);
  // A leaving row is lifted out of the list at once (`popLayout`), so the rest close its gap in
  // the same spring that re-ranks them while it fades where it was. Out of the grid it cannot
  // share the list's columns, so it keeps a copy of them, taken whenever the rows change.
  const listRef = useRef<HTMLOListElement | null>(null);
  const listNode = useCallback(
    (node: HTMLOListElement | null) => {
      listRef.current = node;
      glideRef(node);
    },
    [glideRef],
  );
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list)
      list.style.setProperty('--lilt-list-columns', getComputedStyle(list).gridTemplateColumns);
  }, [order]);
  const cardStyle = color ? ({ ...style, '--lilt-series-1': color } as ChartStyle) : style;

  return (
    <MotionScope layout>
      <ChartCard
        motion={motionMode}
        className={['lilt-list', className].filter(Boolean).join(' ')}
        style={cardStyle}
        aria-label={ariaLabel}
        surface={surface}
        badge={badge}
        numberStyle={numberStyle}
        palette={palette}
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
              value={active ? active.value : restingHeadline}
              format={format.value}
              loading={loading}
              motion={motionMode}
            >
              {loading ? null : active ? (
                <ChartCardCaption>
                  {active.label}
                  {shareOf(active.value) ? ` · ${shareOf(active.value)}` : ''}
                </ChartCardCaption>
              ) : rows.length > 0 && delta !== undefined ? (
                <ChartCardDelta value={delta} tone={deltaTone} />
              ) : null}
            </ChartCardValue>
          </ChartCardHeader>
        ) : null}

        {/* The rows' skeleton freezes and sinks toward the edge the bars grow from. */}
        <SkeletonExit leaving={skeletonLeaving} origin="left">
          {loading ? (
            <div
              ref={skeletonRef}
              className="lilt-list__rows lilt-skeleton"
              aria-hidden="true"
              data-style={loadingStyle}
              data-depth={barStyle === 'isometric' || undefined}
              data-reduced-motion={reduced || undefined}
            >
              {Array.from({ length: Math.min(limit ? limit + 1 : 5, 8) }, (_, index) => (
                <div className="lilt-list__skeleton" key={index}>
                  <SkeletonBlock width={`${88 - index * 13}%`} step={index} />
                </div>
              ))}
            </div>
          ) : ranked.error ? (
            <StatusContent kind="error" message={ranked.error} />
          ) : rows.length === 0 ? (
            <EmptySlot block state={emptyState} shape="rows" />
          ) : (
            // Rows measure their layout against this list, so a moving page or carousel never
            // animates them; only a change of rank does (`layoutDependency` below).
            <m.ol
              layoutRoot
              ref={listNode}
              className="lilt-list__rows"
              data-lilt-glide=""
              data-style={barStyle}
              data-share={shareable || undefined}
              data-rank={rank || undefined}
              aria-label={`${ariaLabel} ranking`}
            >
              {/* Rows arrive on first load the way new rows do later. */}
              <AnimatePresence initial={!reduced} mode="popLayout">
                {rows.map((row, index) => {
                  const bar = rankingBar(row.value, domain);
                  const isActive = row.id === active?.id;
                  const rowShare = shareOf(row.value);
                  const delay = reduced ? 0 : entranceStagger(index, rows.length, 120) / 1000;
                  return (
                    <m.li
                      key={row.id}
                      layout={reduced ? false : 'position'}
                      layoutDependency={order}
                      data-active={isActive || undefined}
                      data-muted={(active && !isActive) || undefined}
                      data-other={row.other || undefined}
                      data-travel={travel.passes.has(row.id) ? travel.count % 2 : undefined}
                      data-pass={travel.passes.get(row.id)}
                      initial={reduced ? false : { opacity: 0, filter: 'blur(8px)', y: 8 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                      exit="leave"
                      variants={{
                        leave: {
                          opacity: 0,
                          filter: 'blur(3px)',
                          transition: { duration: reduced ? 0 : 0.24, ease: REVEAL_EASE },
                        },
                      }}
                      transition={{
                        ...spring,
                        opacity: { duration: reduced ? 0 : 0.32, ease: REVEAL_EASE, delay },
                        filter: { duration: reduced ? 0 : 0.42, ease: REVEAL_EASE, delay },
                        y: { ...spring, delay },
                      }}
                    >
                      <button
                        type="button"
                        className="lilt-list__row"
                        data-glide-id={row.id}
                        ref={(node) => {
                          if (node) buttons.current.set(row.id, node);
                          else buttons.current.delete(row.id);
                        }}
                        tabIndex={row.id === (focused ?? rows[0]?.id) ? 0 : -1}
                        aria-label={`${row.label}: ${row.value === null ? 'No data' : format.value(row.value)}${rowShare ? `, ${rowShare} of total` : ''}`}
                        aria-pressed={pinned === row.id}
                        onPointerEnter={() => setHovered(row.id)}
                        onPointerLeave={() => setHovered(null)}
                        onFocus={() => setFocused(row.id)}
                        onBlur={() => setFocused(null)}
                        onClick={() => setPinned((current) => (current === row.id ? null : row.id))}
                        onKeyDown={(event) => onKeyDown(event, index)}
                      >
                        {rank ? (
                          <span className="lilt-list__rank" aria-hidden="true">
                            {row.other ? '' : index + 1}
                          </span>
                        ) : null}
                        <span className="lilt-list__bar-area">
                          {domain[0] < 0 ? (
                            <span className="lilt-list__zero" style={{ left: `${bar.zero}%` }} />
                          ) : null}
                          {row.value !== null ? (
                            <m.span
                              className="lilt-list__bar"
                              data-negative={row.value < 0 || undefined}
                              initial={reduced ? false : { left: `${bar.zero}%`, width: '0%' }}
                              animate={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                              variants={{
                                // A leaving row drains its bar back to zero as it fades.
                                leave: {
                                  left: `${bar.zero}%`,
                                  width: '0%',
                                  transition: {
                                    duration: reduced ? 0 : 0.24,
                                    ease: [0.65, 0, 0.35, 1],
                                  },
                                },
                              }}
                              transition={{ ...spring, delay }}
                            />
                          ) : null}
                          <span className="lilt-list__label">{row.label}</span>
                        </span>
                        <span className="lilt-list__value">
                          {row.value === null ? (
                            <span className="lilt-list__missing">No data</span>
                          ) : (
                            format.value(row.value)
                          )}
                        </span>
                        {shareable ? (
                          <span className="lilt-list__share">{rowShare ?? '—'}</span>
                        ) : null}
                      </button>
                    </m.li>
                  );
                })}
              </AnimatePresence>
            </m.ol>
          )}
        </SkeletonExit>
      </ChartCard>
    </MotionScope>
  );
}

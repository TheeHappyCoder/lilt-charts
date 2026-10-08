'use client';

import { scaleLinear } from 'd3-scale';
import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ActivityRing, activitySlots, type ActivitySelection } from '../activity-ring';
import { ValueLegend } from '../interaction/value-legend';
import { useSkeletonExit } from '../lifecycle/skeleton-exit';
import { StatusContent } from '../lifecycle/status-content';
import { EmptySlot } from '../lifecycle/chart-empty';
import { useReducedMotion } from '../motion/use-chart-motion';
import type {
  ChartLoadingStyle,
  ChartEmptyState,
  ChartMotion,
  ChartPalette,
  ChartStyle,
  ChartSurface,
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
import { summarize, useCardFormat } from './format';
import type { NumericKey } from './keys';
import type { AnimatedNumberVariant } from '../motion/animated-number';

/** How the resting headline sums up the day. */
export type ActivityAggregate = 'sum' | 'mean' | 'max';

export interface ActivityRingCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per time slot. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Numeric field with the time of day in hours, from 0 up to 24; 14.5 is 14:30. */
  hour: NumericKey<Row>;
  /** How much happened in the slot. `null` means not recorded; zero means nothing happened. */
  value: Key;
  /** Minutes per slot around the day. Must divide 1,440. Defaults to 60. */
  bucketMinutes?: number;
  /** What `value` counts, e.g. "requests". Defaults to the `value` field's name. */
  unit?: string;
  /** Value that fills a slot's dots completely. Defaults to a round number above the peak. */
  maximum?: number;
  /** How the resting headline sums up the day: `sum` (default), `mean`, or `max`. */
  aggregate?: ActivityAggregate;
  /** Turns each dot into a small puck with walls receding up and to the right. */
  depth?: boolean;
  /** Ring height in pixels, at least 180. Defaults to 280. */
  height?: number;
  /** Resting headline. Defaults to the `aggregate` of every recorded slot. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Today". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  /** Any CSS color for the dots. Defaults to the palette's first color. */
  color?: string;
  surface?: ChartSurface;
  /** A glass tab tucked behind the card's top edge, e.g. a caption, a command, or actions. */
  badge?: ReactNode;
  /** Headline motion: `count` (default), `pop`, `slide`, `roll`, `flow`, or `scramble`. */
  numberStyle?: AnimatedNumberVariant;
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
const DEFAULT_HEIGHT = 280;

/** "14:00" for 14, "03:20" for 3.333…; the day wraps at 24:00. */
export function clockLabel(hour: number): string {
  const minutes = Math.round(hour * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Plain-language versions of the ring's validation errors. */
function explain(message: string, bucketMinutes: number): string {
  if (message.includes('bucketMinutes'))
    return '`bucketMinutes` must divide a day evenly, like 15, 20, 30, 40, or 60.';
  if (message.includes('bucket-aligned'))
    return `Every time must fall on a ${bucketMinutes}-minute slot between 0 and 24, once.`;
  if (message.includes('within [0, maximum]'))
    return 'Values must be zero or more and no higher than `maximum`.';
  return message;
}

/**
 * An activity ring card: a 24-hour day wrapped into a ring of dot columns, each slot's dots
 * filled by how much happened then. Hovering or stepping around the ring reads each slot in the
 * headline; tiles name the busiest and quietest times.
 */
export function ActivityRingCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Activity ring',
  data: suppliedData,
  hour,
  value,
  bucketMinutes = 60,
  unit,
  maximum: suppliedMaximum,
  aggregate = 'sum',
  height = DEFAULT_HEIGHT,
  depth = false,
  headline: suppliedHeadline,
  delta: suppliedDelta,
  deltaTone,
  range,
  ranges,
  defaultRange,
  valueFormat,
  locale,
  formatValue: suppliedFormatValue,
  color,
  surface = 'elevated',
  badge,
  numberStyle,
  palette,
  loading = false,
  loadingStyle = 'shimmer',
  empty: emptyState = 'dots',
  motion = 'auto',
  className,
  style,
}: ActivityRingCardProps<Row, Key>): ReactElement {
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  // The dots' skeleton freezes and sinks into the middle before the day sweeps in round it.
  const skeletonLeaving = useSkeletonExit(loading, useReducedMotion(motion));
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;
  const measure = unit?.trim() || value;

  const readHour = useCallback(
    (row: Row) => (row as Record<string, unknown>)[hour] as number,
    [hour],
  );
  const readValue = useCallback(
    (row: Row) => {
      const cell = (row as Record<string, unknown>)[value];
      return typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
    },
    [value],
  );

  const day = useMemo(() => {
    const recorded = data.map(readValue).filter((cell): cell is number => cell !== null);
    const peakValue = Math.max(0, ...recorded);
    const maximum =
      suppliedMaximum ??
      (scaleLinear()
        .domain([0, Math.max(1, peakValue)])
        .nice(4)
        .domain()[1] as number);
    try {
      const slots = activitySlots(data, readHour, readValue, maximum, bucketMinutes);
      return { slots, maximum, error: null };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Invalid activity.';
      return { slots: [], maximum, error: explain(message, bucketMinutes) };
    }
  }, [data, readHour, readValue, suppliedMaximum, bucketMinutes]);

  const [selection, setSelection] = useState<ActivitySelection<Row> | null>(null);
  const onSelectionChange = useCallback(
    (next: ActivitySelection<Row> | null) => setSelection(next),
    [],
  );

  const recorded = day.slots.filter((slot) => slot.value !== null);
  const busiest = recorded.reduce<(typeof recorded)[number] | null>(
    (best, slot) => (!best || slot.value! > best.value! ? slot : best),
    null,
  );
  const quietest = recorded.reduce<(typeof recorded)[number] | null>(
    (best, slot) => (!best || slot.value! < best.value! ? slot : best),
    null,
  );
  const missing = data.length ? day.slots.length - recorded.length : 0;
  const restingHeadline =
    activeRange?.headline ??
    suppliedHeadline ??
    summarize(
      recorded.map((slot) => slot.value!),
      aggregate,
    );
  const empty = !loading && !day.error && data.length === 0;

  return (
    <ChartCard
      motion={motion}
      className={['lilt-activity-card', className].filter(Boolean).join(' ')}
      style={{ ...style, ...(color ? { '--lilt-series-1': color } : {}) } as ChartStyle}
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
            value={loading ? null : selection ? selection.value : restingHeadline}
            format={format.value}
            loading={loading}
            motion={motion}
          >
            {loading ? null : selection ? (
              <ChartCardCaption>
                {clockLabel(selection.hour)}
                {selection.value === null ? ' · No data' : ` · ${measure}`}
              </ChartCardCaption>
            ) : !empty && delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {day.error ? (
        <StatusContent kind="error" message={day.error} />
      ) : empty ? (
        <EmptySlot block state={emptyState} shape="ring" />
      ) : (
        <>
          <ActivityRing
            loadingStyle={loadingStyle}
            className="lilt-activity-card__ring"
            depth={depth}
            aria-label={ariaLabel}
            data={data}
            hour={readHour}
            value={readValue}
            maximum={day.maximum}
            bucketMinutes={bucketMinutes}
            unit={measure}
            formatValue={format.value}
            height={Math.max(180, height)}
            dotDensity={7}
            status={loading || skeletonLeaving ? 'loading' : 'ready'}
            skeletonLeaving={skeletonLeaving ? 'center' : undefined}
            motion={motion}
            resetKey={activeRange?.id}
            onSelectionChange={onSelectionChange}
            center={
              // An empty center, not null: null would fall back to the ring's default peak.
              loading ? (
                <></>
              ) : (
                <>
                  <strong>{busiest ? format.value(busiest.value!) : '—'}</strong>
                  <span>{busiest ? `peak · ${clockLabel(busiest.hour)}` : 'no data'}</span>
                </>
              )
            }
          />
          <ValueLegend
            className="lilt-card__tiles"
            aria-label={`${ariaLabel}: busiest and quietest times`}
            items={[
              {
                id: 'busiest',
                label: busiest && !loading ? `Busiest · ${clockLabel(busiest.hour)}` : 'Busiest',
                color: 'var(--lilt-series-1)',
                value: busiest?.value ?? null,
                formattedValue: busiest ? format.value(busiest.value!) : 'No data',
              },
              {
                id: 'quietest',
                label:
                  quietest && !loading ? `Quietest · ${clockLabel(quietest.hour)}` : 'Quietest',
                color: 'color-mix(in srgb, var(--lilt-series-1) 30%, transparent)',
                value: quietest?.value ?? null,
                formattedValue: quietest ? format.value(quietest.value!) : 'No data',
              },
            ]}
            renderValue={
              loading
                ? () => <span className="lilt-card__skeleton lilt-card__skeleton--tile" />
                : undefined
            }
          />
          {!loading && missing ? (
            <p className="lilt-activity-card__footer">
              {missing === 1 ? '1 time slot has' : `${missing} time slots have`} no data and{' '}
              {missing === 1 ? 'stays' : 'stay'} empty rather than reading as zero.
            </p>
          ) : null}
        </>
      )}
    </ChartCard>
  );
}

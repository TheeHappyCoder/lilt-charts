'use client';

import { SkeletonExit, useSkeletonExit } from '../lifecycle/skeleton-exit';
import { useSkeletonClock } from '../lifecycle/use-skeleton-clock';

import { useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useCategoryState } from '../interaction/use-category-state';
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
import type { NumericKey, TextKey } from './keys';
import { summarize, useCardFormat } from './format';
import type { AnimatedNumberVariant } from '../motion/animated-number';

/** How the resting headline summarizes every known cell. */
export type HeatmapAggregate = 'sum' | 'mean' | 'max';

export interface HeatmapChartCardProps<Row, Key extends NumericKey<Row>> {
  /** Optional visible title. Use aria-label to name an embedded chart. */
  title?: string;
  /** Show the header, including headline and period controls. Defaults to true. */
  header?: boolean;
  /** Accessible name, independent of the visible title. */
  'aria-label'?: string;
  /** One row per cell. Omit when `ranges` supplies the data. */
  data?: readonly Row[];
  /** Text field that places a cell in a column, e.g. the hour. */
  x: TextKey<Row>;
  /** Text field that places a cell in a row, e.g. the weekday. */
  y: TextKey<Row>;
  /** The measurement that sets the cell's color. `null` or an absent cell reads "No data". */
  value: Key;
  /** Column order. Defaults to the order columns first appear in the data. */
  columns?: readonly string[];
  /** Row order. Defaults to the order rows first appear in the data. */
  rows?: readonly string[];
  /**
   * Values at the light and dark ends of the scale. Fix it to compare periods on one scale;
   * by default it runs from zero (or the lowest value, if negative) to the highest value.
   */
  domain?: readonly [number, number];
  /** How the resting headline sums up the cells: `sum` (default), `mean`, or `max`. */
  aggregate?: HeatmapAggregate;
  /** Grid height in pixels, shared by the rows. Defaults to 30 pixels per row. */
  height?: number;
  /** Corner radius of each cell in pixels. Defaults to 5; 0 gives square cells. */
  radius?: number;
  /** Space between cells in pixels. Defaults to 4. */
  gap?: number;
  /**
   * Raises every cell as a cushioned tile with a lit top edge and a soft shadow. All tiles share
   * one height: color still carries the value.
   */
  depth?: boolean;
  /** Resting headline. Defaults to the `aggregate` of every known cell. */
  headline?: number;
  /** Fractional change shown as a chip, e.g. 0.052 → +5.2%. */
  delta?: number;
  deltaTone?: 'default' | 'inverse' | 'neutral';
  /** Static period label, e.g. "Last 7 days". */
  range?: string;
  /** Period select. Each range replaces data, delta, and headline; cells ease to their new color. */
  ranges?: readonly CardRange<Row>[];
  defaultRange?: string;
  valueFormat?: Intl.NumberFormatOptions;
  locale?: string;
  formatValue?: (value: number) => string;
  /** Any CSS color for the dark end of the scale. Defaults to the palette's first color. */
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

export interface HeatmapGridCell<Row> {
  /** `row` and `column` joined, unique within the grid. */
  id: string;
  label: string;
  row: string;
  column: string;
  datum: Row | null;
  /** `null` when the cell is missing or has no value; zero is a real reading. */
  value: number | null;
  /** Position between the domain ends, 0 to 1. `null` when there is no value. */
  intensity: number | null;
}

export interface HeatmapGrid<Row> {
  columns: string[];
  rows: string[];
  /** Row-major: every column of the first row, then the next row. */
  cells: HeatmapGridCell<Row>[];
  domain: readonly [number, number];
  error: string | null;
}

const EMPTY: readonly never[] = [];
/** Placeholder grid while the first data loads. */
const SKELETON = { rows: 7, columns: 12 };
const ROW_HEIGHT = 30;
/** Every label after this many columns is thinned out so the axis stays readable. */
const MAX_LABELS = 12;
/** Up to this many columns, every label fits even on a narrow card. */
const ALWAYS_LABELED = 8;

const cellId = (row: string, column: string) => `${row}\u0000${column}`;

/**
 * Lay rows of data out as a grid. Rows and columns keep the order given, or the order they
 * first appear; a cell with no row, or a `null` value, stays in the grid as missing.
 */
export function heatmapGrid<Row>({
  data,
  x,
  y,
  value,
  columns: columnOrder,
  rows: rowOrder,
  domain: suppliedDomain,
}: {
  data: readonly Row[];
  x: string;
  y: string;
  value: string;
  columns?: readonly string[];
  rows?: readonly string[];
  domain?: readonly [number, number];
}): HeatmapGrid<Row> {
  const read = (row: Row, key: string) => (row as Record<string, unknown>)[key];
  const fail = (error: string): HeatmapGrid<Row> => ({
    columns: [],
    rows: [],
    cells: [],
    domain: [0, 1],
    error,
  });

  const columns = columnOrder ? [...columnOrder] : [];
  const rows = rowOrder ? [...rowOrder] : [];
  const observed = new Map<string, { datum: Row; value: number | null }>();
  let min = Infinity;
  let max = -Infinity;
  for (const datum of data) {
    const column = String(read(datum, x) ?? '');
    const row = String(read(datum, y) ?? '');
    for (const [name, list, fixed, key] of [
      [column, columns, columnOrder, 'columns'],
      [row, rows, rowOrder, 'rows'],
    ] as const) {
      if (list.includes(name)) continue;
      if (fixed) return fail(`“${name}” isn’t listed in \`${key}\`.`);
      list.push(name);
    }
    const id = cellId(row, column);
    if (observed.has(id)) return fail(`${row}, ${column} appears twice; each cell needs one row.`);
    const cell = read(datum, value);
    const reading = typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
    if (reading !== null) {
      min = Math.min(min, reading);
      max = Math.max(max, reading);
    }
    observed.set(id, { datum, value: reading });
  }

  let domain: readonly [number, number];
  if (suppliedDomain) {
    if (!(suppliedDomain[0] < suppliedDomain[1]))
      return fail('`domain` needs a low end below its high end.');
    if (min < suppliedDomain[0] || max > suppliedDomain[1])
      return fail('A value falls outside `domain`; widen it so every cell has a color.');
    domain = suppliedDomain;
  } else {
    const low = min === Infinity ? 0 : Math.min(0, min);
    const high = max === -Infinity ? low + 1 : max;
    domain = [low, high > low ? high : low + 1];
  }

  const span = domain[1] - domain[0];
  const cells = rows.flatMap((row) =>
    columns.map((column) => {
      const cell = observed.get(cellId(row, column));
      const reading = cell?.value ?? null;
      return {
        id: cellId(row, column),
        label: `${row}, ${column}`,
        row,
        column,
        datum: cell?.datum ?? null,
        value: reading,
        intensity: reading === null ? null : (reading - domain[0]) / span,
      };
    }),
  );
  return { columns, rows, cells, domain, error: null };
}

/** The share of the accent color a cell gets: never fully clear, so zero still reads as a value. */
export const cellStrength = (intensity: number) => 12 + intensity * 83;

/**
 * Which axis labels show. Up to eight columns always fit; beyond that, narrow cards drop every
 * other label (`minor`), and past twelve columns only every nth label shows at all.
 */
export function labelTier(index: number, count: number): 'major' | 'minor' | 'hidden' {
  if (count <= ALWAYS_LABELED) return 'major';
  const step = Math.ceil(count / MAX_LABELS);
  if (index % (step * 2) === 0) return 'major';
  return index % step === 0 ? 'minor' : 'hidden';
}

/**
 * A heatmap card: a grid of cells colored by value, with the row and column of each cell
 * labeled. Hovering or focusing a cell reads it in the headline; arrow keys move between cells.
 * Missing cells are hatched and say "No data", so they never read as zero.
 */
export function HeatmapChartCard<Row, const Key extends NumericKey<Row>>({
  title,
  header = true,
  'aria-label': ariaLabel = title || 'Heatmap chart',
  data: suppliedData,
  x,
  y,
  value,
  columns,
  rows: rowOrder,
  domain,
  aggregate = 'sum',
  height,
  radius = 5,
  gap = 4,
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
  motion: motionMode = 'auto',
  className,
  style,
}: HeatmapChartCardProps<Row, Key>): ReactElement {
  const reduced = useReducedMotion(motionMode);
  const skeletonRef = useSkeletonClock<HTMLDivElement>(loading, loadingStyle);
  const skeletonLeaving = useSkeletonExit(loading, reduced);
  const format = useCardFormat({ valueFormat, locale, formatValue: suppliedFormatValue });
  const [rangeId, setRangeId] = useState(defaultRange ?? ranges?.[0]?.id);
  const activeRange = ranges?.find((item) => item.id === rangeId) ?? ranges?.[0];
  // Each period change restarts the light motion blur while cells re-colour in a ripple.
  const [periods, setPeriods] = useState({ id: activeRange?.id, count: 0 });
  if (periods.id !== activeRange?.id) setPeriods({ id: activeRange?.id, count: periods.count + 1 });
  const data = activeRange?.data ?? suppliedData ?? (EMPTY as readonly Row[]);
  const delta = activeRange ? activeRange.delta : suppliedDelta;

  const grid = useMemo(
    () => heatmapGrid({ data, x, y, value, columns, rows: rowOrder, domain }),
    [data, x, y, value, columns, rowOrder, domain],
  );
  const selection = useCategoryState(
    grid.cells,
    !loading && !skeletonLeaving,
    undefined,
    undefined,
    grid.columns.length,
  );
  const active = grid.cells.find((cell) => cell.id === selection.active?.id);

  const known = grid.cells.flatMap((cell) => (cell.value === null ? [] : [cell.value]));
  const restingHeadline = activeRange?.headline ?? suppliedHeadline ?? summarize(known, aggregate);
  const missing = grid.cells.some((cell) => cell.value === null);
  const empty = !loading && (grid.error !== null || grid.cells.length === 0);

  const shape =
    loading && !grid.cells.length
      ? SKELETON
      : {
          rows: grid.rows.length,
          columns: grid.columns.length,
        };
  const rowHeight = height
    ? Math.max(8, (height - gap * Math.max(0, shape.rows - 1)) / Math.max(1, shape.rows))
    : ROW_HEIGHT;

  return (
    <ChartCard
      motion={motionMode}
      className={['lilt-heatmap-card', className].filter(Boolean).join(' ')}
      style={
        {
          ...style,
          '--lilt-heatmap-card-gap': `${gap}px`,
          '--lilt-heatmap-card-radius': `${radius}px`,
          '--lilt-heatmap-card-row': `${rowHeight}px`,
          '--lilt-heatmap-card-columns': shape.columns,
          ...(color ? { '--lilt-heatmap-card-color': color } : {}),
        } as ChartStyle
      }
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
                {active.row} · {active.column}
                {active.value === null ? ' · No data' : ''}
              </ChartCardCaption>
            ) : !empty && delta !== undefined ? (
              <ChartCardDelta value={delta} tone={deltaTone} />
            ) : null}
          </ChartCardValue>
        </ChartCardHeader>
      ) : null}

      {/* The grid's skeleton freezes and sinks into its middle before the cells come in. */}
      <SkeletonExit leaving={skeletonLeaving} origin="center">
        {grid.error ? (
          <StatusContent kind="error" message={grid.error} />
        ) : empty ? (
          <EmptySlot block state={emptyState} shape="tiles" />
        ) : loading ? (
          // The same table and footer as the loaded grid, so the card keeps its height.
          <div
            ref={skeletonRef}
            className="lilt-heatmap-card__placeholder lilt-skeleton"
            aria-hidden="true"
            data-style={loadingStyle}
            data-depth={depth || undefined}
            data-reduced-motion={reduced || undefined}
          >
            <table className="lilt-heatmap-card__grid" role="presentation">
              <tbody>
                {Array.from({ length: shape.rows }, (_, row) => (
                  <tr key={row}>
                    <th className="lilt-heatmap-card__row-label">{grid.rows[row]}</th>
                    {Array.from({ length: shape.columns }, (_, column) => (
                      <td key={column}>
                        {/* The shimmer travels across by column; draw and breathe ripple
                          diagonally from the top-left cell. */}
                        <span
                          className="lilt-heatmap-card__skeleton"
                          style={
                            {
                              '--lilt-shine-delay': `${(column / shape.columns) * 0.9}s`,
                              '--lilt-skeleton-step': column + row,
                            } as CSSProperties
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  {Array.from({ length: shape.columns }, (_, column) => (
                    <th key={column} className="lilt-heatmap-card__column-label" />
                  ))}
                </tr>
              </tfoot>
            </table>
            <div className="lilt-heatmap-card__footer">
              <span className="lilt-heatmap-card__scale">
                <span className="lilt-heatmap-card__ramp" />
              </span>
            </div>
          </div>
        ) : (
          <>
            <table
              data-lilt-snap={periods.count ? periods.count % 2 : undefined}
              ref={selection.glideRef}
              className="lilt-heatmap-card__grid"
              role="table"
              data-depth={depth || undefined}
              data-lilt-glide=""
              aria-label={ariaLabel}
              data-motion={reduced ? 'none' : undefined}
            >
              <tbody role="rowgroup">
                {grid.rows.map((row, rowIndex) => (
                  <tr key={row} role="row">
                    <th
                      scope="row"
                      role="rowheader"
                      className="lilt-heatmap-card__row-label"
                      data-active={active?.row === row || undefined}
                    >
                      {row}
                    </th>
                    {grid.columns.map((column, columnIndex) => {
                      const index = rowIndex * grid.columns.length + columnIndex;
                      const cell = grid.cells[index]!;
                      const inCross = active && (active.row === row || active.column === column);
                      return (
                        <td key={column} role="cell">
                          <button
                            type="button"
                            className="lilt-heatmap-card__cell"
                            {...selection.bind(cell.id, index)}
                            aria-label={`${row}, ${column}: ${
                              cell.value === null ? 'No data' : format.value(cell.value)
                            }`}
                            data-missing={cell.value === null || undefined}
                            data-active={active?.id === cell.id || undefined}
                            data-muted={(active && !inCross) || undefined}
                            style={
                              {
                                '--lilt-heatmap-card-strength':
                                  cell.intensity === null
                                    ? undefined
                                    : `${cellStrength(cell.intensity)}%`,
                                '--lilt-heatmap-card-delay': `${Math.min(160, columnIndex * 12)}ms`,
                                // Colour changes ripple diagonally from the top-left cell.
                                '--lilt-heatmap-card-ripple': `${Math.round(((rowIndex + columnIndex) / Math.max(1, grid.rows.length + grid.columns.length - 2)) * 320)}ms`,
                              } as CSSProperties
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot role="rowgroup">
                <tr role="row">
                  <td role="cell" />
                  {grid.columns.map((column, index) => (
                    <th
                      key={column}
                      scope="col"
                      role="columnheader"
                      className="lilt-heatmap-card__column-label"
                      data-tier={labelTier(index, grid.columns.length)}
                      data-active={active?.column === column || undefined}
                    >
                      <span>{column}</span>
                    </th>
                  ))}
                </tr>
              </tfoot>
            </table>
            <div className="lilt-heatmap-card__footer">
              {missing ? (
                <span className="lilt-heatmap-card__key">
                  <span className="lilt-heatmap-card__swatch" data-missing="" aria-hidden="true" />
                  No data
                </span>
              ) : null}
              <span className="lilt-heatmap-card__scale">
                <span>{format.axis(grid.domain[0])}</span>
                <span className="lilt-heatmap-card__ramp" aria-hidden="true" />
                <span>{format.axis(grid.domain[1])}</span>
              </span>
            </div>
          </>
        )}
      </SkeletonExit>
    </ChartCard>
  );
}

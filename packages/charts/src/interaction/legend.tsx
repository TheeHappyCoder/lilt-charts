import { useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { useToolkitSnapshot } from '../runtime/chart-runtime';
import type { ChartComparisonSeries, ChartLegendValue, LegendProps } from '../types';
import type { CartesianChartModel } from '../model/cartesian-model';
import { useChartRuntime } from '../runtime/chart-runtime';
import { LegendMeter, legendMeterScale } from './legend-meter';
const subscribeNever = () => () => undefined;
const emptyModelState = () => null;

type LegendEntry = ChartLegendValue & {
  color: string;
  visible: boolean;
  x?: number;
  row?: unknown;
  sourceIndex?: number;
};

type ModelLegendEntry<Id extends string> = ChartLegendValue & { id: Id; color: string };
export type ModelObservationLegendEntry<Row> = ChartLegendValue & {
  color: string;
  x: number;
  row: Row;
  sourceIndex: number;
};
type ModelLegendBase<Row, Id extends string> = Omit<
  LegendProps,
  | 'series'
  | 'by'
  | 'renderValue'
  | 'renderLabel'
  | 'renderSwatch'
  | 'renderDifference'
  | 'renderItem'
> & {
  model: CartesianChartModel<Row, Id>;
};
type ModelSeriesLegendProps<Row, Id extends string> = ModelLegendBase<Row, Id> & {
  by?: 'series';
  series?: NoInfer<Id>;
  renderValue?: (entry: ModelLegendEntry<Id>) => ReactNode;
  renderLabel?: (entry: ModelLegendEntry<Id>) => ReactNode;
  renderSwatch?: (entry: ModelLegendEntry<Id>) => ReactNode;
  renderDifference?: (
    difference: ChartComparisonSeries<Id>,
    entry: ModelLegendEntry<Id>,
  ) => ReactNode;
  renderItem?: (
    entry: ModelLegendEntry<Id>,
    actions: {
      toggle: () => void;
      focus: () => void;
      isolate: () => void;
      comparison: ChartComparisonSeries<Id> | null;
    },
  ) => ReactNode;
};
type ModelObservationLegendProps<Row, Id extends string> = ModelLegendBase<Row, Id> & {
  by: 'observation';
  series: NoInfer<Id>;
  renderValue?: (entry: ModelObservationLegendEntry<Row>) => ReactNode;
  renderLabel?: (entry: ModelObservationLegendEntry<Row>) => ReactNode;
  renderSwatch?: (entry: ModelObservationLegendEntry<Row>) => ReactNode;
  renderItem?: (
    entry: ModelObservationLegendEntry<Row>,
    actions: {
      toggle: () => void;
      focus: () => void;
      isolate: () => void;
      comparison: null;
    },
  ) => ReactNode;
};
export type ModelLegendProps<Row, Id extends string> =
  | ModelSeriesLegendProps<Row, Id>
  | ModelObservationLegendProps<Row, Id>;

/** Normal-flow presentation; placement belongs to the consumer's layout. */
export function Legend<Row, Id extends string>(
  props: ModelLegendProps<Row, Id>,
): ReactElement | null;
export function Legend(props?: LegendProps & { model?: never }): ReactElement | null;
export function Legend(
  props: LegendProps | ModelLegendProps<unknown, string> = {},
): ReactElement | null {
  const {
    model,
    className,
    style,
    variant = 'cards',
    swatch: swatchShape = 'square',
    by = 'series',
    series: observationSeries,
    interactive = true,
    allowIsolate = false,
    renderValue,
    renderLabel,
    renderSwatch,
    renderDifference,
    renderItem,
  } = props as LegendProps & { model?: CartesianChartModel<unknown, string> };
  const runtime = useChartRuntime();
  if (model && model !== runtime.model) {
    throw new Error('Lilt Legend model must be the model supplied to its Chart.');
  }
  const { legend } = useToolkitSnapshot();
  const modelState = useSyncExternalStore(
    model?.subscribe ?? subscribeNever,
    model?.getSnapshot ?? emptyModelState,
    model?.getSnapshot ?? emptyModelState,
  );
  if (!legend) return null;
  const seriesEntries = model ? (modelState?.legend ?? []) : legend.series;
  const inspectedX = model ? (modelState?.inspection?.x ?? null) : legend.inspectedX;
  const pinnedX = model
    ? modelState?.inspection?.pinned
      ? modelState.inspection.x
      : null
    : legend.pinnedX;
  const visibleIds = seriesEntries.filter((item) => item.visible).map((item) => item.id);
  const descriptor =
    seriesEntries.find((item) => item.id === observationSeries) ??
    seriesEntries.find((item) => item.visible) ??
    seriesEntries[0];
  const observationRows = model ? (modelState?.observations ?? []) : legend.observations;
  const entries: readonly LegendEntry[] =
    by === 'observation'
      ? descriptor
        ? observationRows.map((row) => ({
            id: row.id,
            x: row.x,
            row: row.row,
            sourceIndex: row.sourceIndex,
            label: row.label,
            color: descriptor.color,
            visible: true,
            value: row.values[descriptor.id] ?? null,
            formattedValue: row.formattedValues[descriptor.id] ?? 'No data',
            status: row.statuses[descriptor.id] ?? 'observed',
          }))
        : []
      : seriesEntries;
  const meter = legendMeterScale(
    entries.filter((entry) => entry.visible).map((entry) => entry.value),
  );
  const swatch = (entry: LegendEntry) =>
    renderSwatch?.(entry) ?? <span className="lilt-chart__legend-swatch" aria-hidden="true" />;

  return (
    <div
      aria-label={by === 'observation' ? 'Observations' : 'Series'}
      className={['lilt-chart__legend', className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-swatch={swatchShape === 'square' ? undefined : swatchShape}
      data-motion={legend.reducedMotion ? 'none' : undefined}
      role="group"
      style={style}
    >
      {entries.map((entry) => {
        const focused =
          by === 'observation' ? inspectedX === entry.x : inspectedX !== null && entry.visible;
        const pinned = by === 'observation' && pinnedX === entry.x;
        const isolated = by === 'series' && legend.isolatedId === entry.id;
        const difference =
          by === 'series'
            ? ((model ? modelState?.comparison : legend.comparison)?.series.find(
                (item) => item.id === entry.id,
              ) ?? null)
            : null;
        const focus = () => {
          if (by === 'observation') {
            if (entry.x !== undefined) legend.onInspect(entry.x, false);
          } else legend.onFocus(entry.visible ? entry.id : null);
        };
        const toggle = () => {
          if (by === 'observation') {
            if (pinned) legend.onReleaseInspect();
            else if (entry.x !== undefined) legend.onInspect(entry.x, true);
          } else {
            legend.onVisibleChange(
              entry.visible
                ? visibleIds.filter((id) => id !== entry.id)
                : [...visibleIds, entry.id],
            );
          }
        };
        const isolate = () => {
          if (by !== 'series') return;
          if (isolated) legend.onRestore();
          else legend.onIsolate(entry.id);
        };
        const content = (
          <>
            <span className="lilt-chart__legend-name">
              {swatch(entry)}
              <span className="lilt-chart__legend-label">
                {renderLabel?.(entry) ?? entry.label}
              </span>
            </span>
            {variant === 'inline' ? (
              renderValue ? (
                <span className="lilt-chart__legend-inline-value">{renderValue(entry)}</span>
              ) : null
            ) : (
              <>
                <strong className="lilt-chart__legend-value">
                  {renderValue?.(entry) ?? entry.formattedValue}
                </strong>
                {difference && renderDifference ? (
                  <span className="lilt-chart__legend-difference">
                    {renderDifference(difference, entry)}
                  </span>
                ) : null}
              </>
            )}
            {variant === 'bars' ? <LegendMeter value={entry.value} scale={meter} /> : null}
          </>
        );
        return (
          <span
            className="lilt-chart__legend-item"
            data-interactive={interactive || undefined}
            data-visible={entry.visible}
            data-active={focused || undefined}
            data-pinned={pinned || undefined}
            key={entry.id}
            onFocus={interactive ? focus : undefined}
            onBlur={
              interactive
                ? (event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) return;
                    if (by === 'observation') legend.onClearInspect();
                    else legend.onFocus(null);
                  }
                : undefined
            }
            onPointerEnter={interactive ? focus : undefined}
            onPointerLeave={
              interactive
                ? (event) => {
                    if (event.currentTarget.querySelector(':focus-visible')) return;
                    if (by === 'observation') legend.onClearInspect();
                    else legend.onFocus(null);
                  }
                : undefined
            }
            style={{ '--lilt-legend-color': entry.color } as CSSProperties}
          >
            {renderItem ? (
              renderItem(entry, { toggle, focus, isolate, comparison: difference })
            ) : interactive ? (
              <button
                type="button"
                className="lilt-chart__legend-toggle"
                aria-pressed={by === 'observation' ? pinned : entry.visible}
                aria-label={`${by === 'observation' ? 'Inspect' : entry.visible ? 'Hide' : 'Show'} ${entry.label}: ${entry.formattedValue}`}
                onClick={toggle}
              >
                {content}
              </button>
            ) : (
              <span className="lilt-chart__legend-static">{content}</span>
            )}
            {interactive && allowIsolate && by === 'series' && seriesEntries.length > 1 ? (
              <button
                aria-label={isolated ? 'Restore selection' : `Isolate ${entry.label}`}
                aria-pressed={isolated}
                className="lilt-chart__legend-isolate"
                onClick={isolate}
                type="button"
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M9.13432 2.5C6.46805 2.56075 4.9107 2.81456 3.84664 3.87493C2.91537 4.80297 2.60406 6.10756 2.5 8.2M14.8657 2.5C17.532 2.56075 19.0893 2.81456 20.1534 3.87493C21.0846 4.80297 21.3959 6.10756 21.5 8.2M14.8657 21.5C17.532 21.4392 19.0893 21.1854 20.1534 20.1251C21.0846 19.197 21.3959 17.8924 21.5 15.8M9.13432 21.5C6.46805 21.4392 4.9107 21.1854 3.84664 20.1251C2.91537 19.197 2.60406 17.8924 2.5 15.8" />
                  <path d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 12Z" />
                </svg>
              </button>
            ) : null}
          </span>
        );
      })}
      {interactive && by === 'series' && visibleIds.length === 0 ? (
        <button className="lilt-chart__legend-show-all" onClick={legend.onShowAll} type="button">
          Show all series
        </button>
      ) : null}
    </div>
  );
}

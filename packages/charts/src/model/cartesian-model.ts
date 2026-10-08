import { useEffect, useRef, useSyncExternalStore } from 'react';
import { summarizeRange, type ChartSummary } from '../data/chart-data';
import { normalizeData, type NormalizedData } from '../engine/normalize';
import { comparisonRows } from '../interaction/comparison-answer';
import { createChartController } from '../interaction/chart-controller';
import { seriesColor } from '../paint';
import type {
  ChartComparisonResult,
  ChartPercentagePolicy,
  ChartController,
  ChartSeries,
  ChartYConfig,
  ChartTooltipContext,
  NumericXConfig,
  TimeXConfig,
  ChartRange,
  ChartPinOptions,
} from '../types';
import type { LegendSnapshot } from '../runtime/chart-runtime';
import { fieldEntries } from '../interaction/field-values';

export type CartesianModelLegendItem<Id extends string> = LegendSnapshot['series'][number] & {
  id: Id;
};
export type CartesianModelObservation<Row> = LegendSnapshot['observations'][number] & {
  row: Row;
};

export interface CartesianModelState<Row, SeriesId extends string> {
  readonly availability: 'loading' | 'ready' | 'error';
  readonly acceptedRevision: number;
  readonly inspection: ChartTooltipContext<Row, SeriesId> | null;
  readonly comparison: ChartComparisonResult<SeriesId, Row> | null;
  readonly visibleSeries: readonly SeriesId[];
  readonly legend: readonly CartesianModelLegendItem<SeriesId>[];
  readonly observations: readonly CartesianModelObservation<Row>[];
}

export interface CartesianModelFrame<Row, Id extends string> {
  readonly data: readonly Row[];
  readonly x: TimeXConfig<Row> | NumericXConfig<Row>;
  readonly y?: ChartYConfig;
  readonly series: readonly (ChartSeries<Row> & { readonly id: Id })[];
}

export interface CartesianModelInput<Row, Id extends string> extends CartesianModelFrame<Row, Id> {
  readonly status?: 'loading' | 'ready' | 'error';
  readonly resetKey?: string | number;
  readonly control?: CartesianModelControl<Id>;
}

export interface CartesianModelControl<Id extends string> {
  readonly inspection?: { readonly x: number; readonly pinned: boolean } | null;
  readonly visibleSeries?: readonly Id[];
  readonly comparison?: ChartRange | null;
  readonly onInspectionRequest?: (
    inspection: { readonly x: number; readonly pinned: boolean } | null,
  ) => void;
  readonly onVisibleSeriesRequest?: (ids: readonly Id[]) => void;
  readonly onComparisonRequest?: (range: ChartRange | null) => void;
}

export interface CartesianSummaryQuery<Id extends string> {
  readonly measure: Id;
  readonly scope?: ChartRange | null;
  readonly aggregate: 'sum' | 'mean' | 'min' | 'max' | 'first' | 'last' | 'change';
  readonly missing?: 'exclude' | 'require-complete';
}

export interface CartesianSummaryResult<Id extends string> {
  readonly measure: Id;
  readonly value: number | null;
  readonly formattedValue: string;
  readonly unit: string | null;
  readonly coverage: {
    readonly observed: number;
    readonly missing: number;
    readonly total: number;
  };
  readonly unavailableReason: string | null;
}

export interface CartesianModelActions<SeriesId extends string> {
  readonly inspect: (x: number) => void;
  readonly clearInspection: () => void;
  readonly pin: (x: number, options?: ChartPinOptions) => void;
  readonly release: () => void;
  readonly setVisibleSeries: (ids: readonly SeriesId[]) => void;
  readonly focusSeries: (id: SeriesId | null) => void;
  readonly compare: (range: ChartRange, percentage?: ChartPercentagePolicy) => void;
  readonly clearComparison: () => void;
  readonly focusComparison: () => void;
  readonly fullRange: () => void;
}

/** Carries the source row and declared series IDs across JSX component boundaries. */
export interface CartesianChartModel<Row, SeriesId extends string> {
  readonly data: readonly Row[];
  readonly x: TimeXConfig<Row> | NumericXConfig<Row>;
  readonly series: readonly (ChartSeries<Row> & { readonly id: SeriesId })[];
  readonly getFrame: () => CartesianModelFrame<Row, SeriesId>;
  readonly getAcceptedFrame: () => CartesianModelFrame<Row, SeriesId> | null;
  readonly getAvailability: () => CartesianModelState<Row, SeriesId>['availability'];
  readonly getResetKey: () => string | number | undefined;
  /** Internal view projection of persistent inspection, comparison and focus. */
  readonly getController: () => ChartController;
  readonly update: (frame: CartesianModelInput<Row, SeriesId>) => void;
  readonly summarize: (query: CartesianSummaryQuery<SeriesId>) => CartesianSummaryResult<SeriesId>;
  readonly actions: CartesianModelActions<SeriesId>;
  readonly getSnapshot: () => CartesianModelState<Row, SeriesId>;
  readonly subscribe: (listener: () => void) => () => void;
}

type ModelActions = {
  inspect: (x: number) => void;
  clearInspection: () => void;
  pin: (x: number, options?: ChartPinOptions) => void;
  release: () => void;
  setVisibleSeries: (ids: readonly string[]) => void;
  focusSeries: (id: string | null) => void;
  compare: (range: ChartRange) => void;
  clearComparison: () => void;
  focusComparison: () => void;
  fullRange: () => void;
};
type Publisher = (
  state: {
    inspection: ChartTooltipContext<unknown> | null;
    comparison: ChartComparisonResult | null;
    visibleSeries: readonly string[];
    legend: readonly LegendSnapshot['series'][number][];
  },
  actions: ModelActions,
) => void;
const publishers = new WeakMap<object, Publisher>();
const detachments = new WeakMap<object, () => void>();

function sameInspection(
  a: ChartTooltipContext<unknown> | null,
  b: ChartTooltipContext<unknown> | null,
) {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    a.row !== b.row ||
    a.x !== b.x ||
    a.sourceIndex !== b.sourceIndex ||
    a.formattedX !== b.formattedX ||
    a.pinned !== b.pinned ||
    (a.activeSeriesId ?? null) !== (b.activeSeriesId ?? null) ||
    a.series.length !== b.series.length
  )
    return false;
  return a.series.every((item, index) => {
    const other = b.series[index];
    return (
      other &&
      item.id === other.id &&
      item.value === other.value &&
      item.formattedValue === other.formattedValue &&
      item.status === other.status &&
      item.fields.length === other.fields.length &&
      item.fields.every(
        (field, fieldIndex) =>
          field.id === other.fields[fieldIndex]?.id &&
          field.label === other.fields[fieldIndex]?.label &&
          field.value === other.fields[fieldIndex]?.value &&
          field.formattedValue === other.fields[fieldIndex]?.formattedValue,
      )
    );
  });
}

function sameComparison(a: ChartComparisonResult | null, b: ChartComparisonResult | null) {
  if (a === b) return true;
  if (
    !a ||
    !b ||
    a.kind !== b.kind ||
    a.startRow !== b.startRow ||
    a.endRow !== b.endRow ||
    a.startSourceIndex !== b.startSourceIndex ||
    a.endSourceIndex !== b.endSourceIndex ||
    a.percentagePolicy !== b.percentagePolicy ||
    a.phase !== b.phase ||
    a.startX !== b.startX ||
    a.endX !== b.endX ||
    a.formattedStartX !== b.formattedStartX ||
    a.formattedEndX !== b.formattedEndX ||
    a.focused !== b.focused ||
    a.series.length !== b.series.length
  )
    return false;
  return a.series.every((item, index) => {
    const other = b.series[index];
    return (
      other &&
      item.id === other.id &&
      item.startValue === other.startValue &&
      item.endValue === other.endValue &&
      item.absoluteChange === other.absoluteChange &&
      item.percentageChange === other.percentageChange &&
      item.formattedStartValue === other.formattedStartValue &&
      item.formattedEndValue === other.formattedEndValue &&
      item.formattedChange === other.formattedChange &&
      item.formattedPercentage === other.formattedPercentage &&
      item.unavailableReason === other.unavailableReason
    );
  });
}

function sameLegend(
  a: readonly LegendSnapshot['series'][number][],
  b: readonly LegendSnapshot['series'][number][],
) {
  return (
    a.length === b.length &&
    a.every((item, index) => {
      const other = b[index];
      return (
        other &&
        item.id === other.id &&
        item.label === other.label &&
        item.color === other.color &&
        item.kind === other.kind &&
        item.treatment === other.treatment &&
        item.visible === other.visible &&
        item.value === other.value &&
        item.formattedValue === other.formattedValue &&
        item.status === other.status
      );
    })
  );
}

function sameSourceValue(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (depth >= 8 || !a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => sameSourceValue(item, b[index], depth + 1))
    );
  if (
    Object.getPrototypeOf(a) !== Object.prototype ||
    Object.getPrototypeOf(b) !== Object.prototype
  )
    return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) => Object.hasOwn(right, key) && sameSourceValue(left[key], right[key], depth + 1),
    )
  );
}

function sameCartesianFrame<Row, Id extends string>(
  previous: CartesianModelFrame<Row, Id>,
  next: CartesianModelFrame<Row, Id>,
  oldData: NormalizedData<Row>,
  newData: NormalizedData<Row>,
): boolean {
  if (
    previous.x.type !== next.x.type ||
    previous.y?.includeZero !== next.y?.includeZero ||
    previous.y?.ticks !== next.y?.ticks ||
    !sameSourceValue(previous.y?.domain, next.y?.domain) ||
    !sameSourceValue(previous.y?.include, next.y?.include) ||
    previous.series.length !== next.series.length ||
    oldData.rows.length !== newData.rows.length
  )
    return false;
  if (
    !previous.series.every((descriptor, index) => {
      const other = next.series[index];
      return (
        other &&
        descriptor.id === other.id &&
        descriptor.label === other.label &&
        descriptor.unit === other.unit &&
        descriptor.color === other.color &&
        descriptor.curve === other.curve &&
        descriptor.scale === other.scale &&
        sameSourceValue(
          Object.entries(descriptor.fields ?? {}).map(([id, field]) => [id, field.label]),
          Object.entries(other.fields ?? {}).map(([id, field]) => [id, field.label]),
        ) &&
        sameSourceValue(descriptor.line, other.line) &&
        sameSourceValue(descriptor.area, other.area) &&
        sameSourceValue(descriptor.bar, other.bar)
      );
    })
  )
    return false;
  return oldData.rows.every((row, index) => {
    const other = newData.rows[index];
    if (
      !other ||
      row.x !== other.x ||
      row.categoryId !== other.categoryId ||
      !sameSourceValue(row.datum, other.datum) ||
      (previous.x.format?.(row.x) ?? String(row.x)) !==
        (next.x.format?.(other.x) ?? String(other.x))
    )
      return false;
    return previous.series.every((descriptor) => {
      const id = descriptor.id;
      const currentValue = row.values[id] ?? null;
      const nextValue = other.values[id] ?? null;
      const nextDescriptor = next.series.find((item) => item.id === id)!;
      return (
        currentValue === nextValue &&
        row.statuses[id] === other.statuses[id] &&
        sameSourceValue(row.fields[id], other.fields[id]) &&
        (currentValue === null ||
          (descriptor.formatValue?.(currentValue) ?? String(currentValue)) ===
            (nextDescriptor.formatValue?.(nextValue!) ?? String(nextValue))) &&
        (currentValue === null ||
          (previous.y?.format?.(currentValue) ?? String(currentValue)) ===
            (next.y?.format?.(nextValue!) ?? String(nextValue)))
      );
    });
  });
}

function inspectionAt<Row, Id extends string>(
  frame: CartesianModelFrame<Row, Id>,
  normalized: NormalizedData<Row>,
  x: number,
  pinned: boolean,
): ChartTooltipContext<Row, Id> | null {
  const row = normalized.rows.find((item) => item.x === x);
  if (!row) return null;
  return {
    row: row.datum,
    sourceIndex: row.sourceIndex,
    x: row.x,
    formattedX: frame.x.format?.(row.x) ?? String(row.x),
    pinned,
    series: frame.series.map((descriptor) => {
      const value = row.values[descriptor.id] ?? null;
      const format = (raw: number) =>
        descriptor.formatValue?.(raw) ?? frame.y?.format?.(raw) ?? String(raw);
      return {
        id: descriptor.id,
        label: descriptor.label,
        value,
        formattedValue:
          value === null
            ? 'No data'
            : (descriptor.formatValue?.(value) ?? frame.y?.format?.(value) ?? String(value)),
        status: row.statuses[descriptor.id] ?? 'observed',
        fields: fieldEntries(descriptor, row.fields[descriptor.id], format),
      };
    }),
  };
}

function reconcilePinnedInspection<Row, Id extends string>(
  previous: ChartTooltipContext<Row, Id> | null,
  frame: CartesianModelFrame<Row, Id>,
  normalized: NormalizedData<Row>,
): ChartTooltipContext<Row, Id> | null {
  return previous?.pinned ? inspectionAt(frame, normalized, previous.x, true) : null;
}

/** Internal publication from the accepted Cartesian plot; presentation never recalculates values. */
export function publishCartesianModel<Row, Id extends string>(
  model: CartesianChartModel<Row, Id>,
  state: Pick<
    CartesianModelState<Row, Id>,
    'inspection' | 'comparison' | 'visibleSeries' | 'legend'
  >,
  actions: ModelActions,
): void {
  publishers.get(model)?.(state, actions);
}

/** Release a view's callbacks without changing the model's accepted frame or persistent state. */
export function detachCartesianModel<Row, Id extends string>(
  model: CartesianChartModel<Row, Id>,
): void {
  detachments.get(model)?.();
}

/** Subscribe from any React component that has the handle, including outside Chart. */
export function useCartesianModelState<Row, Id extends string>(
  model: CartesianChartModel<Row, Id>,
): CartesianModelState<Row, Id> {
  return useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
}

/** Define descriptors once; literal IDs and source-row metadata remain inferred. */
export function createCartesianChartModel<
  Row,
  const Series extends readonly ChartSeries<NoInfer<Row>>[],
>({
  data,
  x,
  y,
  series,
  status = 'ready',
  resetKey,
  control,
}: {
  readonly data: readonly Row[];
  readonly x: TimeXConfig<NoInfer<Row>> | NumericXConfig<NoInfer<Row>>;
  readonly y?: ChartYConfig;
  readonly series: Series;
  readonly status?: 'loading' | 'ready' | 'error';
  readonly resetKey?: string | number;
  readonly control?: CartesianModelControl<Series[number]['id']>;
}): CartesianChartModel<Row, Series[number]['id']> {
  type Id = Series[number]['id'];
  let actions: ModelActions = {
    inspect: () => undefined,
    clearInspection: () => undefined,
    pin: () => undefined,
    release: () => undefined,
    setVisibleSeries: () => undefined,
    focusSeries: () => undefined,
    compare: () => undefined,
    clearComparison: () => undefined,
    focusComparison: () => undefined,
    fullRange: () => undefined,
  };
  let attached = false;
  const listeners = new Set<() => void>();
  const controller = createChartController();
  let percentagePolicy: ChartPercentagePolicy = 'positive-baseline';
  let suppressController = false;
  let acceptedNormalized = status === 'ready' ? normalizeData(data, series, x) : null;
  let acceptedFrame: CartesianModelFrame<Row, Id> | null =
    status === 'ready' ? { data, x, y, series } : null;
  const observationsFor = (): readonly CartesianModelObservation<Row>[] => {
    const frame = acceptedFrame;
    if (!frame || !acceptedNormalized) return [];
    return acceptedNormalized.rows.map((row) => ({
      id: row.categoryId ?? String(row.x),
      x: row.x,
      row: row.datum,
      sourceIndex: row.sourceIndex,
      label: frame.x.format?.(row.x) ?? String(row.x),
      values: row.values,
      formattedValues: Object.fromEntries(
        frame.series.map((descriptor) => {
          const value = row.values[descriptor.id] ?? null;
          return [
            descriptor.id,
            value === null
              ? 'No data'
              : (descriptor.formatValue?.(value) ?? frame.y?.format?.(value) ?? String(value)),
          ];
        }),
      ),
      statuses: row.statuses,
    }));
  };
  let fallbackFrame: CartesianModelFrame<Row, Id> = { data: [], x, y, series };
  let acceptedResetKey = resetKey;
  let currentControl = control;
  const legendFor = (
    inspection: ChartTooltipContext<Row, Id> | null,
    visibleSeries: readonly Id[],
    presentation: readonly CartesianModelLegendItem<Id>[] = [],
  ): readonly CartesianModelLegendItem<Id>[] => {
    const frame = acceptedFrame;
    if (!frame || !acceptedNormalized) return [];
    const row = inspection
      ? acceptedNormalized.rows.find((item) => item.x === inspection.x)
      : acceptedNormalized.rows.at(-1);
    return frame.series.map((descriptor, index) => {
      const prior = presentation.find((item) => item.id === descriptor.id);
      const value = row?.values[descriptor.id] ?? null;
      const kind = prior?.kind ?? (descriptor.bar ? 'bar' : descriptor.area ? 'area' : 'line');
      return {
        id: descriptor.id,
        label: descriptor.label,
        color: prior?.color ?? seriesColor(descriptor, index),
        kind,
        treatment:
          prior?.treatment ??
          (kind === 'area'
            ? (descriptor.area?.treatment ?? 'fade')
            : kind === 'bar'
              ? (descriptor.bar?.treatment ?? 'solid')
              : 'solid'),
        dasharray: descriptor.line?.dasharray,
        visible: visibleSeries.includes(descriptor.id),
        value,
        formattedValue:
          value === null
            ? 'No data'
            : (descriptor.formatValue?.(value) ?? frame.y?.format?.(value) ?? String(value)),
        status: row?.statuses[descriptor.id] ?? 'observed',
      };
    });
  };
  let snapshot: CartesianModelState<Row, Id> = {
    availability: status,
    acceptedRevision: 0,
    inspection: null,
    comparison: null,
    visibleSeries: series.map((item) => item.id),
    legend: legendFor(null, control?.visibleSeries ?? series.map((item) => item.id)),
    observations: observationsFor(),
  };
  const publishLocal = (next: Partial<CartesianModelState<Row, Id>>) => {
    const merged = { ...snapshot, ...next };
    snapshot = {
      ...merged,
      legend: legendFor(merged.inspection, merged.visibleSeries, merged.legend),
    };
    listeners.forEach((listener) => listener());
  };
  const inspectLocally = (value: number, pinned: boolean) => {
    const reading =
      acceptedFrame && acceptedNormalized
        ? inspectionAt(acceptedFrame, acceptedNormalized, value, pinned)
        : null;
    if (!sameInspection(snapshot.inspection, reading)) publishLocal({ inspection: reading });
  };
  const comparisonAt = (
    range: ChartRange | null,
    focused: boolean,
  ): ChartComparisonResult<Id, Row> | null => {
    if (!range || !acceptedFrame || !acceptedNormalized) return null;
    const start = acceptedNormalized.rows.find((row) => row.x === range.startX);
    const end = acceptedNormalized.rows.find((row) => row.x === range.endX);
    const descriptors = acceptedFrame.series.filter((item) =>
      snapshot.visibleSeries.includes(item.id),
    );
    if (!descriptors.length) return null;
    return {
      kind: 'range',
      ...range,
      startRow: start?.datum ?? null,
      endRow: end?.datum ?? null,
      startSourceIndex: start?.sourceIndex ?? null,
      endSourceIndex: end?.sourceIndex ?? null,
      percentagePolicy,
      formattedStartX: acceptedFrame.x.format?.(range.startX) ?? String(range.startX),
      formattedEndX: acceptedFrame.x.format?.(range.endX) ?? String(range.endX),
      elapsed: Math.abs(range.endX - range.startX),
      phase: 'complete',
      focused,
      series: comparisonRows(
        acceptedNormalized,
        range,
        descriptors,
        acceptedFrame.y?.format ?? String,
        percentagePolicy,
      ) as readonly ChartComparisonResult<Id, Row>['series'][number][],
    };
  };
  if (
    control?.inspection !== undefined &&
    control.inspection &&
    acceptedFrame &&
    acceptedNormalized
  )
    snapshot = {
      ...snapshot,
      inspection: inspectionAt(
        acceptedFrame,
        acceptedNormalized,
        control.inspection.x,
        control.inspection.pinned,
      ),
    };
  if (control?.visibleSeries !== undefined)
    snapshot = {
      ...snapshot,
      visibleSeries: control.visibleSeries.filter((id) => series.some((item) => item.id === id)),
    };
  if (control?.comparison !== undefined)
    snapshot = { ...snapshot, comparison: comparisonAt(control.comparison, false) };
  snapshot = { ...snapshot, legend: legendFor(snapshot.inspection, snapshot.visibleSeries) };
  controller.subscribe(() => {
    if (suppressController) return;
    const next = controller.getSnapshot();
    const reading =
      currentControl?.inspection !== undefined
        ? snapshot.inspection
        : next.inspection && acceptedFrame && acceptedNormalized
          ? inspectionAt(
              acceptedFrame,
              acceptedNormalized,
              next.inspection.x,
              next.inspection.pinned,
            )
          : null;
    const comparison =
      currentControl?.comparison !== undefined
        ? snapshot.comparison
        : comparisonAt(next.comparison, Boolean(next.focus));
    if (
      sameInspection(snapshot.inspection, reading) &&
      sameComparison(snapshot.comparison, comparison)
    )
      return;
    publishLocal({ inspection: reading, comparison });
  });
  if (control?.inspection) controller.inspect({ ...control.inspection, ownerId: 'model' });
  if (control?.comparison) controller.setComparison(control.comparison);
  const model = {
    get data() {
      return acceptedFrame?.data ?? fallbackFrame.data;
    },
    get x() {
      return acceptedFrame?.x ?? fallbackFrame.x;
    },
    get series() {
      return acceptedFrame?.series ?? fallbackFrame.series;
    },
    getFrame: () => acceptedFrame ?? fallbackFrame,
    getAcceptedFrame: () => acceptedFrame,
    getAvailability: () => snapshot.availability,
    getResetKey: () => acceptedResetKey,
    getController: () => controller,
    update(next: CartesianModelInput<Row, Id>) {
      const nextStatus = next.status ?? 'ready';
      const priorControl = currentControl;
      const controlChanged =
        priorControl?.inspection?.x !== next.control?.inspection?.x ||
        priorControl?.inspection?.pinned !== next.control?.inspection?.pinned ||
        (priorControl?.inspection === null) !== (next.control?.inspection === null) ||
        priorControl?.comparison?.startX !== next.control?.comparison?.startX ||
        priorControl?.comparison?.endX !== next.control?.comparison?.endX ||
        (priorControl?.comparison === null) !== (next.control?.comparison === null) ||
        !sameSourceValue(priorControl?.visibleSeries, next.control?.visibleSeries);
      currentControl = next.control;
      const reset = acceptedResetKey !== next.resetKey;
      const current = reset ? null : acceptedFrame;
      const referencesChanged =
        !current ||
        current.data !== next.data ||
        current.x !== next.x ||
        current.y !== next.y ||
        current.series !== next.series;
      const normalized =
        nextStatus === 'ready' && referencesChanged
          ? normalizeData(next.data, next.series, next.x)
          : null;
      const changed = Boolean(
        nextStatus === 'ready' &&
          (!current ||
            !acceptedNormalized ||
            (normalized && !sameCartesianFrame(current, next, acceptedNormalized, normalized))),
      );
      acceptedResetKey = next.resetKey;
      if (reset) {
        acceptedFrame = null;
        acceptedNormalized = null;
        suppressController = true;
        controller.clearInspection();
        controller.setComparison(null);
        controller.setFocus(null);
        suppressController = false;
      }
      if (changed) {
        acceptedFrame = { data: next.data, x: next.x, y: next.y, series: next.series };
        acceptedNormalized = normalized;
      }
      const fallbackChanged =
        !acceptedFrame &&
        (fallbackFrame.x !== next.x ||
          fallbackFrame.y !== next.y ||
          fallbackFrame.series !== next.series);
      if (fallbackChanged) fallbackFrame = { data: [], x: next.x, y: next.y, series: next.series };
      if (
        !reset &&
        !fallbackChanged &&
        !changed &&
        snapshot.availability === nextStatus &&
        !controlChanged
      )
        return;
      snapshot = {
        ...snapshot,
        availability: nextStatus,
        acceptedRevision: snapshot.acceptedRevision + (reset || changed ? 1 : 0),
        inspection:
          next.control?.inspection !== undefined
            ? next.control.inspection && acceptedFrame && acceptedNormalized
              ? inspectionAt(
                  acceptedFrame,
                  acceptedNormalized,
                  next.control.inspection.x,
                  next.control.inspection.pinned,
                )
              : null
            : reset
              ? null
              : changed && normalized
                ? reconcilePinnedInspection(snapshot.inspection, acceptedFrame!, normalized)
                : snapshot.inspection,
        comparison: reset || changed ? null : snapshot.comparison,
        legend: reset || changed ? [] : snapshot.legend,
        observations: reset || changed ? observationsFor() : snapshot.observations,
        visibleSeries:
          next.control?.visibleSeries !== undefined
            ? next.control.visibleSeries.filter((id) => next.series.some((item) => item.id === id))
            : reset
              ? next.series.map((item) => item.id)
              : changed
                ? [
                    ...snapshot.visibleSeries.filter((id) =>
                      next.series.some((item) => item.id === id),
                    ),
                    ...next.series
                      .map((item) => item.id)
                      .filter((id) => !current?.series.some((item) => item.id === id)),
                  ]
                : snapshot.visibleSeries,
      };
      if (next.control?.comparison !== undefined)
        snapshot = { ...snapshot, comparison: comparisonAt(next.control.comparison, false) };
      snapshot = {
        ...snapshot,
        legend: legendFor(
          snapshot.inspection,
          snapshot.visibleSeries,
          changed || reset ? [] : snapshot.legend,
        ),
      };
      if (next.control?.inspection !== undefined) {
        if (next.control.inspection)
          controller.inspect({ ...next.control.inspection, ownerId: 'model' });
        else controller.clearInspection();
      }
      if (next.control?.comparison !== undefined) controller.setComparison(next.control.comparison);
      listeners.forEach((listener) => listener());
      if (
        changed &&
        !reset &&
        next.control?.comparison === undefined &&
        controller.getSnapshot().comparison
      ) {
        const comparison = comparisonAt(
          controller.getSnapshot().comparison,
          Boolean(controller.getSnapshot().focus),
        );
        if (!sameComparison(snapshot.comparison, comparison)) publishLocal({ comparison });
      }
    },
    summarize(query: CartesianSummaryQuery<Id>): CartesianSummaryResult<Id> {
      const frame = acceptedFrame;
      const descriptor = (frame ?? fallbackFrame).series.find((item) => item.id === query.measure);
      if (!descriptor) throw new Error(`Unknown Lilt measure "${query.measure}".`);
      const summary: ChartSummary = summarizeRange(frame?.data ?? [], {
        x: (frame ?? fallbackFrame).x.accessor,
        value: descriptor.accessor,
        range: query.scope,
      });
      const value =
        query.missing === 'require-complete' && summary.missing > 0
          ? null
          : summary[query.aggregate === 'sum' ? 'total' : query.aggregate];
      const unavailableReason =
        query.missing === 'require-complete' && summary.missing > 0
          ? 'Missing observations in the selected scope.'
          : value === null
            ? 'No observed value in the selected scope.'
            : null;
      return {
        measure: query.measure,
        value,
        formattedValue:
          value === null
            ? 'No data'
            : (descriptor.formatValue?.(value) ?? frame?.y?.format?.(value) ?? String(value)),
        unit: descriptor.unit ?? null,
        coverage: {
          observed: summary.count,
          missing: summary.missing,
          total: summary.count + summary.missing,
        },
        unavailableReason,
      };
    },
    actions: {
      inspect: (value: number) => {
        if (currentControl?.inspection !== undefined) {
          currentControl.onInspectionRequest?.({ x: value, pinned: false });
          return;
        }
        inspectLocally(value, false);
        controller.inspect({ x: value, pinned: false, ownerId: 'model' });
        if (attached) actions.inspect(value);
      },
      clearInspection: () => {
        if (currentControl?.inspection !== undefined) {
          if (!snapshot.inspection?.pinned) currentControl.onInspectionRequest?.(null);
          return;
        }
        if (snapshot.inspection && !snapshot.inspection.pinned) publishLocal({ inspection: null });
        if (!snapshot.inspection?.pinned) controller.clearInspection();
        if (attached) actions.clearInspection();
      },
      pin: (value: number, options?: ChartPinOptions) => {
        if (currentControl?.inspection !== undefined) {
          currentControl.onInspectionRequest?.({ x: value, pinned: true });
          return;
        }
        inspectLocally(value, true);
        controller.inspect({
          x: value,
          pinned: true,
          ownerId: 'model',
          ...(options?.local ? { local: true } : {}),
        });
        if (attached) actions.pin(value, options);
      },
      release: () => {
        if (currentControl?.inspection !== undefined) {
          currentControl.onInspectionRequest?.(null);
          return;
        }
        if (snapshot.inspection) publishLocal({ inspection: null });
        controller.clearInspection();
        if (attached) actions.release();
      },
      setVisibleSeries: (ids: readonly Id[]) => {
        const valid = new Set((acceptedFrame ?? fallbackFrame).series.map((item) => item.id));
        const next = [...new Set(ids.filter((id) => valid.has(id)))];
        if (currentControl?.visibleSeries !== undefined) {
          currentControl.onVisibleSeriesRequest?.(next);
          return;
        }
        if (
          next.length !== snapshot.visibleSeries.length ||
          next.some((id, index) => id !== snapshot.visibleSeries[index])
        ) {
          publishLocal({ visibleSeries: next });
          const linked = controller.getSnapshot();
          const comparison = comparisonAt(linked.comparison, Boolean(linked.focus));
          if (!sameComparison(snapshot.comparison, comparison)) publishLocal({ comparison });
        }
      },
      focusSeries: (id: Id | null) => actions.focusSeries(id),
      compare: (range: ChartRange, percentage: ChartPercentagePolicy = 'positive-baseline') => {
        percentagePolicy = percentage;
        const result = comparisonAt(range, false);
        if (!result) return;
        if (currentControl?.comparison !== undefined) {
          currentControl.onComparisonRequest?.(range);
          return;
        }
        if (!sameComparison(snapshot.comparison, result)) publishLocal({ comparison: result });
        controller.setComparison(range);
        if (attached) actions.compare(range);
      },
      clearComparison: () => {
        if (currentControl?.comparison !== undefined) {
          currentControl.onComparisonRequest?.(null);
          return;
        }
        if (snapshot.comparison) publishLocal({ comparison: null });
        controller.setComparison(null);
        controller.setFocus(null);
        if (attached) actions.clearComparison();
      },
      focusComparison: () => {
        if (snapshot.comparison && !snapshot.comparison.focused)
          publishLocal({ comparison: { ...snapshot.comparison, focused: true } });
        if (snapshot.comparison) controller.setFocus(snapshot.comparison);
        if (attached) actions.focusComparison();
      },
      fullRange: () => {
        if (snapshot.comparison?.focused)
          publishLocal({ comparison: { ...snapshot.comparison, focused: false } });
        controller.setFocus(null);
        if (attached) actions.fullRange();
      },
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  publishers.set(model, (state, nextActions) => {
    attached = true;
    actions = nextActions;
    const visibleSeries = snapshot.visibleSeries;
    const legend = state.legend as readonly CartesianModelLegendItem<Id>[];
    const resolvedLegend = legendFor(snapshot.inspection, visibleSeries, legend);
    const legendSame = sameLegend(snapshot.legend, resolvedLegend);
    // The view owns which series is active (pointer, keyboard, legend); the model owns the reading.
    const viewActive = (state.inspection?.activeSeriesId ?? null) as Id | null;
    const activeChanged =
      snapshot.inspection !== null &&
      state.inspection?.x === snapshot.inspection.x &&
      (snapshot.inspection.activeSeriesId ?? null) !== viewActive;
    if (
      snapshot.visibleSeries.length === visibleSeries.length &&
      snapshot.visibleSeries.every((id, index) => id === visibleSeries[index]) &&
      legendSame &&
      !activeChanged
    )
      return;
    snapshot = {
      availability: snapshot.availability,
      acceptedRevision: snapshot.acceptedRevision,
      inspection:
        activeChanged && snapshot.inspection
          ? { ...snapshot.inspection, activeSeriesId: viewActive ?? undefined }
          : snapshot.inspection,
      comparison: snapshot.comparison,
      visibleSeries:
        snapshot.visibleSeries.length === visibleSeries.length &&
        snapshot.visibleSeries.every((id, index) => id === visibleSeries[index])
          ? snapshot.visibleSeries
          : visibleSeries,
      legend: legendSame ? snapshot.legend : resolvedLegend,
      observations: snapshot.observations,
    };
    const linked = controller.getSnapshot();
    if (linked.comparison)
      snapshot = {
        ...snapshot,
        comparison: comparisonAt(linked.comparison, Boolean(linked.focus)),
      };
    listeners.forEach((listener) => listener());
  });
  detachments.set(model, () => {
    attached = false;
    actions = {
      inspect: () => undefined,
      clearInspection: () => undefined,
      pin: () => undefined,
      release: () => undefined,
      setVisibleSeries: () => undefined,
      focusSeries: () => undefined,
      compare: () => undefined,
      clearComparison: () => undefined,
      focusComparison: () => undefined,
      fullRange: () => undefined,
    };
    if (snapshot.inspection && !snapshot.inspection.pinned) {
      snapshot = { ...snapshot, inspection: null };
      listeners.forEach((listener) => listener());
    }
  });
  return model;
}

/** Keep a Cartesian handle stable while ready input frames change. */
export function useCartesianChartModel<
  Row,
  const Series extends readonly ChartSeries<NoInfer<Row>>[],
>(
  input: {
    readonly data: readonly Row[];
    readonly x: TimeXConfig<NoInfer<Row>> | NumericXConfig<NoInfer<Row>>;
    readonly y?: ChartYConfig;
    readonly series: Series;
    readonly status?: 'loading' | 'ready' | 'error';
    readonly resetKey?: string | number;
    readonly control?: CartesianModelControl<Series[number]['id']>;
  },
  status: 'ready' | 'loading' | 'error' = input.status ?? 'ready',
): CartesianChartModel<Row, Series[number]['id']> {
  const ref = useRef<CartesianChartModel<Row, Series[number]['id']> | null>(null);
  ref.current ??= createCartesianChartModel({ ...input, status });
  const model = ref.current;
  useEffect(() => {
    model.update({ ...input, status });
  }, [input.data, input.x, input.y, input.series, input.resetKey, input.control, model, status]);
  return model;
}

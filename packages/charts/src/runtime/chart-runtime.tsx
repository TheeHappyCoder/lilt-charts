'use client';

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactElement,
} from 'react';
import { createChartController } from '../interaction/chart-controller';
import type {
  ChartController,
  ChartProps,
  ChartLegendValue,
  ChartComparisonContext,
  ChartCompareConfig,
} from '../types';
import type { ChartFillTreatment } from '../types';
import type { PaintKind } from '../paint';
import type { CartesianChartModel, CartesianModelFrame } from '../model/cartesian-model';
import { MotionScope } from '../motion/motion-scope';
import type { ChartSnapshot } from '../chart-context';

type ModelChartProps<T, Id extends string> = Omit<
  ChartProps<T>,
  | 'data'
  | 'x'
  | 'series'
  | 'selectedCategoryId'
  | 'onSelectedCategoryIdChange'
  | 'compare'
  | 'visibleSeries'
  | 'onVisibleSeriesChange'
> & {
  model: CartesianChartModel<T, Id>;
  compare?: boolean | (Omit<ChartCompareConfig, 'series'> & { series?: NoInfer<Id> });
  visibleSeries?: readonly NoInfer<Id>[];
  onVisibleSeriesChange?: (series: readonly NoInfer<Id>[]) => void;
};

export interface LegendSnapshot {
  series: readonly (ChartLegendValue & {
    color: string;
    kind: PaintKind;
    treatment: ChartFillTreatment;
    dasharray?: string;
    visible: boolean;
  })[];
  reducedMotion: boolean;
  comparison: ChartComparisonContext | null;
  observations: readonly {
    id: string;
    x: number;
    row: unknown;
    sourceIndex: number;
    label: string;
    values: Readonly<Record<string, number | null>>;
    formattedValues: Readonly<Record<string, string>>;
    statuses: Readonly<Record<string, ChartLegendValue['status']>>;
  }[];
  inspectedX: number | null;
  pinnedX: number | null;
  onInspect: (x: number, pinned: boolean) => void;
  onClearInspect: () => void;
  onReleaseInspect: () => void;
  onFocus: (id: string | null) => void;
  onVisibleChange: (ids: readonly string[]) => void;
  isolatedId: string | null;
  onIsolate: (id: string) => void;
  onRestore: () => void;
  onShowAll: () => void;
}

export interface ToolkitSnapshot {
  comparison: ChartComparisonContext | null;
  toolbar: { label: string; pressed: boolean; onClick: () => void } | null;
  readout: string | null;
  overview: {
    range: { startX: number; endX: number };
    series: string;
    snapshot: ChartSnapshot<unknown>;
  } | null;
  brush: {
    snapshot: ChartSnapshot<unknown>;
    range: { startX: number; endX: number } | null;
    seriesId: string;
    reducedMotion: boolean;
    onFocus: (range: { startX: number; endX: number } | null) => void;
  } | null;
  legend: LegendSnapshot | null;
}

const EMPTY_TOOLKIT: ToolkitSnapshot = {
  comparison: null,
  toolbar: null,
  readout: null,
  overview: null,
  brush: null,
  legend: null,
};

export interface ToolkitStore {
  getSnapshot: () => ToolkitSnapshot;
  subscribe: (listener: () => void) => () => void;
  publish: (snapshot: ToolkitSnapshot) => void;
}

function createToolkitStore(): ToolkitStore {
  let snapshot = EMPTY_TOOLKIT;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(next) {
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
  };
}

export interface RuntimeContextValue<T> {
  props: Omit<ChartProps<T>, 'children' | 'className' | 'style' | 'controller'>;
  controller: ChartController;
  linked: boolean;
  toolkit: ToolkitStore;
  model?: CartesianChartModel<T, string>;
}

const RuntimeContext = createContext<RuntimeContextValue<unknown> | null>(null);
const EMPTY_MODEL_FRAME = {};
const subscribeNever = () => () => undefined;
const emptyModelFrame = () => EMPTY_MODEL_FRAME;

export function Chart<T, Id extends string>(props: ModelChartProps<T, Id>): ReactElement;
export function Chart<T>(props: ChartProps<T>): ReactElement;
export function Chart<T>({
  children,
  className,
  style,
  controller: suppliedController,
  ...input
}: ChartProps<T> | ModelChartProps<T, string>): ReactElement {
  const { model, ...remaining } = input as typeof input & {
    model?: CartesianChartModel<T, string>;
  };
  const frame = useSyncExternalStore(
    model?.subscribe ?? subscribeNever,
    model?.getFrame ?? emptyModelFrame,
    model?.getFrame ?? emptyModelFrame,
  );
  const availability = useSyncExternalStore(
    model?.subscribe ?? subscribeNever,
    model?.getAvailability ?? emptyAvailability,
    model?.getAvailability ?? emptyAvailability,
  );
  const modelVisibility = useSyncExternalStore(
    model?.subscribe ?? subscribeNever,
    model ? () => model.getSnapshot().visibleSeries : emptyVisibility,
    // The model's initial visibility is deterministic, so server HTML shows the same series.
    model ? () => model.getSnapshot().visibleSeries : emptyVisibility,
  );
  const props = (
    model
      ? {
          ...frame,
          ...remaining,
          y: (frame as CartesianModelFrame<T, string>).y ?? remaining.y,
          status: availability,
          resetKey: model.getResetKey(),
          visibleSeries: remaining.visibleSeries ?? modelVisibility,
          onVisibleSeriesChange: (ids: readonly string[]) => {
            model.actions.setVisibleSeries(ids);
            remaining.onVisibleSeriesChange?.(ids);
          },
        }
      : remaining
  ) as Omit<ChartProps<T>, 'children' | 'className' | 'style' | 'controller'>;
  const localController = useRef<ChartController | null>(null);
  const toolkit = useRef<ToolkitStore | null>(null);
  localController.current ??= createChartController();
  toolkit.current ??= createToolkitStore();
  const controller = suppliedController ?? model?.getController() ?? localController.current;
  const value = useMemo<RuntimeContextValue<T>>(
    () => ({
      props,
      controller,
      linked: Boolean(suppliedController),
      toolkit: toolkit.current!,
      model,
    }),
    [controller, model, props, suppliedController],
  );

  return (
    <RuntimeContext.Provider value={value as RuntimeContextValue<unknown>}>
      <MotionScope>
        <div
          aria-label={props['aria-label']}
          className={['lilt-chart', className].filter(Boolean).join(' ')}
          data-lilt-chart="true"
          style={style}
        >
          {children}
        </div>
      </MotionScope>
    </RuntimeContext.Provider>
  );
}

const emptyAvailability = () => 'ready' as const;
const EMPTY_VISIBILITY: readonly string[] = [];
const emptyVisibility = () => EMPTY_VISIBILITY;

export function useChartRuntime<T>(): RuntimeContextValue<T> {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error('Lilt toolkit components must be rendered inside <Chart>.');
  return value as RuntimeContextValue<T>;
}

export function useToolkitSnapshot(): ToolkitSnapshot {
  const { toolkit } = useChartRuntime();
  return useSyncExternalStore(toolkit.subscribe, toolkit.getSnapshot, toolkit.getSnapshot);
}

/** Read comparison data/actions without opting in to any presentation. */
export function useChartComparison(): ChartComparisonContext | null {
  const { toolkit } = useChartRuntime();
  return useSyncExternalStore(
    toolkit.subscribe,
    () => toolkit.getSnapshot().comparison,
    () => null,
  );
}

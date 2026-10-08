'use client';

import {
  useContext,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { AnimatePresence, m, useMotionValue } from 'motion/react';
import {
  AxisCursorContext,
  resolveAxis,
  resolvePillPosition,
  type AxisCursor,
} from './interaction/axis-cursor';
import { ChartPaintDefs, paintId, seriesColor, type PaintKind } from './paint';
import {
  ChartContextProvider,
  DEFAULT_MARGINS,
  LINE_ARRANGEMENT,
  buildSnapshot,
  makeAxisTicks,
  type ChartContextValue,
  type ChartSnapshot,
  type PlotArrangement,
} from './chart-context';
import type { ChartYConfig } from './types';
import {
  hasFiniteValue,
  hasMatchingTopology,
  normalizeData,
  type NormalizedData,
} from './engine/normalize';
import {
  createLifecycleGeneration,
  durationForPhase,
  skipDataTweenForWorkload,
  type LifecyclePhase,
} from './engine/lifecycle';
import { LoadingLayer } from './lifecycle/loading-layer';
import { SKELETON_EXIT_MS } from './lifecycle/skeleton-exit';
import { StatusContent } from './lifecycle/status-content';
import { EmptyShapeContext, EmptySlot } from './lifecycle/chart-empty';
import { useReducedMotion } from './motion/use-chart-motion';
import { useSeriesWeights } from './motion/use-series-weights';
import { COMPACT_ENTRANCE_DURATION, entranceProgress, entranceSweep } from './motion/entrance';
import { useFocusDomain } from './motion/use-focus-domain';
import { validateStack } from './engine/stack';
import { canMorphByKey, keyedFrame, mixDomain, morphEase } from './engine/keyed';
import { FLOW_DURATION, flowFrame } from './motion/area-flow';
import { InspectionLayer } from './interaction/inspection-layer';
import type { PlotMark } from './marks/contract';
import { comparisonRows } from './interaction/comparison-answer';
import { ComparisonLayer, type ComparisonEndpoint } from './interaction/comparison-layer';
import { TooltipViewProvider } from './interaction/tooltip-view';
import { PIN_SIZE, PinMarker } from './interaction/pin-marker';
import { comparisonForRange } from './engine/comparison';
import { nearestVisibleRowIndex } from './engine/lookup';

/** How close, in pixels, the pointer must come to a line over bars to read it. */
const LINE_REACH = 14;
import { pointAtX } from './engine/geometry';
import {
  reconcileIsolation,
  sameVisibleSet,
  type VisibilityIsolation,
} from './interaction/visibility';
import type {
  ChartCompareConfig,
  ChartComparisonContext,
  ChartComparisonResult,
  ChartBarLayout,
  ChartControllerSnapshot,
  ChartFocusConfig,
  ChartLiveConfig,
  ChartMargins,
  ChartPlotProps,
  ChartProps,
  ChartRange,
  ChartSelection,
  ChartSeries,
  ChartStyle,
} from './types';
import type { ToolkitStore } from './runtime/chart-runtime';
import {
  detachCartesianModel,
  publishCartesianModel,
  type CartesianChartModel,
} from './model/cartesian-model';
import { tooltipContext } from './interaction/tooltip-context';
import { SYNC_OWNER } from './interaction/chart-sync';
import { layoutSize } from './use-chart-width';

/**
 * The plot's skeleton leaves the way every chart's does (lifecycle/skeleton-exit.tsx): it freezes
 * on the frame it is on, then sinks into the plot's floor as it fades. Drawn over the plot, it
 * can hand over early: the data's entrance starts from that same floor just before the skeleton
 * is gone (SKELETON_RELEASE_MS), so the plot is never left empty and the two never compete.
 */
const SKELETON_RELEASE_MS = 80;
/** How long the y scale glides when a line or area series is shown or hidden. */
const SCALE_GLIDE_MS = 520;

/**
 * `keyed-update` morphs rows that change by x value, such as a longer period: the union of both
 * frames draws while the domains glide, so shared points move and the rest slide past the edge.
 */
type TransitionKind = 'initial' | 'matched-update' | 'keyed-update' | 'topology-update';

interface ChartTransition<T> {
  id: number;
  kind: TransitionKind;
  from: NormalizedData<T> | null;
  to: NormalizedData<T>;
  duration: number;
  fromDomain?: readonly [number, number] | null;
}

const EMPTY_Y_CONFIG: ChartYConfig = {};
const NO_MARKS: readonly PlotMark[] = [];

interface ChartSize {
  width: number;
  height: number;
}

const EMPTY_CONTROLLER_SNAPSHOT: ChartControllerSnapshot = {
  inspection: null,
  comparison: null,
  focus: null,
};
const subscribeNever = () => () => undefined;
const getEmptyControllerSnapshot = () => EMPTY_CONTROLLER_SNAPSHOT;

function mergeMargins(margins?: Partial<ChartMargins>): ChartMargins {
  return { ...DEFAULT_MARGINS, ...margins };
}

function sameFields(
  a: Readonly<Record<string, number | null>> | undefined,
  b: Readonly<Record<string, number | null>> | undefined,
): boolean {
  const ids = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const id of ids) if ((a?.[id] ?? null) !== (b?.[id] ?? null)) return false;
  return true;
}

function sameData<T>(a: NormalizedData<T> | null, b: NormalizedData<T> | null): boolean {
  if (!a || !b || a.rows.length !== b.rows.length || a.series.length !== b.series.length)
    return false;
  if (a.series.some((descriptor, index) => descriptor.id !== b.series[index]?.id)) return false;
  return a.rows.every((row, index) => {
    const other = b.rows[index];
    return Boolean(
      other &&
        row.x === other.x &&
        row.categoryId === other.categoryId &&
        a.series.every(
          (item) =>
            row.values[item.id] === other.values[item.id] &&
            row.statuses[item.id] === other.statuses[item.id] &&
            sameFields(row.fields[item.id], other.fields[item.id]),
        ),
    );
  });
}

function interpolateMatchedData<T>(
  from: NormalizedData<T>,
  to: NormalizedData<T>,
  progress: number,
): NormalizedData<T> {
  if (progress >= 1) return to;
  return {
    ...to,
    rows: to.rows.map((row, index) => {
      const previous = from.rows[index];
      const values = Object.fromEntries(
        to.series.map((descriptor) => {
          const start = previous?.values[descriptor.id];
          const end = row.values[descriptor.id];
          return [
            descriptor.id,
            start === null || start === undefined || end === null
              ? end
              : start + (end - start) * progress,
          ];
        }),
      );
      return { ...row, values };
    }),
  };
}

function revealEase(progress: number): number {
  return 1 - Math.pow(1 - progress, 4);
}

function useChartSize(
  rootRef: RefObject<HTMLDivElement | null>,
  fallbackHeight: number,
  fillHeight = false,
): ChartSize {
  const [size, setSize] = useState<ChartSize>({ width: 0, height: fallbackHeight });
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const rect = layoutSize(root);
      setSize((current) => {
        const next = {
          width: rect.width > 0 ? rect.width : current.width,
          height: fillHeight && rect.height > 0 ? Math.round(rect.height) : fallbackHeight,
        };
        return next.width === current.width && next.height === current.height ? current : next;
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [fallbackHeight, fillHeight, rootRef]);
  return size;
}

function useNormalizedData<T>(
  data: readonly T[],
  series: readonly ChartSeries<T>[],
  x: ChartProps<T>['x'],
  stack: PlotArrangement['stack'],
): { value: NormalizedData<T> | null; error: string | null } {
  return useMemo(() => {
    try {
      const value = normalizeData(data, series, x);
      if (stack)
        validateStack(
          value,
          series.filter((item) => stack.series.includes(item.id)),
          stack.mode,
        );
      return { value, error: null };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Invalid chart data.' };
    }
  }, [data, series, x, stack]);
}

function safeSnapshot<T>(
  data: NormalizedData<T> | null,
  series: readonly ChartSeries<T>[],
  x: ChartProps<T>['x'],
  y: NonNullable<ChartProps<T>['y']>,
  margins: ChartMargins,
  size: ChartSize,
  yDomainOverride?: readonly [number, number] | null,
  xDomainOverride?: readonly [number, number] | null,
  geometrySeries?: readonly ChartSeries<T>[],
  arrangement: PlotArrangement = LINE_ARRANGEMENT,
  stackWeights?: Readonly<Record<string, number>>,
  barLayout: ChartBarLayout = {},
  edgeInset = 0,
  decimate = true,
): ChartSnapshot<T> | null {
  if (!data || data.rows.length === 0 || !hasFiniteValue(data)) return null;
  try {
    return buildSnapshot(
      data,
      series,
      x,
      y,
      margins,
      size.width,
      size.height,
      yDomainOverride,
      xDomainOverride,
      geometrySeries,
      arrangement,
      stackWeights,
      barLayout,
      edgeInset,
      decimate,
    );
  } catch {
    return null;
  }
}

function makeContext<T>(
  snapshot: ChartSnapshot<T>,
  previousSnapshot: ChartSnapshot<T> | null,
  props: {
    series: readonly ChartSeries<T>[];
    x: ChartProps<T>['x'];
    y: NonNullable<ChartProps<T>['y']>;
    margins: ChartMargins;
    size: ChartSize;
    reducedMotion: boolean;
    transitionDuration: number;
    transitionKind: ChartContextValue<T>['transitionKind'];
    clipId: string;
    gridGradientId: string;
    paintId: ChartContextValue<T>['paintId'];
    inspectionSeries?: string;
    inspecting: boolean;
    focusedSeries?: string | null;
    visibleSeries: readonly string[];
    revealProgress: number;
  },
): ChartContextValue<T> {
  return {
    snapshot,
    previousSnapshot,
    series: props.series,
    xConfig: props.x,
    yConfig: props.y,
    margins: props.margins,
    width: props.size.width,
    height: props.size.height,
    revealProgress: props.revealProgress,
    reducedMotion: props.reducedMotion,
    transitionDuration: props.transitionDuration,
    transitionKind: props.transitionKind,
    axis: makeAxisTicks(
      snapshot as ChartSnapshot<unknown>,
      previousSnapshot as ChartSnapshot<unknown> | undefined,
    ),
    clipId: props.clipId,
    gridGradientId: props.gridGradientId,
    paintId: props.paintId,
    inspectionSeries: props.inspectionSeries,
    inspecting: props.inspecting,
    focusedSeries: props.focusedSeries,
    visibleSeries: props.visibleSeries,
  };
}

function normalizeDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function valueText<T>(
  descriptor: ChartSeries<T>,
  row: T,
  fallback: (value: number) => string,
): string {
  const value = descriptor.accessor(row);
  return value === null ? 'No data' : (descriptor.formatValue?.(value) ?? fallback(value));
}

function indexForSource<T>(snapshot: ChartSnapshot<T>, sourceIndex: number): number {
  return snapshot.data.rows.findIndex((row) => row.sourceIndex === sourceIndex);
}

type ChartPlotRendererProps<T> = Omit<ChartProps<T>, 'className' | 'style'> &
  Omit<ChartPlotProps, 'bars' | 'stack' | 'tooltip'> & {
    arrangement?: PlotArrangement;
    marks?: readonly PlotMark[];
    barLayout?: ChartBarLayout;
    selectedCategoryId?: string | null;
    onSelectedCategoryIdChange?: (id: string | null) => void;
    toolkit: ToolkitStore;
    model?: CartesianChartModel<T, string>;
    controllerLinked?: boolean;
    tooltipNode?: ReactNode;
  };

export function ChartPlotRenderer<T>({
  data,
  x,
  y = EMPTY_Y_CONFIG,
  series,
  height = 340,
  compactHeight,
  margins: marginProps,
  arrangement = LINE_ARRANGEMENT,
  marks = NO_MARKS,
  barLayout: barsProps,
  compact = false,
  tooltipNode,
  inspectionSeries: plotInspectionSeries,
  className,
  style,
  'aria-label': ariaLabel,
  children,
  status = 'ready',
  loadingStyle,
  empty: emptyState = 'dots',
  interactive = true,
  error,
  renderRetry,
  motion: motionPreference = 'auto',
  animateIn = true,
  resetKey,
  onSelectionChange,
  controller,
  linkedSelection = 'exact',
  selectedCategoryId,
  onSelectedCategoryIdChange,
  compare = false,
  focus = false,
  live = false,
  brush = false,
  visibleSeries,
  onVisibleSeriesChange,
  toolkit,
  model,
  controllerLinked = false,
  axis: axisProp = 'minimal',
  pill = 'soft',
  pillSeries = 'nearest',
  pillValue = 'series',
  pillPosition = 'auto',
  axisInset = 0,
  decimate = true,
  runoff = false,
  labelOverhang = 0,
}: ChartPlotRendererProps<T>): ReactElement {
  const pillStyle = pill || 'soft';
  // An inline axis object is a new object every render; its content decides.
  const axisKey = JSON.stringify(axisProp);
  const axisSides = useMemo(() => resolveAxis(axisProp), [axisKey]);
  const cursorX = useMotionValue(0);
  const pointerX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const cursorActive = useMotionValue(0);
  const cursorInspecting = useMotionValue(0);
  const columnX = useMotionValue(0);
  const columnColor = useMotionValue('');
  const axisCursor = useMemo<AxisCursor>(
    () => ({
      x: cursorX,
      pointerX,
      columnX,
      columnColor,
      y: cursorY,
      active: cursorActive,
      inspecting: cursorInspecting,
      axis: axisSides,
      pill: pillStyle,
      inset: Math.max(0, axisInset),
      runoff,
      overhang: Math.max(0, labelOverhang),
      pillPosition: resolvePillPosition(pillPosition, axisSides.y),
    }),
    [
      pillPosition,
      axisInset,
      axisSides,
      cursorActive,
      cursorInspecting,
      columnX,
      columnColor,
      cursorX,
      cursorY,
      labelOverhang,
      pillStyle,
      pointerX,
      runoff,
    ],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const svgBoundsRef = useRef<DOMRect | null>(null);
  // Keyed by value: an inline `margins` object is new on every render, and a new identity here
  // would rebuild the whole snapshot, and reformat every row, on every hover.
  const margins = useMemo(
    () => mergeMargins(marginProps),
    [marginProps?.top, marginProps?.right, marginProps?.bottom, marginProps?.left],
  );
  const barLayout = useMemo(
    () => ({ width: barsProps?.width, gap: barsProps?.gap, segmentGap: barsProps?.segmentGap }),
    [barsProps?.width, barsProps?.gap, barsProps?.segmentGap],
  );
  const fillHeight = height === 'fill';
  const fixedHeight = height === 'fill' ? 340 : height;
  const measured = useChartSize(rootRef, fixedHeight, fillHeight);
  const narrow = measured.width > 0 && measured.width < 420;
  // Pills size to their text, so they stay useful on much narrower plots than the readout panel.
  const pillsHidden = measured.width > 0 && measured.width < 240;
  const size = useMemo<ChartSize>(
    () => ({
      width: measured.width,
      height: fillHeight ? measured.height : narrow && compactHeight ? compactHeight : fixedHeight,
    }),
    [compactHeight, fillHeight, fixedHeight, measured.height, measured.width, narrow],
  );
  const refreshSvgBounds = useCallback(() => {
    svgBoundsRef.current = svgRef.current?.getBoundingClientRect() ?? null;
  }, []);
  useLayoutEffect(() => {
    refreshSvgBounds();
    document.addEventListener('scroll', refreshSvgBounds, true);
    window.addEventListener('resize', refreshSvgBounds);
    return () => {
      document.removeEventListener('scroll', refreshSvgBounds, true);
      window.removeEventListener('resize', refreshSvgBounds);
    };
  }, [refreshSvgBounds, size.width, size.height]);
  const effectiveMargins = useMemo<ChartMargins>(
    () => ({
      ...margins,
      left: narrow ? Math.min(65, margins.left) : margins.left,
      right: narrow ? Math.min(44, margins.right) : margins.right,
    }),
    [margins, narrow],
  );
  const reducedMotion = useReducedMotion(motionPreference);
  const normalizedResult = useNormalizedData(data, series, x, arrangement.stack);
  const target = normalizedResult.value;
  const validTarget = target !== null && target.rows.length > 0 && hasFiniteValue(target);
  const id = normalizeDomId(useId());
  const clipId = `${id}-reveal`;
  const gridGradientId = `${id}-grid-fade`;
  const paintIdForSeries = useCallback(
    (seriesId: string, treatment: 'fade' | 'hatch' | 'dots') => {
      const index = series.findIndex((descriptor) => descriptor.id === seriesId);
      return paintId(id, index, treatment);
    },
    [id, series],
  );
  const highlightMaskId = `${id}-highlight-mask`;
  const crossGradientId = `${id}-cross-fade`;
  const lifecycle = useRef(createLifecycleGeneration());
  const lastDataUpdateAt = useRef(Number.NEGATIVE_INFINITY);
  const initialValid = status === 'ready' && validTarget;
  const initialTransitionRef = useRef<ChartTransition<T> | null | undefined>(undefined);
  if (initialTransitionRef.current === undefined) {
    initialTransitionRef.current =
      initialValid && target && animateIn && !reducedMotion
        ? {
            id: lifecycle.current.next(),
            kind: 'initial',
            from: null,
            to: target,
            duration: compact ? COMPACT_ENTRANCE_DURATION : durationForPhase('initial', false),
          }
        : null;
  }
  const initialTransition = initialTransitionRef.current;
  const [accepted, setAccepted] = useState<NormalizedData<T> | null>(() =>
    initialValid ? target : null,
  );
  const acceptedRef = useRef(accepted);
  // The observation slider has keyboard focus: its key hints then ride in the tooltip.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [transition, setTransition] = useState<ChartTransition<T> | null>(initialTransition);
  const [transitionProgress, setTransitionProgress] = useState(initialTransition ? 0 : 1);
  const transitionRef = useRef(transition);
  const [phase, setPhase] = useState<LifecyclePhase>(
    initialValid
      ? initialTransition
        ? 'revealing'
        : 'ready'
      : status === 'loading'
        ? 'pending'
        : 'empty',
  );
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const skeletonVisibleRef = useRef(false);
  const [skeletonLeaving, setSkeletonLeaving] = useState(false);
  const skeletonLeavingRef = useRef(false);
  skeletonLeavingRef.current = skeletonLeaving;
  const [skeletonReleased, setSkeletonReleased] = useState(false);
  // The skeleton as it was while data was loading: it keeps that exact shape on its way out,
  // rather than redrawing from the data that has just landed.
  const skeletonElementRef = useRef<ReactElement | null>(null);
  const resetRef = useRef(resetKey);
  const displayedRef = useRef<NormalizedData<T> | null>(accepted);
  const callbackRef = useRef(onSelectionChange);
  const pointerFrameRef = useRef<number | null>(null);
  const pointerEventRef = useRef<PointerEvent | null>(null);
  const touchStartRef = useRef<{ x: number; moved: boolean } | null>(null);
  const compareDragRef = useRef<{
    startX: number;
    startIndex: number;
    series: string;
    clientX: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);
  const suppressNextClick = useCallback(() => {
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current !== null) window.clearTimeout(suppressClickTimerRef.current);
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 750);
  }, []);
  const comparePointerRef = useRef<{ clientX: number } | null>(null);
  const compareFrameRef = useRef<number | null>(null);
  const chartId = `${id}-owner`;
  useEffect(() => () => controller?.releaseOwner(chartId), [chartId, controller]);
  const controllerSnapshot = useSyncExternalStore(
    controller?.subscribe ?? subscribeNever,
    controller?.getSnapshot ?? getEmptyControllerSnapshot,
    controller?.getSnapshot ?? getEmptyControllerSnapshot,
  );
  const compareConfig = useMemo<ChartCompareConfig>(
    () => (compare === true ? {} : compare || {}),
    [compare],
  );
  const focusConfig = useMemo<ChartFocusConfig>(() => (focus === true ? {} : focus || {}), [focus]);
  const liveConfig = useMemo<ChartLiveConfig>(() => (live === true ? {} : live || {}), [live]);
  const compareEnabled = Boolean(compare);
  const focusEnabled = Boolean(focus || brush);
  const liveEnabled = Boolean(live);
  const [internalVisibleSeries, setInternalVisibleSeries] = useState<readonly string[]>(
    () => model?.getSnapshot().visibleSeries ?? series.map((item) => item.id),
  );
  const previousSeriesIdsRef = useRef(series.map((item) => item.id));
  useEffect(() => {
    if (visibleSeries) return;
    const nextIds = series.map((item) => item.id);
    const previousIds = previousSeriesIdsRef.current;
    previousSeriesIdsRef.current = nextIds;
    setInternalVisibleSeries((current) => {
      const retained = current.filter((idValue) => nextIds.includes(idValue));
      const added = nextIds.filter((idValue) => !previousIds.includes(idValue));
      const next = [...retained, ...added];
      return next.length === current.length &&
        next.every((idValue, index) => idValue === current[index])
        ? current
        : next;
    });
  }, [series, visibleSeries]);
  const visibleIds = visibleSeries ?? internalVisibleSeries;
  const [isolation, setIsolation] = useState<VisibilityIsolation | null>(null);
  useEffect(() => {
    setIsolation((current) => {
      const next = reconcileIsolation(
        current,
        visibleIds,
        series.map((item) => item.id),
      );
      if (!current || !next) return next;
      return sameVisibleSet(current.restore, next.restore) &&
        sameVisibleSet(current.expected, next.expected) &&
        sameVisibleSet(current.previous, next.previous)
        ? current
        : next;
    });
  }, [series, visibleIds]);
  const activeSeries = useMemo(() => {
    return series.filter((descriptor) => visibleIds.includes(descriptor.id));
  }, [series, visibleIds]);
  const seriesWeights = useSeriesWeights(
    series.map((item) => item.id),
    visibleIds,
    Boolean(arrangement.stack),
    reducedMotion,
  );
  const stackWeights = arrangement.stack ? seriesWeights : undefined;
  // The series the pointer is closest to, or the one chosen with Up/Down.
  const [pointerSeries, setPointerSeries] = useState<string | null>(null);
  const pointerSeriesRef = useRef<string | null>(null);
  pointerSeriesRef.current = pointerSeries;
  const [focusedSeries, setFocusedSeries] = useState<string | null>(null);
  const isVisibleSeries = (id: string | null | undefined): id is string =>
    Boolean(id && activeSeries.some((item) => item.id === id));
  const lockedSeries = pillSeries !== 'nearest' && pillSeries !== 'total' ? pillSeries : null;
  // One active series drives the pill, halo, and legend highlight: legend focus wins, then a
  // locked series, then the series nearest the pointer, then the plot's inspection series.
  const inspectionSeries: string | undefined = isVisibleSeries(focusedSeries)
    ? focusedSeries
    : isVisibleSeries(lockedSeries)
      ? lockedSeries
      : pillSeries === 'nearest' && isVisibleSeries(pointerSeries)
        ? pointerSeries
        : plotInspectionSeries;
  const [compareStart, setCompareStart] = useState<number | null>(null);
  const [comparePreview, setComparePreview] = useState<ChartRange | null>(null);
  const keyboardComparisonCommitRef = useRef(false);
  const [baselineProbe, setBaselineProbe] = useState<{ baselineX: number; probeX: number } | null>(
    null,
  );
  const baselineProbeRef = useRef(baselineProbe);
  baselineProbeRef.current = baselineProbe;
  const [editingEndpoint, setEditingEndpoint] = useState<ComparisonEndpoint | null>(null);
  const endpointEditRef = useRef<{
    handle: ComparisonEndpoint;
    original: ChartRange & { series?: string };
    draft: ChartRange;
    pointerId?: number;
  } | null>(null);
  const [localComparison, setLocalComparison] = useState<(ChartRange & { series?: string }) | null>(
    null,
  );
  const comparisonRange = controller ? controllerSnapshot.comparison : localComparison;
  const [localFocus, setLocalFocus] = useState<ChartRange | null>(null);
  const focusRange = controller ? controllerSnapshot.focus : localFocus;
  const [followingLive, setFollowingLive] = useState(true);
  const [historyDomain, setHistoryDomain] = useState<readonly [number, number] | null>(null);
  const [domainPrevious, setDomainPrevious] = useState<ChartSnapshot<T> | null>(null);
  const [domainAnimating, setDomainAnimating] = useState(false);
  // Showing or hiding a line or area series: the y domain glides to its new scale in one layer,
  // and the series fades on that moving scale, rather than two charts cross-fading.
  const [scaleGlide, setScaleGlide] = useState<{
    id: number;
    from: readonly [number, number];
    progress: number;
  } | null>(null);
  const domainTimerRef = useRef<number | null>(null);
  const dataPulse = useRef({ id: -1, count: 0 });
  // Charts of areas take a period change as a wave rolling across them (motion/area-flow).
  const flowing =
    series.some((item) => item.area) &&
    !(arrangement.bars && series.some((item) => arrangement.bars!.includes(item.id)));
  const lastSnapshotRef = useRef<ChartSnapshot<T> | null>(null);
  const previousVisibleKeyRef = useRef(activeSeries.map((item) => item.id).join('|'));

  acceptedRef.current = accepted;
  transitionRef.current = transition;
  skeletonVisibleRef.current = skeletonVisible;
  callbackRef.current = onSelectionChange;

  const startTransition = useCallback(
    (
      next: NormalizedData<T>,
      kind: TransitionKind,
      from: NormalizedData<T> | null,
      durationOverride?: number,
    ) => {
      const idValue = lifecycle.current.next();
      const duration =
        durationOverride ??
        (compact && kind === 'initial' && animateIn && !reducedMotion
          ? COMPACT_ENTRANCE_DURATION
          : durationForPhase(kind, reducedMotion, animateIn));
      const dataUpdate = kind !== 'initial';
      const now = performance.now();
      // Dense or rapidly refreshed charts retain every point for drawing and
      // inspection, but accept the latest snapshot without a per-sample tween.
      const effectiveDuration =
        dataUpdate &&
        skipDataTweenForWorkload(
          next.rows.length * next.series.length,
          now - lastDataUpdateAt.current,
        )
          ? 0
          : duration;
      if (dataUpdate) lastDataUpdateAt.current = now;
      acceptedRef.current = next;
      setAccepted(next);
      setTransition(
        effectiveDuration === 0
          ? null
          : {
              id: idValue,
              kind,
              from,
              to: next,
              duration: effectiveDuration,
              fromDomain: lastSnapshotRef.current?.yDomain,
            },
      );
      setTransitionProgress(effectiveDuration === 0 ? 1 : 0);
      setPhase(
        effectiveDuration === 0
          ? 'ready'
          : kind !== 'initial'
            ? 'updating'
            : kind === 'initial'
              ? 'revealing'
              : 'ready',
      );
    },
    [animateIn, compact, reducedMotion],
  );

  useEffect(() => {
    if (status !== 'loading' || acceptedRef.current) {
      // Ready data on an empty chart lets the skeleton leave on its own (see below), and a
      // skeleton already leaving finishes its fade even once the data has been accepted.
      if ((status !== 'ready' || acceptedRef.current) && !skeletonLeavingRef.current) {
        setSkeletonVisible(false);
      }
      return;
    }
    setPhase('pending');
    setSkeletonVisible(false);
    const timer = window.setTimeout(() => {
      setSkeletonVisible(true);
      setPhase('loading');
    }, 120);
    return () => window.clearTimeout(timer);
  }, [accepted, resetKey, status]);

  // A layout effect, so data that lands starts its entrance before the browser paints: as a
  // plain effect, one frame of the finished chart showed between the skeleton and the reveal.
  useLayoutEffect(() => {
    const resetChanged = resetRef.current !== resetKey;
    if (resetChanged) {
      resetRef.current = resetKey;
      lastDataUpdateAt.current = Number.NEGATIVE_INFINITY;
      lifecycle.current.next();
      acceptedRef.current = null;
      setAccepted(null);
      setTransition(null);
      setSkeletonVisible(false);
      selectionRef.current = null;
      setSelection(null);
      controller?.clearInspection(model ? undefined : chartId);
      setPhase(status === 'loading' ? 'pending' : 'revealing');
      callbackRef.current?.(null);
    }
    if (normalizedResult.error) {
      if (!acceptedRef.current) setPhase('error');
      setSkeletonVisible(false);
      return;
    }
    if (status === 'loading') {
      setSkeletonLeaving(false);
      setSkeletonReleased(false);
      if (acceptedRef.current) setPhase('updating');
      return;
    }
    if (status === 'error') {
      setPhase(acceptedRef.current ? 'ready' : 'error');
      return;
    }
    if (!target || !validTarget) {
      if (target && acceptedRef.current !== target) {
        acceptedRef.current = target;
        setAccepted(target);
        setTransition(null);
        setSelection(null);
        selectionRef.current = null;
        controller?.clearInspection(model ? undefined : chartId);
        callbackRef.current?.(null);
      }
      setSkeletonVisible(false);
      setPhase('empty');
      return;
    }
    if (!acceptedRef.current) {
      // A skeleton on screen leaves first, whatever point its loop is at; the data enters as
      // it goes.
      if (skeletonVisibleRef.current && !reducedMotion && !skeletonReleased) {
        setSkeletonLeaving(true);
        return;
      }
      startTransition(target, 'initial', null);
      if (!skeletonReleased) setSkeletonVisible(false);
      return;
    }
    if (sameData(acceptedRef.current, target)) {
      if (acceptedRef.current !== target) {
        acceptedRef.current = target;
        setAccepted(target);
      }
      return;
    }
    const from = displayedRef.current ?? acceptedRef.current;
    if (hasMatchingTopology(acceptedRef.current, target, activeSeries)) {
      startTransition(
        target,
        'matched-update',
        from,
        flowing && !reducedMotion ? FLOW_DURATION : undefined,
      );
      return;
    }
    // A chart of only bars takes new rows at once: each bar is an object that rises, drains and
    // springs to its place itself (useSnapBars), so the chart must not glide or cross-fade too.
    if (arrangement.bars && activeSeries.every((item) => arrangement.bars!.includes(item.id))) {
      startTransition(target, 'topology-update', from, 0);
      return;
    }
    startTransition(
      target,
      canMorphByKey(from, target, activeSeries) ? 'keyed-update' : 'topology-update',
      from,
    );
  }, [
    activeSeries,
    arrangement.bars,
    chartId,
    controller,
    flowing,
    normalizedResult.error,
    reducedMotion,
    resetKey,
    skeletonReleased,
    startTransition,
    status,
    target,
    validTarget,
  ]);

  // Data has landed on a skeleton: it freezes and sinks away, and hands over to the data's
  // entrance just before it is gone.
  useEffect(() => {
    if (!skeletonLeaving) return;
    const release = window.setTimeout(() => setSkeletonReleased(true), SKELETON_RELEASE_MS);
    const done = window.setTimeout(() => {
      setSkeletonLeaving(false);
      setSkeletonReleased(false);
      setSkeletonVisible(false);
    }, SKELETON_EXIT_MS);
    return () => {
      window.clearTimeout(release);
      window.clearTimeout(done);
    };
  }, [skeletonLeaving]);

  const entranceDisabled = !animateIn && transition?.kind === 'initial';
  useEffect(() => {
    if (!transition) return;
    if (reducedMotion || transition.duration === 0 || entranceDisabled || document.hidden) {
      setTransitionProgress(1);
      setTransition(null);
      setSkeletonVisible(false);
      setPhase('ready');
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (!lifecycle.current.isCurrent(transition.id)) return;
      const progress = Math.min(1, (now - started) / transition.duration);
      setTransitionProgress(progress);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      setTransition((current) => (current?.id === transition.id ? null : current));
      setSkeletonVisible(false);
      setPhase('ready');
    };
    const settleHidden = () => {
      if (!document.hidden) return;
      window.cancelAnimationFrame(frame);
      setTransitionProgress(1);
      setTransition(null);
      setSkeletonVisible(false);
      setPhase('ready');
    };
    document.addEventListener('visibilitychange', settleHidden);
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', settleHidden);
    };
  }, [entranceDisabled, reducedMotion, transition]);

  // Data landing on a skeleton waits for it to leave, then mounts with its own entrance.
  const currentData =
    accepted ??
    (status === 'ready' && validTarget && (!skeletonVisible || skeletonReleased) ? target : null);
  const keyed = transition?.kind === 'keyed-update';
  const dataProgress = keyed ? morphEase(transitionProgress) : revealEase(transitionProgress);
  const renderedData = useMemo(
    () =>
      transition?.from && transition.kind === 'matched-update'
        ? flowing
          ? flowFrame(transition.from, transition.to, transitionProgress)
          : interpolateMatchedData(transition.from, transition.to, dataProgress)
        : transition?.from && transition.kind === 'keyed-update'
          ? keyedFrame(transition.from, transition.to, dataProgress)
          : currentData,
    [currentData, transition, dataProgress, flowing, transitionProgress],
  );
  const xDomainOverride = useMemo<readonly [number, number] | null>(() => {
    if (focusRange) {
      return [
        Math.min(focusRange.startX, focusRange.endX),
        Math.max(focusRange.startX, focusRange.endX),
      ];
    }
    return liveEnabled ? historyDomain : null;
  }, [focusRange, historyDomain, liveEnabled]);
  const fromSnapshot = useMemo(
    () =>
      safeSnapshot(
        transition?.from ?? null,
        activeSeries,
        x,
        y,
        effectiveMargins,
        size,
        transition?.fromDomain,
        xDomainOverride,
        series,
        arrangement,
        stackWeights,
        barLayout,
        axisInset,
        decimate,
      ),
    [
      activeSeries,
      effectiveMargins,
      series,
      size,
      transition?.from,
      transition?.fromDomain,
      x,
      xDomainOverride,
      y,
      arrangement,
      stackWeights,
      barLayout,
      axisInset,
      decimate,
    ],
  );
  const destinationSnapshot = useMemo(
    () =>
      safeSnapshot(
        currentData,
        activeSeries,
        x,
        y,
        effectiveMargins,
        size,
        undefined,
        xDomainOverride,
        series,
        arrangement,
        stackWeights,
        barLayout,
        axisInset,
        decimate,
      ),
    [
      currentData,
      activeSeries,
      x,
      y,
      effectiveMargins,
      size,
      xDomainOverride,
      series,
      arrangement,
      stackWeights,
      barLayout,
      axisInset,
      decimate,
    ],
  );
  const focusDomain = useFocusDomain(
    destinationSnapshot?.yDomain
      ? { x: destinationSnapshot.xDomain, y: destinationSnapshot.yDomain }
      : null,
    focusRange ? `${focusRange.startX}:${focusRange.endX}` : 'full',
    currentData,
    `${size.width}:${size.height}`,
    reducedMotion,
  );
  const toSnapshot = useMemo(() => {
    const tweening = transition?.kind === 'matched-update' || transition?.kind === 'keyed-update';
    const glideY =
      scaleGlide && destinationSnapshot?.yDomain
        ? mixDomain(scaleGlide.from, destinationSnapshot.yDomain, morphEase(scaleGlide.progress))
        : null;
    if (!tweening && !focusDomain && !glideY) return destinationSnapshot;
    // A keyed morph glides the x domain on the data's clock; a focus zoom keeps its own.
    const keyedX =
      transition?.kind === 'keyed-update' && fromSnapshot && destinationSnapshot
        ? mixDomain(fromSnapshot.xDomain, destinationSnapshot.xDomain, dataProgress)
        : null;
    const domain =
      focusDomain?.y ??
      glideY ??
      (fromSnapshot?.yDomain && destinationSnapshot?.yDomain
        ? ([
            fromSnapshot.yDomain[0] +
              (destinationSnapshot.yDomain[0] - fromSnapshot.yDomain[0]) * dataProgress,
            fromSnapshot.yDomain[1] +
              (destinationSnapshot.yDomain[1] - fromSnapshot.yDomain[1]) * dataProgress,
          ] as const)
        : undefined);
    return safeSnapshot(
      renderedData,
      activeSeries,
      x,
      y,
      effectiveMargins,
      size,
      domain,
      focusDomain?.x ?? keyedX ?? xDomainOverride,
      series,
      arrangement,
      stackWeights,
      barLayout,
      axisInset,
      decimate,
    );
  }, [
    activeSeries,
    destinationSnapshot,
    focusDomain,
    effectiveMargins,
    fromSnapshot,
    renderedData,
    series,
    size,
    transition?.kind,
    dataProgress,
    scaleGlide,
    x,
    xDomainOverride,
    y,
    arrangement,
    stackWeights,
    barLayout,
    axisInset,
    decimate,
  ]);
  const fullSnapshot = useMemo(
    () =>
      xDomainOverride === null
        ? destinationSnapshot
        : safeSnapshot(
            currentData,
            activeSeries,
            x,
            y,
            effectiveMargins,
            size,
            undefined,
            undefined,
            series,
            arrangement,
            stackWeights,
            barLayout,
            axisInset,
            decimate,
          ),
    [
      activeSeries,
      currentData,
      destinationSnapshot,
      effectiveMargins,
      series,
      size,
      x,
      xDomainOverride,
      y,
      arrangement,
      stackWeights,
      barLayout,
      axisInset,
      decimate,
    ],
  );
  const visibleKey = activeSeries.map((item) => item.id).join('|');
  useLayoutEffect(() => {
    const visibilityChanged =
      !arrangement.stack &&
      previousVisibleKeyRef.current !== visibleKey &&
      lastSnapshotRef.current &&
      toSnapshot;
    if (visibilityChanged && !arrangement.bars && !reducedMotion) {
      // Glide from wherever the scale is now, even mid-glide.
      const from = lastSnapshotRef.current?.yDomain;
      if (from) setScaleGlide({ id: performance.now(), from, progress: 0 });
    } else if (visibilityChanged) {
      setDomainPrevious(lastSnapshotRef.current);
      setDomainAnimating(true);
      if (domainTimerRef.current !== null) window.clearTimeout(domainTimerRef.current);
      domainTimerRef.current = window.setTimeout(
        () => {
          setDomainAnimating(false);
          setDomainPrevious(null);
          domainTimerRef.current = null;
        },
        reducedMotion ? 0 : 444,
      );
    }
    previousVisibleKeyRef.current = visibleKey;
    lastSnapshotRef.current = toSnapshot;
  }, [arrangement.bars, arrangement.stack, reducedMotion, toSnapshot, visibleKey]);

  const scaleGlideId = scaleGlide?.id;
  useEffect(() => {
    if (scaleGlideId === undefined) return;
    const started = performance.now();
    let frame = window.requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - started) / SCALE_GLIDE_MS);
      if (progress >= 1 || document.hidden) {
        setScaleGlide((current) => (current?.id === scaleGlideId ? null : current));
        return;
      }
      setScaleGlide((current) =>
        current?.id === scaleGlideId ? { ...current, progress } : current,
      );
      frame = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scaleGlideId]);
  displayedRef.current = renderedData ?? displayedRef.current;

  const [selection, setSelection] = useState<ChartSelection<T> | null>(() => {
    const inspection = model?.getSnapshot().inspection;
    return inspection
      ? {
          row: inspection.row,
          sourceIndex: inspection.sourceIndex,
          x: inspection.x,
          pinned: inspection.pinned,
        }
      : null;
  });
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  // This chart's own pin is local: Alt-click pinned it here only, so linked charts ignore it.
  const localPinRef = useRef(false);
  const modelActionProjection = useRef(false);

  const clearSelection = useCallback(() => {
    localPinRef.current = false;
    if (model && !modelActionProjection.current && x.type !== 'category') {
      if (selectionRef.current?.pinned) model.actions.release();
      else model.actions.clearInspection();
      return;
    }
    if (x.type === 'category' && selectedCategoryId !== undefined && selectedCategoryId !== null) {
      onSelectedCategoryIdChange?.(null);
      return;
    }
    if (!selectionRef.current) return;
    if (x.type === 'category' && selectionRef.current.pinned) onSelectedCategoryIdChange?.(null);
    selectionRef.current = null;
    setSelection(null);
    callbackRef.current?.(null);
    controller?.clearInspection(model ? undefined : chartId);
  }, [chartId, controller, model, onSelectedCategoryIdChange, selectedCategoryId, x.type]);

  const invalidateSelection = useCallback(
    (preserveController = false) => {
      if (!selectionRef.current) return;
      selectionRef.current = null;
      setSelection(null);
      callbackRef.current?.(null);
      if (!preserveController) controller?.clearInspection(model ? undefined : chartId);
    },
    [chartId, controller, model],
  );

  useEffect(() => {
    if (!interactive) invalidateSelection(true);
  }, [interactive, invalidateSelection]);

  const publishSelection = useCallback(
    (index: number, pinned: boolean, fromOwner = false, local = false) => {
      const snapshot = toSnapshot;
      const row = snapshot?.data.rows[index];
      if (!interactive || !snapshot || !row) return;
      if (pinned) localPinRef.current = local;
      if (model && !modelActionProjection.current && x.type !== 'category') {
        if (pinned) model.actions.pin(row.x, local ? { local } : undefined);
        else model.actions.inspect(row.x);
        return;
      }
      if (x.type === 'category' && selectedCategoryId !== undefined && !fromOwner) {
        if (pinned) onSelectedCategoryIdChange?.(row.categoryId ?? null);
        if (pinned || selectedCategoryId !== null) return;
      }
      const next: ChartSelection<T> = {
        row: row.datum,
        sourceIndex: row.sourceIndex,
        x: row.x,
        categoryId: row.categoryId,
        pinned,
        ...(pinned && local ? { local } : {}),
      };
      const current = selectionRef.current;
      if (
        current &&
        current.sourceIndex === next.sourceIndex &&
        current.pinned === next.pinned &&
        Boolean(current.local) === Boolean(next.local) &&
        current.row === next.row
      )
        return;
      selectionRef.current = next;
      setSelection(next);
      callbackRef.current?.(next);
      if (x.type === 'category' && pinned && !fromOwner)
        onSelectedCategoryIdChange?.(row.categoryId ?? null);
      if (x.type !== 'category')
        controller?.inspect({
          x: next.x,
          pinned,
          ownerId: chartId,
          ...(next.local ? { local: true } : {}),
        });
      if (liveEnabled && index < snapshot.data.rows.length - 1 && followingLive) {
        setFollowingLive(false);
        setHistoryDomain(snapshot.xDomain);
        liveConfig.onFollowingChange?.(false);
      }
    },
    [
      chartId,
      controller,
      followingLive,
      interactive,
      liveConfig,
      liveEnabled,
      model,
      onSelectedCategoryIdChange,
      selectedCategoryId,
      toSnapshot,
      x.type,
    ],
  );

  useEffect(() => {
    if (x.type !== 'category' || selectedCategoryId === undefined) return;
    // Acceptance runs first; wait for its state update before using this render's snapshot.
    if (accepted !== acceptedRef.current) return;
    if (selectedCategoryId === null) {
      if (selectionRef.current?.pinned) {
        if (interactive) clearSelection();
        else invalidateSelection();
      }
      return;
    }
    if (!toSnapshot) {
      invalidateSelection();
      if (status === 'ready' && accepted !== null) onSelectedCategoryIdChange?.(null);
      return;
    }
    const index = toSnapshot.data.rows.findIndex((row) => row.categoryId === selectedCategoryId);
    if (index < 0) {
      invalidateSelection();
      onSelectedCategoryIdChange?.(null);
    } else if (interactive) publishSelection(index, true, true);
  }, [
    accepted,
    clearSelection,
    interactive,
    invalidateSelection,
    onSelectedCategoryIdChange,
    publishSelection,
    selectedCategoryId,
    status,
    toSnapshot,
    x.type,
  ]);

  const nearestIndex = useCallback(
    (event: { clientX: number }, clampToPlot = false): number | null => {
      const snapshot = toSnapshot;
      const svg = svgRef.current;
      if (!snapshot || !svg || !snapshot.data.rows.length) return null;
      const bounds = svgBoundsRef.current ?? svg.getBoundingClientRect();
      svgBoundsRef.current = bounds;
      if (!bounds.width || !bounds.height) return null;
      const xPosition = ((event.clientX - bounds.left) / bounds.width) * size.width;
      if (
        !clampToPlot &&
        (xPosition < snapshot.plot.left - 8 || xPosition > snapshot.plot.right + 8)
      )
        return null;
      return nearestVisibleRowIndex(
        snapshot.data.rows,
        snapshot.xDomain,
        xPosition,
        snapshot.xToPixel,
      );
    },
    [size.width, toSnapshot],
  );

  /**
   * Where each series sits at a row, in reading order: lines and stack segments top to bottom,
   * grouped bars left to right.
   */
  const seriesPositionsAt = useCallback(
    (index: number) => {
      const row = toSnapshot?.data.rows[index];
      if (!toSnapshot || !row) return [];
      if (arrangement.bars) {
        const xPixel = toSnapshot.xToPixel(row.x);
        return activeSeries
          .flatMap((item) => {
            const bars = toSnapshot.geometry?.bars[item.id];
            if (!bars) {
              // A line drawn over grouped bars, such as a target or a rate.
              const geometry = toSnapshot.geometry?.series[item.id];
              const point = geometry ? pointAtX(geometry, xPixel) : null;
              return point ? [{ id: item.id, x: xPixel, y: point.y, line: true }] : [];
            }
            const bar = bars.find((entry) => entry.valueX === row.x);
            return bar
              ? [{ id: item.id, x: bar.x + bar.width / 2, y: bar.y + bar.height / 2, line: false }]
              : [];
          })
          .sort((a, b) => (arrangement.stack ? a.y - b.y : a.x - b.x));
      }
      const xPixel = toSnapshot.xToPixel(row.x);
      return activeSeries
        .flatMap((item) => {
          const geometry = toSnapshot.geometry?.series[item.id];
          const point = geometry ? pointAtX(geometry, xPixel) : null;
          return point ? [{ id: item.id, x: xPixel, y: point.y, line: true }] : [];
        })
        .sort((a, b) => a.y - b.y);
    },
    [activeSeries, arrangement, toSnapshot],
  );

  const updatePointerSeries = useCallback(
    (index: number, clientX: number, clientY: number) => {
      if (pillSeries !== 'nearest' || activeSeries.length < 2) return;
      // Measure fresh: a cached rectangle goes stale when the page scrolls under a resting pointer.
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds?.height || !bounds.width) return;
      svgBoundsRef.current = bounds;
      const x = ((clientX - bounds.left) / bounds.width) * size.width;
      const y = ((clientY - bounds.top) / bounds.height) * size.height;
      const positions = seriesPositionsAt(index);
      if (!positions.length) return;
      // Grouped bars sit side by side, so the pointer picks one horizontally; lines and stack
      // segments are picked vertically.
      const horizontal = Boolean(arrangement.bars && !arrangement.stack);
      // Over grouped bars a line wins while the pointer is close to it; otherwise the bar
      // under the pointer does.
      const nearLine = horizontal
        ? positions
            .filter((item) => item.line && Math.abs(item.y - y) <= LINE_REACH)
            .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0]
        : undefined;
      const candidates = horizontal
        ? nearLine
          ? [nearLine]
          : positions.filter((item) => !item.line)
        : positions;
      if (!candidates.length) return;
      const distances = candidates.map((item) => ({
        id: item.id,
        distance: horizontal && !nearLine ? Math.abs(item.x - x) : Math.abs(item.y - y),
      }));
      const best = distances.reduce((a, b) => (b.distance < a.distance ? b : a));
      const current = nearLine
        ? undefined
        : distances.find((item) => item.id === pointerSeriesRef.current);
      // Stay on the current series unless another is clearly closer, so crossings do not flicker.
      const hysteresis = horizontal ? 2 : 8;
      if (current && current.id !== best.id && current.distance - best.distance < hysteresis)
        return;
      if (best.id !== pointerSeriesRef.current) setPointerSeries(best.id);
    },
    [activeSeries.length, arrangement, pillSeries, seriesPositionsAt, size.height, size.width],
  );

  const schedulePointer = useCallback(
    (event: PointerEvent) => {
      if (compareEnabled && comparisonRange && !compareDragRef.current) return;
      // A pin holds x in place, but moving up and down still picks which series the pill reads.
      if (selectionRef.current?.pinned && event.pointerType !== 'touch') {
        if (toSnapshot)
          updatePointerSeries(
            indexForSource(toSnapshot, selectionRef.current.sourceIndex),
            event.clientX,
            event.clientY,
          );
        return;
      }
      pointerEventRef.current = event;
      if (pointerFrameRef.current !== null) return;
      pointerFrameRef.current = window.requestAnimationFrame(() => {
        pointerFrameRef.current = null;
        const latest = pointerEventRef.current;
        // A finger has no hover, so a swipe always glides: it lifts the pin and sets a new one
        // where the finger leaves the glass.
        if (!latest || (selectionRef.current?.pinned && latest.pointerType !== 'touch')) return;
        const index = nearestIndex(latest);
        if (index === null) return;
        publishSelection(index, false);
        updatePointerSeries(index, latest.clientX, latest.clientY);
      });
    },
    [
      compareEnabled,
      comparisonRange,
      nearestIndex,
      publishSelection,
      toSnapshot,
      updatePointerSeries,
    ],
  );

  const ownsKeyboardRef = useRef(false);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const chart = rootRef.current?.closest('[data-lilt-chart]');
      ownsKeyboardRef.current = Boolean(chart?.contains(target));
      if (target?.closest('button, a, input, [role="tab"]')) return;
      // A pin shared across linked charts belongs to the chart that set it: a chart following it
      // never lets go on an outside press, and the owner keeps it when the press lands on a
      // chart that follows it, so moving the pin there glides instead of starting over.
      if (controller?.getSnapshot().inspection?.ownerId === SYNC_OWNER) return;
      if (target?.closest('.lilt-chart__plot-host')?.querySelector('.lilt-chart__pin[data-ghost]'))
        return;
      if (
        selectionRef.current?.pinned &&
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      )
        clearSelection();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
      if (compareFrameRef.current !== null) window.cancelAnimationFrame(compareFrameRef.current);
      if (suppressClickTimerRef.current !== null)
        window.clearTimeout(suppressClickTimerRef.current);
    };
  }, [clearSelection, controller]);

  useEffect(() => {
    const current = selectionRef.current;
    if (!current || !toSnapshot) return;
    const nextIndex = toSnapshot.data.rows.findIndex((row) =>
      current.categoryId === undefined
        ? row.x === current.x
        : row.categoryId === current.categoryId,
    );
    if (nextIndex < 0) {
      invalidateSelection();
      return;
    }
    const row = toSnapshot.data.rows[nextIndex];
    if (row.datum === current.row && row.sourceIndex === current.sourceIndex) return;
    const next = {
      row: row.datum,
      sourceIndex: row.sourceIndex,
      x: row.x,
      categoryId: row.categoryId,
      pinned: current.pinned,
    };
    selectionRef.current = next;
    setSelection(next);
    callbackRef.current?.(next);
  }, [invalidateSelection, resetKey, toSnapshot]);

  useEffect(() => {
    if (!controller || !interactive || !toSnapshot || x.type === 'category') return;
    if (
      !acceptedRef.current ||
      !acceptedRef.current.rows.length ||
      !hasFiniteValue(acceptedRef.current)
    )
      return;
    const linked = controllerSnapshot.inspection;
    if (!linked) {
      // A model pin can be queued for the next animation frame while this view mounts.
      if (model?.getSnapshot().inspection?.pinned) return;
      if (selectionRef.current) {
        selectionRef.current = null;
        setSelection(null);
        callbackRef.current?.(null);
      }
      return;
    }
    let index = toSnapshot.data.rows.findIndex((row) => row.x === linked.x);
    if (index < 0 && linkedSelection !== 'exact') {
      let distance = Number.POSITIVE_INFINITY;
      toSnapshot.data.rows.forEach((row, rowIndex) => {
        const nextDistance = Math.abs(row.x - linked.x);
        if (nextDistance < distance) {
          distance = nextDistance;
          index = rowIndex;
        }
      });
      if (distance > linkedSelection.nearestWithin) index = -1;
    }
    if (index < 0) {
      if (selectionRef.current) {
        selectionRef.current = null;
        setSelection(null);
        callbackRef.current?.(null);
      }
      return;
    }
    const row = toSnapshot.data.rows[index];
    const current = selectionRef.current;
    if (current?.x === row.x && current.pinned === linked.pinned && current.row === row.datum)
      return;
    const next = { row: row.datum, sourceIndex: row.sourceIndex, x: row.x, pinned: linked.pinned };
    selectionRef.current = next;
    setSelection(next);
    callbackRef.current?.(next);
  }, [
    controller,
    controllerLinked,
    controllerSnapshot.inspection,
    interactive,
    linkedSelection,
    model,
    toSnapshot,
    x.type,
  ]);

  const compareSeriesId = [comparisonRange?.series, compareConfig.series, activeSeries[0]?.id].find(
    (id) => activeSeries.some((item) => item.id === id),
  );
  const comparison = useMemo(
    () =>
      compareEnabled &&
      comparisonRange &&
      compareSeriesId &&
      activeSeries.some((item) => item.id === compareSeriesId) &&
      currentData
        ? comparisonForRange(
            currentData,
            comparisonRange,
            compareSeriesId,
            compareConfig.percentage,
          )
        : null,
    [
      compareConfig.percentage,
      compareEnabled,
      compareSeriesId,
      comparisonRange,
      currentData,
      activeSeries,
    ],
  );
  useLayoutEffect(() => {
    if (!keyboardComparisonCommitRef.current || !comparison) return;
    keyboardComparisonCommitRef.current = false;
    rootRef.current
      ?.querySelector<HTMLElement>('.lilt-chart__comparison-handle[data-endpoint="start"]')
      ?.focus();
  }, [comparison]);

  const setComparisonRange = useCallback(
    (range: (ChartRange & { series?: string }) | null) => {
      if (model && !modelActionProjection.current) {
        if (range) model.actions.compare(range, compareConfig.percentage);
        else model.actions.clearComparison();
        return;
      }
      if (controller) controller.setComparison(range);
      else setLocalComparison(range);
    },
    [controller, model, compareConfig.percentage],
  );

  const cancelEndpointEdit = useCallback(() => {
    endpointEditRef.current = null;
    setEditingEndpoint(null);
    setComparePreview(null);
  }, []);
  const startEndpointEdit = useCallback(
    (handle: ComparisonEndpoint, pointerId?: number) => {
      if (!comparisonRange || !currentData) return;
      endpointEditRef.current = {
        handle,
        original: comparisonRange,
        draft: { startX: comparisonRange.startX, endX: comparisonRange.endX },
        pointerId,
      };
      setEditingEndpoint(handle);
      setComparePreview({ startX: comparisonRange.startX, endX: comparisonRange.endX });
    },
    [comparisonRange, currentData],
  );
  const updateEndpointEdit = useCallback(
    (handle: ComparisonEndpoint, nextIndex: number) => {
      const edit = endpointEditRef.current;
      const rows = currentData?.rows;
      if (!edit || edit.handle !== handle || !rows?.length) return;
      const otherX = handle === 'start' ? edit.draft.endX : edit.draft.startX;
      const other = rows.findIndex((row) => row.x === otherX);
      if (other < 0) return;
      const reversed = edit.original.startX > edit.original.endX;
      const min = reversed
        ? handle === 'start'
          ? other + 1
          : 0
        : handle === 'start'
          ? 0
          : other + 1;
      const max = reversed
        ? handle === 'start'
          ? rows.length - 1
          : other - 1
        : handle === 'start'
          ? other - 1
          : rows.length - 1;
      if (max < min) return;
      const xValue = rows[Math.max(min, Math.min(max, nextIndex))]?.x;
      if (xValue === undefined) return;
      edit.draft = {
        ...edit.draft,
        [handle === 'start' ? 'startX' : 'endX']: xValue,
      };
      setComparePreview(edit.draft);
    },
    [currentData],
  );
  const commitEndpointEdit = useCallback(() => {
    const edit = endpointEditRef.current;
    if (!edit) return;
    endpointEditRef.current = null;
    setEditingEndpoint(null);
    setComparePreview(null);
    if (edit.draft.startX !== edit.original.startX || edit.draft.endX !== edit.original.endX)
      setComparisonRange({ ...edit.draft, series: edit.original.series });
  }, [setComparisonRange]);
  useEffect(() => {
    const edit = endpointEditRef.current;
    if (!edit || !currentData) return;
    if (
      !currentData.rows.some((row) => row.x === edit.original.startX) ||
      !currentData.rows.some((row) => row.x === edit.original.endX)
    )
      cancelEndpointEdit();
  }, [cancelEndpointEdit, currentData]);

  const scheduleComparisonPointer = useCallback(
    (event: { clientX: number }) => {
      comparePointerRef.current = { clientX: event.clientX };
      if (compareFrameRef.current !== null) return;
      compareFrameRef.current = window.requestAnimationFrame(() => {
        compareFrameRef.current = null;
        const drag = compareDragRef.current;
        const latest = comparePointerRef.current;
        if (!latest) return;
        const index = nearestIndex(latest, true);
        const endX = index === null ? undefined : toSnapshot?.data.rows[index]?.x;
        if (endX === undefined) return;
        if (baselineProbeRef.current) {
          setBaselineProbe((current) =>
            current && current.probeX !== endX ? { ...current, probeX: endX } : current,
          );
          return;
        }
        if (!drag) return;
        setComparePreview({
          startX: Math.min(drag.startX, endX),
          endX: Math.max(drag.startX, endX),
        });
      });
    },
    [nearestIndex, toSnapshot],
  );

  const finishComparison = useCallback(
    (startX: number, endX: number, preserveOrder = false, seriesId = compareSeriesId) => {
      const range = {
        startX: preserveOrder ? startX : Math.min(startX, endX),
        endX: preserveOrder ? endX : Math.max(startX, endX),
        series: seriesId,
      };
      setComparisonRange(range);
      setCompareStart(null);
      setComparePreview(null);
      setBaselineProbe(null);
      clearSelection();
    },
    [clearSelection, compareSeriesId, setComparisonRange],
  );

  const chooseComparisonPoint = useCallback(
    (nextX: number) => {
      if (compareStart === null) {
        setCompareStart(nextX);
      } else if (compareStart === nextX) {
        setCompareStart(null);
      } else {
        keyboardComparisonCommitRef.current = true;
        finishComparison(compareStart, nextX);
      }
    },
    [compareStart, finishComparison],
  );

  const startDomainTransition = useCallback(
    (change: () => void) => {
      setDomainPrevious(toSnapshot);
      setDomainAnimating(true);
      if (domainTimerRef.current !== null) window.clearTimeout(domainTimerRef.current);
      change();
      domainTimerRef.current = window.setTimeout(
        () => {
          setDomainAnimating(false);
          setDomainPrevious(null);
          domainTimerRef.current = null;
        },
        reducedMotion ? 0 : 444,
      );
    },
    [reducedMotion, toSnapshot],
  );

  useEffect(
    () => () => {
      if (domainTimerRef.current !== null) window.clearTimeout(domainTimerRef.current);
    },
    [],
  );

  const setFocusRange = useCallback(
    (range: ChartRange | null) => {
      if (domainTimerRef.current !== null) window.clearTimeout(domainTimerRef.current);
      domainTimerRef.current = null;
      setDomainPrevious(null);
      setDomainAnimating(false);
      if (controller) controller.setFocus(range);
      else setLocalFocus(range);
      focusConfig.onChange?.(range);
    },
    [controller, focusConfig],
  );

  const clearComparison = useCallback(() => {
    setComparisonRange(null);
    if (focusRange) setFocusRange(null);
    setCompareStart(null);
    setComparePreview(null);
  }, [focusRange, setComparisonRange, setFocusRange]);

  const cancelComparison = useCallback(() => {
    if (endpointEditRef.current) {
      cancelEndpointEdit();
      return;
    }
    if (compareDragRef.current) {
      suppressNextClick();
    }
    compareDragRef.current = null;
    if (compareFrameRef.current !== null) {
      window.cancelAnimationFrame(compareFrameRef.current);
      compareFrameRef.current = null;
    }
    if (baselineProbeRef.current) {
      setBaselineProbe(null);
      return;
    }
    if (comparePreview) {
      setComparePreview(null);
      return;
    }
    if (compareStart !== null) {
      setCompareStart(null);
      return;
    }
    if (focusRange) {
      setFocusRange(null);
      return;
    }
    if (comparisonRange) {
      clearComparison();
      return;
    }
    clearSelection();
  }, [
    cancelEndpointEdit,
    clearComparison,
    clearSelection,
    comparePreview,
    compareStart,
    comparisonRange,
    focusRange,
    setFocusRange,
    suppressNextClick,
  ]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const chart = rootRef.current?.closest('[data-lilt-chart]');
      const target = event.target instanceof Node ? event.target : null;
      if (!chart || !target) return;
      if (target instanceof Element) {
        const targetedChart = target.closest('[data-lilt-chart]');
        if (targetedChart && targetedChart !== chart) return;
      }
      if (target instanceof Element && target.closest('[role="dialog"]') && !chart.contains(target))
        return;
      if (!chart.contains(target) && !ownsKeyboardRef.current) return;
      event.preventDefault();
      if (
        target instanceof Element &&
        target.closest(
          '.lilt-chart__tooltip, .lilt-chart__adaptive-custom, .lilt-chart__comparison-tooltip',
        )
      ) {
        rootRef.current?.focus({ preventScroll: true });
      }
      cancelComparison();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [cancelComparison]);

  const returnToLive = useCallback(() => {
    startDomainTransition(() => {
      setHistoryDomain(null);
      setFollowingLive(true);
      clearSelection();
      liveConfig.onFollowingChange?.(true);
    });
  }, [clearSelection, liveConfig, startDomainTransition]);

  const latestX = currentData?.rows.at(-1)?.x;
  const newPointCount =
    historyDomain && currentData
      ? currentData.rows.filter((row) => row.x > historyDomain[1]).length
      : 0;

  const publishVisibleSeries = useCallback(
    (next: readonly string[]) => {
      if (!visibleSeries) setInternalVisibleSeries(next);
      onVisibleSeriesChange?.(next);
    },
    [onVisibleSeriesChange, visibleSeries],
  );
  const updateVisibleSeries = useCallback(
    (next: readonly string[]) => {
      setIsolation(null);
      publishVisibleSeries(next);
    },
    [publishVisibleSeries],
  );
  const isolateSeries = useCallback(
    (id: string) => {
      const restore = isolation?.restore ?? visibleIds;
      setIsolation({ id, restore, expected: [id], previous: visibleIds });
      publishVisibleSeries([id]);
    },
    [isolation, publishVisibleSeries, visibleIds],
  );
  const restoreSelection = useCallback(() => {
    if (!isolation) return;
    const available = series.map((item) => item.id);
    const restored = isolation.restore.filter((id) => available.includes(id));
    setIsolation(null);
    publishVisibleSeries(restored);
  }, [isolation, publishVisibleSeries, series]);
  const showAllSeries = useCallback(() => {
    setIsolation(null);
    publishVisibleSeries(series.map((item) => item.id));
  }, [publishVisibleSeries, series]);

  const rootClassName = ['lilt-chart__plot-host', className].filter(Boolean).join(' ');
  const rootStyle = {
    ...style,
    '--lilt-chart-height': `${size.height || height}px`,
  } as ChartStyle;
  const emptyShape = useContext(EmptyShapeContext);
  const hasNoValues = Boolean(target && target.rows.length > 0 && !hasFiniteValue(target));
  const empty =
    phase === 'empty' ||
    (status === 'ready' && Boolean(target) && (target?.rows.length === 0 || hasNoValues));
  const showError =
    normalizedResult.error ?? (status === 'error' ? (error ?? 'Could not load chart data.') : null);
  // Marks and axes treat a keyed morph like any eased update; only the frames differ.
  const transitionKind = entranceDisabled
    ? null
    : transition?.kind === 'keyed-update'
      ? 'matched-update'
      : (transition?.kind ?? (domainAnimating ? 'matched-update' : null));
  const transitionDuration = entranceDisabled
    ? 0
    : (transition?.duration ?? (domainAnimating ? 420 : 0));
  const reveal = animateIn && !reducedMotion && transitionKind === 'initial';
  // Only a skeleton that is still loading redraws: from the render where data lands, it keeps
  // the exact shape it was looping in, rather than redrawing from the data.
  if (skeletonVisible && !skeletonLeaving && status === 'loading') {
    skeletonElementRef.current = (
      <LoadingLayer
        bottom={effectiveMargins.bottom}
        height={size.height}
        id={`${id}-skeleton`}
        left={effectiveMargins.left}
        opacity={1}
        reducedMotion={reducedMotion}
        right={effectiveMargins.right}
        top={effectiveMargins.top}
        visible
        width={size.width}
        marks={
          marks.some((mark) => mark.loading)
            ? 'columns'
            : arrangement.bars
              ? arrangement.stack
                ? 'bar-stack'
                : 'bars'
              : arrangement.stack
                ? 'area-stack'
                : 'line'
        }
        mark={marks.find((mark) => mark.loading)?.loading}
        compact={compact}
        barCount={data.length || 12}
        barAppearances={activeSeries
          .filter((item) => arrangement.bars?.includes(item.id))
          .map((item) => item.bar?.appearance ?? 'solid')}
        barWidth={barLayout.width}
        seriesCount={
          arrangement.bars
            ? Math.max(1, activeSeries.filter((item) => arrangement.bars!.includes(item.id)).length)
            : Math.max(1, activeSeries.length)
        }
        showLine={Boolean(
          arrangement.bars && activeSeries.some((item) => !arrangement.bars!.includes(item.id)),
        )}
        lineDepth={activeSeries.some(
          (item) =>
            !arrangement.bars?.includes(item.id) && item.line?.depth && !item.line.dasharray,
        )}
        axis={axisSides.y}
        inset={axisInset}
        loadingStyle={loadingStyle}
        edge={runoff && !arrangement.bars ? 0 : 8}
      />
    );
  }
  const skeletonElement = skeletonVisible ? skeletonElementRef.current : null;
  const sweep = entranceSweep(
    toSnapshot?.plot.left ?? 0,
    toSnapshot?.plot.width ?? size.width,
    reveal ? entranceProgress(transitionProgress * transitionDuration, 0, transitionDuration) : 1,
  );
  const crossfadeFrom = fromSnapshot ?? domainPrevious;
  // A period change that moves the marks (a value or keyed morph) passes the light motion blur
  // over them, like every other family. Charts of only bars pulse their own bars instead.
  const barsOnly = Boolean(
    arrangement.bars && activeSeries.every((item) => arrangement.bars!.includes(item.id)),
  );
  if (
    transition &&
    !barsOnly &&
    // A live chart takes new readings constantly; it never pulses.
    !liveEnabled &&
    (transition.kind === 'matched-update' || transition.kind === 'keyed-update') &&
    dataPulse.current.id !== transition.id
  )
    dataPulse.current = { id: transition.id, count: dataPulse.current.count + 1 };
  const crossfade = Boolean(
    (transitionKind === 'topology-update' || domainAnimating) && crossfadeFrom && toSnapshot,
  );

  const layerCache = useRef(
    new Map<string, { inputs: readonly unknown[]; element: ReactElement }>(),
  );
  const renderLayer = (
    snapshot: ChartSnapshot<T>,
    previousSnapshot: ChartSnapshot<T> | null,
    key: string,
    opacity?: number,
    initialOpacity?: number,
  ) => {
    const inspecting = Boolean(selection && !comparison);
    const activeFocus = activeSeries.some((item) => item.id === focusedSeries)
      ? focusedSeries
      : null;
    const layerReveal = reveal && !reducedMotion ? transitionProgress : 1;
    const inputs = [
      snapshot,
      previousSnapshot,
      opacity,
      initialOpacity,
      series,
      x,
      y,
      effectiveMargins,
      size,
      reducedMotion,
      transitionDuration,
      transitionKind,
      clipId,
      gridGradientId,
      paintIdForSeries,
      inspectionSeries,
      inspecting,
      activeFocus,
      activeSeries,
      layerReveal,
      reveal,
      children,
    ];
    const cached = layerCache.current.get(key);
    if (
      cached &&
      cached.inputs.length === inputs.length &&
      cached.inputs.every((input, index) => Object.is(input, inputs[index]))
    ) {
      return cached.element;
    }
    const context = makeContext(snapshot, previousSnapshot, {
      series,
      x,
      y,
      margins: effectiveMargins,
      size,
      reducedMotion,
      transitionDuration,
      transitionKind,
      clipId,
      gridGradientId,
      paintId: paintIdForSeries,
      inspectionSeries,
      inspecting,
      focusedSeries: activeFocus,
      visibleSeries: activeSeries.map((item) => item.id),
      revealProgress: layerReveal,
    });
    const element = (
      <m.g
        animate={{ opacity: opacity ?? 1 }}
        className="lilt-chart__data-layer"
        initial={
          initialOpacity !== undefined
            ? { opacity: initialOpacity }
            : opacity === undefined && reveal
              ? false
              : opacity !== undefined
                ? { opacity }
                : undefined
        }
        key={key}
        transition={{
          duration: reducedMotion
            ? 0
            : transitionKind === 'topology-update' || transitionKind === 'matched-update'
              ? transitionDuration / 1000
              : 0.12,
        }}
      >
        <ChartContextProvider value={context}>{children}</ChartContextProvider>
      </m.g>
    );
    if (!layerCache.current.has(key) && layerCache.current.size >= 3) layerCache.current.clear();
    layerCache.current.set(key, { inputs, element });
    return element;
  };

  const inViewRows = useMemo(
    () =>
      toSnapshot?.data.rows.filter(
        (row) => row.x >= toSnapshot.xDomain[0] && row.x <= toSnapshot.xDomain[1],
      ),
    [toSnapshot],
  );
  const firstInView = inViewRows?.[0];
  const lastInView = inViewRows?.at(-1);
  const rangeMin =
    firstInView && toSnapshot ? indexForSource(toSnapshot, firstInView.sourceIndex) : 0;
  const rangeMax =
    lastInView && toSnapshot ? indexForSource(toSnapshot, lastInView.sourceIndex) : 0;
  const selectedInView =
    selection &&
    toSnapshot &&
    selection.x >= toSnapshot.xDomain[0] &&
    selection.x <= toSnapshot.xDomain[1]
      ? selection
      : null;
  const rangeIndex =
    selectedInView && toSnapshot
      ? indexForSource(toSnapshot, selectedInView.sourceIndex)
      : rangeMax;
  const comparisonDescriptor = activeSeries.find((item) => item.id === compareSeriesId);
  const noVisibleSeries = visibleIds.length === 0;
  const detailRow = selectedInView?.row ?? lastInView?.datum ?? null;
  const detailX = selectedInView?.x ?? lastInView?.x;
  const detailText =
    detailRow && detailX !== undefined && toSnapshot
      ? `${toSnapshot.formatX(detailX)} · ${activeSeries
          .map(
            (descriptor) =>
              `${descriptor.label} ${valueText(descriptor, detailRow, toSnapshot.formatValue)}`,
          )
          .join(' · ')}`
      : noVisibleSeries
        ? 'No series selected'
        : 'No observation available';
  // Model actions inspect on this chart's behalf, so only other charts count as peers.
  // A card following its sync group reads out like the card under the pointer, pills included;
  // a shared pin shows on every linked card, as a ghost where it was not clicked.
  const syncFollower = controllerSnapshot.inspection?.ownerId === SYNC_OWNER;
  const peerInspection = Boolean(
    controllerSnapshot.inspection &&
      controllerSnapshot.inspection.ownerId !== chartId &&
      !(model && controllerSnapshot.inspection.ownerId === 'model'),
  );
  const previewComparison =
    (baselineProbe
      ? { startX: baselineProbe.baselineX, endX: baselineProbe.probeX }
      : (comparePreview ??
        (compareStart !== null && selection
          ? { startX: compareStart, endX: selection.x }
          : null))) &&
    compareSeriesId &&
    currentData
      ? comparisonForRange(
          currentData,
          baselineProbe
            ? { startX: baselineProbe.baselineX, endX: baselineProbe.probeX }
            : (comparePreview ?? { startX: compareStart!, endX: selection!.x }),
          compareSeriesId,
          compareConfig.percentage,
        )
      : null;
  const detailComparison = compareEnabled && interactive ? (previewComparison ?? comparison) : null;
  const comparisonStartX = detailComparison?.startX;
  const comparisonEndX = detailComparison?.endX;
  const comparisonFormat = toSnapshot?.formatValue;
  const comparisonEntries = useMemo(
    () =>
      comparisonStartX !== undefined &&
      comparisonEndX !== undefined &&
      currentData &&
      comparisonFormat
        ? comparisonRows(
            currentData,
            { startX: comparisonStartX, endX: comparisonEndX },
            activeSeries,
            comparisonFormat,
            compareConfig.percentage,
          )
        : [],
    [
      comparisonStartX,
      comparisonEndX,
      currentData,
      activeSeries,
      comparisonFormat,
      compareConfig.percentage,
    ],
  );
  const formattedStartX =
    comparisonStartX === undefined ? '' : (toSnapshot?.formatX(comparisonStartX) ?? '');
  const formattedEndX =
    comparisonEndX === undefined ? '' : (toSnapshot?.formatX(comparisonEndX) ?? '');
  const comparisonPhase = previewComparison ? 'preview' : 'complete';
  const comparisonFocused = Boolean(focusRange);
  const comparisonResult = useMemo<ChartComparisonResult<string, T> | null>(
    () =>
      comparisonStartX === undefined ||
      comparisonEndX === undefined ||
      comparisonEntries.length === 0
        ? null
        : {
            kind: 'range',
            startRow: currentData?.rows.find((row) => row.x === comparisonStartX)?.datum ?? null,
            endRow: currentData?.rows.find((row) => row.x === comparisonEndX)?.datum ?? null,
            startSourceIndex:
              currentData?.rows.find((row) => row.x === comparisonStartX)?.sourceIndex ?? null,
            endSourceIndex:
              currentData?.rows.find((row) => row.x === comparisonEndX)?.sourceIndex ?? null,
            percentagePolicy: compareConfig.percentage ?? 'positive-baseline',
            startX: comparisonStartX,
            endX: comparisonEndX,
            formattedStartX,
            formattedEndX,
            elapsed: Math.abs(comparisonEndX - comparisonStartX),
            phase: comparisonPhase,
            focused: comparisonFocused,
            series: comparisonEntries,
          },
    [
      comparisonStartX,
      comparisonEndX,
      formattedStartX,
      formattedEndX,
      comparisonPhase,
      comparisonFocused,
      comparisonEntries,
      currentData,
      compareConfig.percentage,
    ],
  );
  const comparisonCallback = useRef(compareConfig.onChange);
  comparisonCallback.current = compareConfig.onChange;
  useEffect(() => {
    comparisonCallback.current?.(comparisonResult);
  }, [comparisonResult]);
  const comparisonContext = useMemo<ChartComparisonContext<string, T> | null>(
    () =>
      comparisonResult
        ? {
            ...comparisonResult,
            motion: reducedMotion ? 'none' : 'auto',
            clear: () => {
              if (comparisonResult.phase === 'preview') cancelComparison();
              else clearComparison();
              rootRef.current?.focus({ preventScroll: true });
            },
            focus:
              comparisonResult.phase === 'complete' && focusEnabled && !comparisonResult.focused
                ? () =>
                    setFocusRange({ startX: comparisonResult.startX, endX: comparisonResult.endX })
                : undefined,
            fullRange:
              comparisonResult.phase === 'complete' && comparisonResult.focused
                ? () => setFocusRange(null)
                : undefined,
          }
        : null,
    [
      comparisonResult,
      reducedMotion,
      cancelComparison,
      clearComparison,
      focusEnabled,
      setFocusRange,
    ],
  );
  const compareFromPin = () => {
    if (!selectionRef.current?.pinned || !compareEnabled) return;
    const xValue = selectionRef.current.x;
    setBaselineProbe({ baselineX: xValue, probeX: xValue });
    setCompareStart(null);
    setComparePreview(null);
  };
  const endpointPointerDown = (
    handle: ComparisonEndpoint,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0 || !comparisonRange) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    startEndpointEdit(handle, event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endpointPointerMove = (
    handle: ComparisonEndpoint,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (endpointEditRef.current?.pointerId !== event.pointerId) return;
    const index = nearestIndex(event.nativeEvent, true);
    if (index !== null) updateEndpointEdit(handle, index);
  };
  const endpointPointerUp = (
    handle: ComparisonEndpoint,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (endpointEditRef.current?.pointerId !== event.pointerId) return;
    const index = nearestIndex(event.nativeEvent, true);
    if (index !== null) updateEndpointEdit(handle, index);
    commitEndpointEdit();
  };
  const endpointKeyDown = (
    handle: ComparisonEndpoint,
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === 'Escape') {
      if (!endpointEditRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      cancelEndpointEdit();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      commitEndpointEdit();
      return;
    }
    const rows = currentData?.rows;
    if (!rows || !comparisonRange) return;
    const draft = endpointEditRef.current?.draft ?? comparisonRange;
    const current = rows.findIndex(
      (row) => row.x === draft[handle === 'start' ? 'startX' : 'endX'],
    );
    const other = rows.findIndex((row) => row.x === draft[handle === 'start' ? 'endX' : 'startX']);
    if (current < 0 || other < 0) return;
    const reversed = comparisonRange.startX > comparisonRange.endX;
    const min = reversed
      ? handle === 'start'
        ? other + 1
        : 0
      : handle === 'start'
        ? 0
        : other + 1;
    const max = reversed
      ? handle === 'start'
        ? rows.length - 1
        : other - 1
      : handle === 'start'
        ? other - 1
        : rows.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = current - 1;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = current + 1;
        break;
      case 'PageDown':
        next = current - 5;
        break;
      case 'PageUp':
        next = current + 5;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!endpointEditRef.current) startEndpointEdit(handle);
    updateEndpointEdit(handle, next);
  };

  const keyboardHint = baselineProbe
    ? 'Arrow keys choose the second point. Enter compares. Escape keeps the pin.'
    : `Left and Right inspect.${pillSeries === 'nearest' && activeSeries.length > 1 ? ' Up and Down switch series.' : ''} ${compareEnabled ? 'Enter marks a range. ' : ''}Escape clears.`;
  const keyboardInput =
    interactive && toSnapshot && !noVisibleSeries && !(compareEnabled && comparisonRange) ? (
      <label className="lilt-chart__keyboard-input">
        <span className="lilt-chart__sr-only">Observation</span>
        <input
          aria-label="Select an observation"
          aria-valuetext={detailText}
          max={rangeMax}
          min={rangeMin}
          onChange={(event) => {
            const index = Number(event.currentTarget.value);
            const xValue = toSnapshot.data.rows[index]?.x;
            if (baselineProbe && xValue !== undefined)
              setBaselineProbe({ ...baselineProbe, probeX: xValue });
            else publishSelection(index, true, false, localPinRef.current);
          }}
          onFocus={(event) => {
            setKeyboardFocus(event.currentTarget.matches(':focus-visible'));
            publishSelection(rangeIndex, selection?.pinned ?? false);
          }}
          onBlur={() => setKeyboardFocus(false)}
          onKeyDown={(event) => {
            setKeyboardFocus(true);
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelComparison();
            }
            // Up and Down move the pill between series; Left and Right still move along x.
            if (
              (event.key === 'ArrowUp' || event.key === 'ArrowDown') &&
              pillSeries === 'nearest' &&
              activeSeries.length > 1 &&
              !baselineProbe
            ) {
              const positions = seriesPositionsAt(Number(event.currentTarget.value));
              if (positions.length > 1) {
                event.preventDefault();
                const current = positions.findIndex((item) => item.id === inspectionSeries);
                const step = event.key === 'ArrowUp' ? -1 : 1;
                const next = Math.min(
                  positions.length - 1,
                  Math.max(0, (current < 0 ? 0 : current) + step),
                );
                setPointerSeries(positions[next]!.id);
                return;
              }
            }
            // Enter pins for every linked chart; Alt+Enter pins this chart only.
            if (event.key === 'Enter' && !(compareEnabled && comparisonDescriptor)) {
              event.preventDefault();
              publishSelection(Number(event.currentTarget.value), true, false, event.altKey);
              return;
            }
            if (compareEnabled && comparisonDescriptor && event.key === 'Enter') {
              event.preventDefault();
              const xValue = toSnapshot.data.rows[Number(event.currentTarget.value)]?.x;
              if (xValue === undefined) return;
              if (baselineProbe) {
                if (xValue !== baselineProbe.baselineX) {
                  keyboardComparisonCommitRef.current = true;
                  finishComparison(baselineProbe.baselineX, xValue, true);
                }
                return;
              }
              chooseComparisonPoint(xValue);
            }
          }}
          type="range"
          value={
            baselineProbe
              ? Math.max(
                  rangeMin,
                  toSnapshot.data.rows.findIndex((row) => row.x === baselineProbe.probeX),
                )
              : rangeIndex
          }
        />
        <small>{keyboardHint}</small>
      </label>
    ) : null;

  const overviewView =
    focusEnabled &&
    !brush &&
    focusRange &&
    fullSnapshot &&
    focusConfig.overview !== false &&
    compareSeriesId
      ? { range: focusRange, series: compareSeriesId, snapshot: fullSnapshot }
      : null;

  const comparisonEndRow =
    comparisonContext?.phase === 'complete'
      ? toSnapshot?.data.rows.find((row) => row.x === comparisonContext.endX)
      : undefined;
  const legendRow =
    comparisonEndRow ??
    (selectedInView
      ? toSnapshot?.data.rows.find((row) => row.sourceIndex === selectedInView.sourceIndex)
      : lastInView);
  const legendObservations = useMemo(
    () =>
      (inViewRows ?? []).map((row) => ({
        id: row.categoryId ?? String(row.x),
        x: row.x,
        row: row.datum,
        sourceIndex: row.sourceIndex,
        label: toSnapshot?.formatX(row.x) ?? String(row.x),
        values: row.values,
        formattedValues: Object.fromEntries(
          series.map((descriptor) => {
            const value = row.values[descriptor.id];
            return [
              descriptor.id,
              value === null || value === undefined
                ? 'No data'
                : (descriptor.formatValue?.(value) ??
                  toSnapshot?.formatValue(value) ??
                  String(value)),
            ];
          }),
        ),
        statuses: row.statuses,
      })),
    [inViewRows, series, toSnapshot],
  );
  const legendView = {
    series: series.map((descriptor, index) => {
      const stacked = Boolean(arrangement.stack?.series.includes(descriptor.id));
      const kind: PaintKind = arrangement.bars?.includes(descriptor.id)
        ? 'bar'
        : stacked || (!arrangement.bars && descriptor.area)
          ? 'area'
          : 'line';
      return {
        id: descriptor.id,
        label: descriptor.label,
        color: seriesColor(descriptor, index),
        kind,
        treatment:
          kind === 'area'
            ? (descriptor.area?.treatment ?? (stacked ? 'solid' : 'fade'))
            : kind === 'bar'
              ? (descriptor.bar?.treatment ?? 'solid')
              : 'solid',
        dasharray: descriptor.line?.dasharray,
        visible: visibleIds.includes(descriptor.id),
        value: legendRow?.values[descriptor.id] ?? null,
        formattedValue: (() => {
          const value = legendRow?.values[descriptor.id];
          return value === null || value === undefined
            ? 'No data'
            : (descriptor.formatValue?.(value) ?? toSnapshot?.formatValue(value) ?? String(value));
        })(),
        status: legendRow?.statuses[descriptor.id] ?? 'observed',
      };
    }),
    reducedMotion,
    comparison: comparisonContext,
    observations: legendObservations,
    inspectedX: selectedInView?.x ?? null,
    pinnedX: selectedInView?.pinned ? selectedInView.x : null,
    onInspect: (xValue: number, pinned: boolean) => {
      const index = toSnapshot?.data.rows.findIndex((row) => row.x === xValue) ?? -1;
      if (index >= 0) publishSelection(index, pinned);
    },
    onClearInspect: () => {
      if (!selectionRef.current?.pinned) clearSelection();
    },
    onReleaseInspect: clearSelection,
    onFocus: (id: string | null) => {
      setFocusedSeries(id);
      if (
        id &&
        !selectionRef.current?.pinned &&
        !selectionRef.current &&
        lastInView &&
        toSnapshot
      ) {
        publishSelection(indexForSource(toSnapshot, lastInView.sourceIndex), false);
      }
      if (!id && !selectionRef.current?.pinned) clearSelection();
    },
    onVisibleChange: updateVisibleSeries,
    isolatedId: isolation?.id ?? null,
    onIsolate: isolateSeries,
    onRestore: restoreSelection,
    onShowAll: showAllSeries,
  };

  useLayoutEffect(() => {
    if (!model || !toSnapshot || !model.getAcceptedFrame()) return;
    const row =
      selectedInView && toSnapshot
        ? toSnapshot.data.rows.find(
            (candidate) =>
              candidate.sourceIndex === selectedInView.sourceIndex &&
              candidate.x === selectedInView.x,
          )
        : undefined;
    publishCartesianModel<T, string>(
      model,
      {
        inspection:
          row && toSnapshot
            ? tooltipContext(
                toSnapshot,
                row,
                activeSeries,
                selectedInView!.pinned,
                activeSeries.length > 1 ? (inspectionSeries ?? null) : null,
              )
            : null,
        comparison: comparisonContext,
        visibleSeries: visibleIds,
        legend: legendView.series,
      },
      {
        inspect: (xValue) => {
          const index =
            toSnapshot?.data.rows.findIndex((candidate) => candidate.x === xValue) ?? -1;
          if (index >= 0) {
            modelActionProjection.current = true;
            try {
              publishSelection(index, false);
            } finally {
              modelActionProjection.current = false;
            }
          }
        },
        clearInspection: () => {
          if (!selectionRef.current?.pinned) {
            modelActionProjection.current = true;
            try {
              clearSelection();
            } finally {
              modelActionProjection.current = false;
            }
          }
        },
        pin: (xValue, options) => {
          const index =
            toSnapshot?.data.rows.findIndex((candidate) => candidate.x === xValue) ?? -1;
          if (index >= 0) {
            modelActionProjection.current = true;
            try {
              publishSelection(index, true, false, Boolean(options?.local));
            } finally {
              modelActionProjection.current = false;
            }
          }
        },
        release: () => {
          modelActionProjection.current = true;
          try {
            clearSelection();
          } finally {
            modelActionProjection.current = false;
          }
        },
        setVisibleSeries: updateVisibleSeries,
        focusSeries: legendView.onFocus,
        compare: (range) => {
          modelActionProjection.current = true;
          try {
            setComparisonRange(range);
          } finally {
            modelActionProjection.current = false;
          }
        },
        clearComparison: () => {
          modelActionProjection.current = true;
          try {
            comparisonContext?.clear?.();
          } finally {
            modelActionProjection.current = false;
          }
        },
        focusComparison: comparisonContext?.focus ?? (() => undefined),
        fullRange: comparisonContext?.fullRange ?? (() => undefined),
      },
    );
  });
  useEffect(
    () => () => {
      if (model) detachCartesianModel(model);
    },
    [model],
  );

  useLayoutEffect(() => {
    toolkit.publish({
      comparison: comparisonContext,
      toolbar:
        interactive && compareEnabled && comparisonDescriptor && toSnapshot && !noVisibleSeries
          ? {
              label: comparison
                ? 'Clear comparison'
                : baselineProbe || compareStart !== null
                  ? 'Cancel comparison'
                  : activeSeries.length > 1
                    ? 'Compare range'
                    : `Compare ${comparisonDescriptor.label}`,
              pressed: Boolean(baselineProbe || compareStart !== null),
              onClick: () => {
                if (comparison) {
                  clearComparison();
                  return;
                }
                if (baselineProbe || compareStart !== null) {
                  cancelComparison();
                  return;
                }
                const index = selectionRef.current
                  ? toSnapshot.data.rows.findIndex((row) => row.x === selectionRef.current!.x)
                  : rangeMin;
                const row = toSnapshot.data.rows[Math.max(rangeMin, index)];
                if (!row) return;
                publishSelection(Math.max(rangeMin, index), true);
                setBaselineProbe({ baselineX: row.x, probeX: row.x });
                requestAnimationFrame(() =>
                  rootRef.current?.querySelector<HTMLInputElement>('input[type="range"]')?.focus(),
                );
              },
            }
          : null,
      readout: narrow || peerInspection || detailComparison ? null : detailText,
      overview: overviewView
        ? { ...overviewView, snapshot: overviewView.snapshot as ChartSnapshot<unknown> }
        : null,
      brush:
        brush && fullSnapshot && fullSnapshot.data.rows.length > 1 && activeSeries[0]
          ? {
              snapshot: fullSnapshot as ChartSnapshot<unknown>,
              range: focusRange,
              seriesId: activeSeries[0].id,
              reducedMotion,
              onFocus: setFocusRange,
            }
          : null,
      legend: legendView,
    });
  });

  return (
    <AxisCursorContext.Provider value={axisCursor}>
      <div
        aria-busy={status === 'loading' && !accepted}
        data-lilt-axis={axisSides.x === axisSides.y ? axisSides.x : undefined}
        data-lilt-axis-x={axisSides.x}
        data-lilt-axis-y={axisSides.y}
        data-lilt-pill={pillStyle}
        className={rootClassName}
        data-lilt-focused={focusRange ? 'true' : undefined}
        data-lilt-inspecting={interactive && selection ? 'true' : 'false'}
        data-lilt-live={liveEnabled ? (followingLive ? 'following' : 'paused') : undefined}
        data-lilt-phase={phase}
        data-lilt-bars={arrangement.bars ? 'true' : undefined}
        data-lilt-stack={arrangement.stack?.mode}
        data-lilt-compact={compact || undefined}
        data-lilt-adaptive={narrow || peerInspection ? 'true' : undefined}
        data-lilt-fill={fillHeight ? 'true' : undefined}
        ref={rootRef}
        style={rootStyle}
        tabIndex={-1}
      >
        <svg
          aria-label={`${ariaLabel} plot`}
          className="lilt-chart__svg"
          height={size.height}
          tabIndex={interactive && compact ? 0 : undefined}
          onFocus={() => {
            if (compact && !selectionRef.current) publishSelection(rangeMax, false);
          }}
          onBlur={() => {
            if (compact) clearSelection();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelComparison();
              return;
            }
            if (!compact) return;
            const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const index =
              selectionRef.current && toSnapshot
                ? indexForSource(toSnapshot, selectionRef.current.sourceIndex)
                : rangeMax;
            const next =
              event.key === 'Home'
                ? rangeMin
                : event.key === 'End'
                  ? rangeMax
                  : Math.min(
                      rangeMax,
                      Math.max(rangeMin, index + (event.key === 'ArrowRight' ? 1 : -1)),
                    );
            publishSelection(next, false);
          }}
          onClick={(event) => {
            if (!interactive) return;
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            const index = nearestIndex(event.nativeEvent);
            if (index === null) return;
            const clickedX = toSnapshot?.data.rows[index]?.x;
            if (baselineProbe && clickedX !== undefined) {
              if (clickedX !== baselineProbe.baselineX)
                finishComparison(baselineProbe.baselineX, clickedX, true);
              return;
            }
            if (
              compareEnabled &&
              comparisonRange &&
              !focusRange &&
              focusEnabled &&
              clickedX !== undefined &&
              clickedX >= Math.min(comparisonRange.startX, comparisonRange.endX) &&
              clickedX <= Math.max(comparisonRange.startX, comparisonRange.endX)
            ) {
              setFocusRange(comparisonRange);
              return;
            }
            if (compareEnabled && comparisonRange) return;
            const local = event.altKey || localPinRef.current;
            if (
              selectionRef.current?.pinned &&
              selectionRef.current.sourceIndex === toSnapshot?.data.rows[index]?.sourceIndex &&
              !(event.altKey && !localPinRef.current)
            ) {
              clearSelection();
            } else {
              publishSelection(index, true, false, local);
            }
          }}
          onPointerCancel={() => {
            touchStartRef.current = null;
            compareDragRef.current = null;
            setComparePreview(null);
            pointerEventRef.current = null;
          }}
          onPointerEnter={refreshSvgBounds}
          onPointerDown={(event) => {
            if (baselineProbe) return;
            if (compareEnabled && comparisonDescriptor && event.button === 0) {
              const index = nearestIndex(event.nativeEvent);
              const startX = index === null ? undefined : toSnapshot?.data.rows[index]?.x;
              if (index !== null && startX !== undefined) {
                const markSeries = (event.target as Element)
                  .closest('[data-series]')
                  ?.getAttribute('data-series');
                const seriesId = activeSeries.some((item) => item.id === markSeries)
                  ? markSeries!
                  : comparisonDescriptor.id;
                compareDragRef.current = {
                  startX,
                  startIndex: index,
                  series: seriesId,
                  clientX: event.clientX,
                  pointerId: event.pointerId,
                  moved: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              return;
            }
            if (event.pointerType === 'touch') {
              touchStartRef.current = { x: event.clientX, moved: false };
            }
          }}
          onPointerLeave={() => {
            if (!selectionRef.current?.pinned) clearSelection();
          }}
          onPointerMove={(event) => {
            if (baselineProbe) {
              if (event.pointerType !== 'touch') scheduleComparisonPointer(event.nativeEvent);
              return;
            }
            if (compareDragRef.current?.pointerId === event.pointerId) {
              const drag = compareDragRef.current;
              if (
                !drag.moved &&
                Math.abs(event.clientX - drag.clientX) > (event.pointerType === 'touch' ? 8 : 4)
              ) {
                drag.moved = true;
                clearSelection();
              }
              if (drag.moved) scheduleComparisonPointer(event.nativeEvent);
              return;
            }
            if (compareEnabled && comparisonRange) return;
            if (event.pointerType === 'touch') {
              const start = touchStartRef.current;
              if (!start) return;
              if (!start.moved && Math.abs(event.clientX - start.x) > 8) {
                start.moved = true;
                // Hold the finger once the swipe is sideways, so marks redrawn under it mid-glide
                // cannot drop the gesture.
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }
              if (start.moved) schedulePointer(event.nativeEvent);
              return;
            }
            schedulePointer(event.nativeEvent);
          }}
          onPointerUp={(event) => {
            if (baselineProbe) {
              if (event.pointerType === 'touch') {
                const index = nearestIndex(event.nativeEvent);
                const endX = index === null ? undefined : toSnapshot?.data.rows[index]?.x;
                if (endX !== undefined && endX !== baselineProbe.baselineX)
                  finishComparison(baselineProbe.baselineX, endX, true);
                suppressNextClick();
              }
              return;
            }
            if (compareDragRef.current?.pointerId === event.pointerId) {
              const drag = compareDragRef.current;
              compareDragRef.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              if (drag.moved) {
                const index = nearestIndex(event.nativeEvent, true);
                const endX = index === null ? undefined : toSnapshot?.data.rows[index]?.x;
                if (endX !== undefined && endX !== drag.startX)
                  finishComparison(drag.startX, endX, false, drag.series);
                else publishSelection(drag.startIndex, true);
                setComparePreview(null);
                suppressNextClick();
              }
              return;
            }
            if (event.pointerType !== 'touch') return;
            const index = nearestIndex(event.nativeEvent);
            if (index !== null) {
              publishSelection(index, true, false, localPinRef.current);
              suppressNextClick();
            }
            touchStartRef.current = null;
          }}
          ref={svgRef}
          style={{ touchAction: 'pan-y pinch-zoom' }}
          role="group"
          viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(1, size.height)}`}
          width="100%"
        >
          <defs>
            <clipPath id={`${clipId}-plot`}>
              <rect
                x={effectiveMargins.left}
                y={effectiveMargins.top}
                width={Math.max(0, size.width - effectiveMargins.left - effectiveMargins.right)}
                height={Math.max(0, size.height - effectiveMargins.top - effectiveMargins.bottom)}
              />
            </clipPath>
            <linearGradient
              id={`${clipId}-edge`}
              gradientUnits="userSpaceOnUse"
              x1={sweep.start}
              x2={sweep.end}
              y1={0}
              y2={0}
            >
              <stop offset="0" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity={0} />
            </linearGradient>
            <mask
              id={clipId}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
            >
              <rect
                width={size.width}
                height={size.height}
                fill={reveal ? `url(#${clipId}-edge)` : 'white'}
              />
            </mask>
            <linearGradient id={gridGradientId} x1="0" x2="1" y1="0" y2="0">
              <stop
                offset="0"
                stopColor="var(--lilt-grid)"
                stopOpacity="0"
                style={{ stopColor: 'var(--lilt-grid)' }}
              />
              <stop
                offset="0.08"
                stopColor="var(--lilt-grid)"
                stopOpacity="1"
                style={{ stopColor: 'var(--lilt-grid)' }}
              />
              <stop
                offset="0.92"
                stopColor="var(--lilt-grid)"
                stopOpacity="1"
                style={{ stopColor: 'var(--lilt-grid)' }}
              />
              <stop
                offset="1"
                stopColor="var(--lilt-grid)"
                stopOpacity="0"
                style={{ stopColor: 'var(--lilt-grid)' }}
              />
            </linearGradient>
            <ChartPaintDefs chartId={id} series={series} />
          </defs>
          {crossfade && crossfadeFrom && toSnapshot ? (
            <>
              {renderLayer(crossfadeFrom, null, `old-${transition?.id ?? 0}`, 0, 1)}
              {renderLayer(toSnapshot, fromSnapshot, `new-${transition?.id ?? 0}`, 1, 0)}
            </>
          ) : toSnapshot ? (
            <g data-lilt-snap={dataPulse.current.count ? dataPulse.current.count % 2 : undefined}>
              {renderLayer(toSnapshot, fromSnapshot ?? domainPrevious, 'current')}
            </g>
          ) : null}
        </svg>
        {keyboardInput}
        {skeletonVisible ? (
          // On its way out the skeleton holds its frame and sinks into the plot's floor as it
          // fades (loading.css): a CSS animation on transform and opacity, so it stays smooth
          // while the data's first render keeps the main thread busy.
          <div
            className="lilt-chart__skeleton-host"
            data-skeleton-leaving={skeletonLeaving ? 'bottom' : undefined}
            style={{
              transformOrigin: `50% ${Math.max(0, size.height - effectiveMargins.bottom)}px`,
            }}
          >
            {skeletonElement}
          </div>
        ) : null}
        {toSnapshot && selection && !previewComparison && !baselineProbe && !comparison ? (
          <InspectionLayer
            paintId={paintIdForSeries}
            seriesColors={Object.fromEntries(
              series.map((descriptor, index) => [descriptor.id, seriesColor(descriptor, index)]),
            )}
            crossGradientId={crossGradientId}
            height={size.height}
            highlightMaskId={highlightMaskId}
            inspectionSeries={inspectionSeries}
            stackedPill={pillSeries === 'total' ? 'total' : pillValue}
            reducedMotion={reducedMotion}
            selection={selection}
            onCompareFromHere={
              selection?.pinned && compareEnabled && !baselineProbe ? compareFromPin : undefined
            }
            series={activeSeries}
            marks={marks}
            snapshot={toSnapshot}
            width={size.width}
            compactPlot={compact}
            inlineOnly
            hideAxisBadges={pillsHidden || pill === false}
            panel={Boolean(tooltipNode) && !compact}
            peer={peerInspection && !syncFollower}
          />
        ) : null}
        <AnimatePresence>
          {toSnapshot &&
          selectedInView?.pinned &&
          !compact &&
          (!peerInspection || syncFollower) &&
          !baselineProbe &&
          !comparison ? (
            <PinMarker
              key="pin"
              left={toSnapshot.xToPixel(selectedInView.x) - PIN_SIZE / 2}
              // Just above the plot, where the crosshair starts, and never above the chart.
              top={Math.max(0, toSnapshot.plot.top - PIN_SIZE - 4)}
              reducedMotion={reducedMotion}
              // A linked chart's pin reads as a ghost of the one that was clicked.
              ghost={syncFollower}
              from={syncFollower ? controllerSnapshot.inspection?.from : undefined}
              local={!syncFollower && localPinRef.current}
              onRelease={clearSelection}
            />
          ) : null}
        </AnimatePresence>
        {toSnapshot && detailComparison ? (
          <ComparisonLayer
            comparison={detailComparison}
            rows={comparisonEntries}
            preview={Boolean(previewComparison && !editingEndpoint)}
            ranging={Boolean(previewComparison) || editingEndpoint !== null}
            reducedMotion={reducedMotion}
            snapshot={toSnapshot}
            onEndpointPointerDown={endpointPointerDown}
            onEndpointPointerMove={endpointPointerMove}
            onEndpointPointerUp={endpointPointerUp}
            onEndpointCancel={cancelEndpointEdit}
            onEndpointCommit={commitEndpointEdit}
            onEndpointKeyDown={endpointKeyDown}
          />
        ) : null}
        {tooltipNode ? (
          <TooltipViewProvider
            value={{
              inspection:
                toSnapshot && selectedInView && !detailComparison
                  ? (() => {
                      const row = toSnapshot.data.rows.find(
                        (candidate) =>
                          candidate.sourceIndex === selectedInView.sourceIndex &&
                          candidate.x === selectedInView.x,
                      );
                      return row
                        ? tooltipContext(
                            toSnapshot,
                            row,
                            activeSeries,
                            selectedInView.pinned,
                            activeSeries.length > 1 ? (inspectionSeries ?? null) : null,
                          )
                        : null;
                    })()
                  : null,
              comparison: comparisonContext,
              colors: Object.fromEntries(
                series.map((descriptor, index) => [descriptor.id, seriesColor(descriptor, index)]),
              ),
              x: toSnapshot && selectedInView ? toSnapshot.xToPixel(selectedInView.x) : 0,
              compareStartX:
                toSnapshot && comparisonContext ? toSnapshot.xToPixel(comparisonContext.startX) : 0,
              compareEndX:
                toSnapshot && comparisonContext ? toSnapshot.xToPixel(comparisonContext.endX) : 0,
              top: toSnapshot?.plot.top ?? 0,
              width: size.width,
              height: size.height,
              reducedMotion,
              compact,
              narrow,
              peer: peerInspection,
              keyboardHint: keyboardFocus && keyboardInput ? keyboardHint : null,
              adaptive:
                toSnapshot && !detailComparison
                  ? {
                      snapshot: toSnapshot as ChartSnapshot<unknown>,
                      series: activeSeries as readonly ChartSeries<unknown>[],
                      selection: selectedInView as ChartSelection<unknown> | null,
                      sharedX: controllerSnapshot.inspection?.x,
                      peer: peerInspection,
                      pinned: Boolean(selection?.pinned && !baselineProbe),
                      reducedMotion,
                      onRelease: clearSelection,
                      onCompareFromHere:
                        selection?.pinned && compareEnabled && !baselineProbe
                          ? compareFromPin
                          : undefined,
                    }
                  : null,
              onRelease: clearSelection,
              onCompareFromHere:
                selection?.pinned && compareEnabled && !baselineProbe ? compareFromPin : undefined,
            }}
          >
            {tooltipNode}
          </TooltipViewProvider>
        ) : null}
        {status === 'loading' && accepted ? (
          <div className="lilt-chart__updating" role="status">
            Updating
          </div>
        ) : null}
        {empty ? (
          <EmptySlot
            state={emptyState}
            shape={emptyShape}
            message={hasNoValues ? 'No values for this period' : 'No data for this period'}
          />
        ) : null}
        {noVisibleSeries ? <EmptySlot shape={emptyShape} message="No series selected" /> : null}
        {showError ? (
          <StatusContent
            kind={accepted ? 'refresh-error' : 'error'}
            message={showError}
            retry={renderRetry}
          />
        ) : null}
        {liveEnabled && !followingLive ? (
          <button className="lilt-chart__live-control" onClick={returnToLive} type="button">
            {newPointCount > 0
              ? `${newPointCount} new ${newPointCount === 1 ? 'point' : 'points'} · `
              : ''}
            {liveConfig.returnLabel ?? 'Return to live'}
          </button>
        ) : liveEnabled && latestX !== undefined ? (
          <span className="lilt-chart__live-badge">{liveConfig.label ?? 'Live'}</span>
        ) : null}
      </div>
    </AxisCursorContext.Provider>
  );
}

import type { CSSProperties, ReactElement, ReactNode } from 'react';

/** step-after holds the left value until the next x; step-before holds the right value. */
export type ChartCurve = 'linear' | 'monotone' | 'step-after' | 'step-before';
/** Restrained fills shared by marks and their inspection keys. */
export type ChartFillTreatment = 'solid' | 'fade' | 'hatch' | 'dots';
export type ChartObservationStatus = 'observed' | 'provisional' | 'forecast';
export type ChartMotion = 'auto' | 'none';
export type ChartStatus = 'loading' | 'ready' | 'error';
/** Standard CSS plus scoped Lilt tokens, usable on every chart root. */
export type ChartStyle = CSSProperties & {
  [token: `--lilt-${string}`]: string | number | undefined;
};

export interface ChartLineStyle {
  width?: number;
  opacity?: number;
  dasharray?: string;
  cap?: 'butt' | 'round' | 'square';
  join?: 'miter' | 'round' | 'bevel';
  /** Radius of isolated observations and inspected line or area points. */
  pointRadius?: number;
  pointStroke?: string;
  pointStrokeWidth?: number;
  /** Show the point on this series during inspection. Defaults to true. */
  showInspectionPoint?: boolean;
  /** Label the latest finite endpoint when the plot has a wide right gutter. */
  directLabel?: boolean;
  /** Mark every observation with a small dot ringed in the surface color. */
  points?: boolean;
  /**
   * Draws the line as a lit tube with a soft shadow beneath it. The centerline is the line's own
   * path, so every point reads where the flat line puts it.
   */
  depth?: boolean;
}

export interface ChartAreaStyle {
  /** Fade a solid or patterned area toward its baseline without changing geometry. */
  fade?: boolean;
  /** Fill opacity at rest. Defaults to 0.62 for stacks and 1 for gradients. */
  opacity?: number;
  /** CSS color or paint value. Omit to use Lilt's gradient or the series color. */
  fill?: string;
  /** A chart-owned paint treatment; explicit fill takes precedence. */
  treatment?: ChartFillTreatment;
}

/**
 * How a bar is drawn: `solid`, `segmented` into small cells, `needle` (a thin segmented line that
 * expands on hover), `gradient` fading toward the baseline, `outline`, or `isometric` with
 * shallow depth: a square prism whose front keeps the measured height and whose cap extends above
 * it. Corner radius does not apply to isometric bars.
 */
export type ChartBarAppearance =
  | 'solid'
  | 'segmented'
  | 'needle'
  | 'gradient'
  | 'outline'
  | 'isometric';

export interface ChartBarStyle {
  /** How each bar is drawn. Defaults to `solid`. */
  appearance?: ChartBarAppearance;
  /** Radius of the exposed value end in CSS pixels. Stacked bars default to 0. */
  radius?: number;
  /** Round both the top and bottom of each bar segment. */
  roundBothEnds?: boolean;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  /** Decorative paint clipped to the exact bar geometry. */
  treatment?: Exclude<ChartFillTreatment, 'fade'>;
  /**
   * Quiet full-scale lane behind each observed bar. In a stack, the bottom series' track sits
   * behind the whole column. It follows `roundBothEnds`.
   */
  track?: { fill?: string; opacity?: number; radius?: number };
}

export interface ChartBarLayout {
  /** Desired maximum width of each bar in CSS pixels; clamped to its x slot. */
  width?: number;
  /** Space between bars within a grouped x slot, in CSS pixels. */
  gap?: number;
  /** Space between segments of a stack, in CSS pixels. Defaults to 0. */
  segmentGap?: number;
}

export interface ChartSeriesField<T> {
  /** Shown beside the value in inspection, e.g. "High". */
  label: string;
  accessor: (row: T) => number | null;
}

export interface ChartSeries<T> {
  id: string;
  label: string;
  unit?: string;
  accessor: (row: T) => number | null;
  /** Explicit source status. The last row is never inferred to be provisional. */
  status?: (row: T) => ChartObservationStatus;
  /**
   * Companion values in the series' own unit, keyed by a stable ID: a candle's open, high and
   * low, a range's ends, or quartiles. `accessor` stays the headline value. Fields fit the y
   * range, appear in inspection, and range marks such as `IntervalBand` read them by ID. Lilt
   * never infers them.
   */
  fields?: Readonly<Record<string, ChartSeriesField<T>>>;
  color?: string;
  /**
   * Color of one observation's discrete mark (a bar, candle, range mark, or point), such as a
   * down day in red. Return `undefined` to keep the series color. Lines and areas stay one color.
   */
  colorAt?: (row: T) => string | undefined;
  line?: ChartLineStyle;
  area?: ChartAreaStyle;
  bar?: ChartBarStyle;
  formatValue?: (value: number) => string;
  curve?: ChartCurve;
  /**
   * `secondary` fits this series to its own value scale, for a different unit such as a rate
   * over revenue bars. The scale shares the primary gridlines; `YAxis scale="secondary"` labels
   * it. Stacked series always share the primary scale.
   */
  scale?: 'primary' | 'secondary';
}

export interface TimeXConfig<T> {
  type: 'time';
  accessor: (row: T) => Date | number;
  format?: (value: number) => string;
}

export interface NumericXConfig<T> {
  type: 'number';
  accessor: (row: T) => number;
  format?: (value: number) => string;
}

export interface CategoryXConfig<T> {
  type: 'category';
  /**
   * Each row's identity: stable and unique, such as a bucket index or an ISO date. Input order
   * sets its position. Two rows with one identity stop the chart with "duplicate ID", so a label
   * that repeats (four buckets on "Oct 3") belongs in `format`, not here.
   */
  accessor: (row: T) => string;
  /** The label for an identity on the axis and in readouts. Labels may repeat. */
  format?: (id: string) => string;
}

export type ChartXConfig<T> = TimeXConfig<T> | NumericXConfig<T> | CategoryXConfig<T>;

export interface ChartYConfig {
  /**
   * `log` spaces values by ratio, so a doubling looks the same anywhere, as for prices over
   * years. Every plotted value must be positive; bars, stacks and secondary scales need
   * `linear` (the default).
   */
  scale?: 'linear' | 'log';
  /** Ignored on a log scale, which cannot reach zero. */
  includeZero?: boolean;
  domain?: readonly [number, number];
  /** Values the fitted domain must contain, such as a target line. Ignored with `domain`. */
  include?: readonly number[];
  format?: (value: number) => string;
  /** Labels of the secondary scale. Defaults to the first secondary series' `formatValue`. */
  secondaryFormat?: (value: number) => string;
  ticks?: number;
}

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ChartCommonProps<T> {
  data: readonly T[];
  /** Suppress inspection and selection feedback while retaining external selection ownership. */
  interactive?: boolean;
  y?: ChartYConfig;
  series: readonly ChartSeries<T>[];
  className?: string;
  style?: CSSProperties | ChartStyle;
  'aria-label': string;
  children?: ReactNode;
  status?: ChartStatus;
  /** How the skeleton moves while `status` is loading. Defaults to `shimmer`. */
  loadingStyle?: ChartLoadingStyle;
  /** What the plot shows when there is no data: `dots` (default), `shape`, an element, or `null`. */
  empty?: ChartEmptyState;
  error?: string;
  renderRetry?: () => ReactNode;
  motion?: ChartMotion;
  /** Play the first-data entrance (also after resetKey). Defaults to true; updates remain animated. */
  animateIn?: boolean;
  resetKey?: string | number;
  onSelectionChange?: (selection: ChartSelection<T> | null) => void;
  /** Controlled series visibility. Omit to show every descriptor. */
  visibleSeries?: readonly string[];
  onVisibleSeriesChange?: (series: readonly string[]) => void;
}

export type ChartProps<T> = ChartCommonProps<T> &
  (
    | {
        x: TimeXConfig<T> | NumericXConfig<T>;
        /** Share inspection and range state across charts. */
        controller?: ChartController;
        linkedSelection?: 'exact' | { nearestWithin: number };
        compare?: boolean | ChartCompareConfig;
        focus?: boolean | ChartFocusConfig;
        live?: boolean | ChartLiveConfig;
        brush?: boolean;
        selectedCategoryId?: never;
        onSelectedCategoryIdChange?: never;
      }
    | {
        x: CategoryXConfig<T>;
        /** Controlled pinned category; hover and keyboard focus stay local. */
        selectedCategoryId?: string | null;
        onSelectedCategoryIdChange?: (id: string | null) => void;
        controller?: never;
        linkedSelection?: never;
        compare?: never;
        focus?: never;
        live?: never;
        brush?: never;
      }
  );

/**
 * Axis presets.
 * - `classic`: y labels in a left gutter, x labels under the plot.
 * - `inline`: y labels sit on their grid lines inside the plot, so the plot runs full width.
 * - `ruler`: inline y labels plus a crisp tick under every observation; the active tick grows.
 * - `minimal`: no y labels or grid; the x axis labels only its ends.
 * - `dots`: minimal plus a dot under every observation that swells under the pointer.
 * - `segmented`: rounded segments between ticks instead of one line, with labels in the gaps;
 *   the segment under the pointer lights up. Pair it with `gradient` to read an axis as a range.
 */
export type ChartAxisStyle = 'classic' | 'inline' | 'ruler' | 'minimal' | 'dots' | 'segmented';
/** One axis's preset, with a color scale for `segmented`. */
export interface ChartAxisSide {
  style: ChartAxisStyle;
  /**
   * Color a segmented axis along its scale, low values first: `true` fades the first series'
   * color from faint to full, or pass colors, e.g. `['var(--lilt-positive)',
   * 'var(--lilt-negative)']` for a good-to-bad range.
   */
  gradient?: boolean | readonly string[];
}
/**
 * A preset for both axes, or one per axis, e.g. `{ x: 'minimal', y: 'segmented' }`. An axis left
 * out uses `minimal`.
 */
export type ChartAxis =
  | ChartAxisStyle
  | { x?: ChartAxisStyle | ChartAxisSide; y?: ChartAxisStyle | ChartAxisSide };
/**
 * How hover pills and tooltips look: quiet surface glass `soft` (default), inverted `solid`, or
 * `accent`, which takes the color of the series under the pointer.
 */
export type ChartHoverStyle = 'soft' | 'solid' | 'accent';
/**
 * What a card shows for the hovered point. `pills` (default) puts the date and value on the
 * axes; `tooltip` gathers every series in one floating panel; `strip` docks the same reading in
 * a one-line capsule above the plot, so it never covers the marks; `headline` keeps the plot
 * clear and reads out through the headline and tiles alone.
 */
export type ChartHoverReadout = 'pills' | 'tooltip' | 'strip' | 'headline';
/** The series marker on each tooltip row: a rounded `square` (default), a `dot`, or a `line`. */
export type ChartTooltipIndicator = 'square' | 'dot' | 'line';
/**
 * Series color sets, each validated for color-vision deficiency in light and dark mode. `iris`
 * is the default.
 */
export type ChartPalette = 'iris' | 'cobalt' | 'emerald';
/** Texture behind the plot marks, faded toward the plot edges. */
export type ChartBackground = 'dots' | 'grid' | 'lines' | 'none';
/** Card treatments: raised `elevated` (default), border-only `outline`, or `ghost` for use inside your own card. */
export type ChartSurface = 'elevated' | 'outline' | 'ghost';

interface ChartPlotCommonProps {
  children?: ReactNode;
  /** Axis presentation for both axes, or one per axis. Defaults to `minimal`. */
  axis?: ChartAxis;
  /** Hover pill treatment, or `false` to inspect without pills. Defaults to `soft`. */
  pill?: ChartHoverStyle | false;
  /**
   * Which series the y pill follows. `nearest` (default) follows the line closest to the pointer;
   * a series ID locks it; `total` follows the top of a stack.
   */
  pillSeries?: 'nearest' | 'total' | (string & {});
  /** In stacks, show the series' own value (`series`, default) or the stacked height at its edge (`stack`). */
  pillValue?: 'series' | 'stack';
  /**
   * Where the value pill sits: `axis` on the y axis, `mark` centered above the hovered bar or
   * point. `auto` (default) uses `mark` when the axis shows no y labels.
   */
  pillPosition?: 'auto' | 'axis' | 'mark';
  /** Texture behind the marks. Defaults to `none` here; cards default to `dots`. */
  background?: ChartBackground;
  /**
   * Light up what is inspected: the background texture around a point, and on bar and column
   * charts a band behind the whole column. Defaults to true.
   */
  spotlight?: boolean;
  /**
   * Padding in pixels between the plot's left and right edges and its axis labels, ruler ends,
   * and hover pills. Observations move inward by the same amount so labels center on them.
   * Defaults to 0.
   */
  axisInset?: number;
  /**
   * With an `axisInset`, continue lines and areas from the first and last observations to the
   * plot edges, fading out. Decorative only: it carries no values and is not inspectable.
   */
  runoff?: boolean;
  /**
   * How far the first and last x labels may extend past the plot edges so they stay centered on
   * their observations, as in a chart surrounded by padding. Defaults to 0.
   */
  labelOverhang?: number;
  /**
   * Give every observation a bar-width slot, as bars and column marks do, so a line pane lines
   * up with a bar or candle pane synced beside it. Ignores `axisInset`.
   */
  slots?: boolean;
  /**
   * When a line or area has more observations than the plot has pixels, draw only each pixel
   * column's first, last, lowest and highest. The ink is the same and stays fast; hover, values
   * and exports still read every observation. Defaults to true.
   */
  decimate?: boolean;
  /** Use 'fill' to size the plot from its flex container; otherwise use a pixel height. */
  height?: number | 'fill';
  compactHeight?: number;
  margins?: Partial<ChartMargins>;
  /** Axis-free inspection presentation for compact charts. */
  compact?: boolean;
  className?: string;
  style?: CSSProperties | ChartStyle;
  /** Inspection panel settings. Use this when plot children are produced by a component. */
  tooltip?: TooltipProps | ReactElement | false;
  /** Series used for the inspection-axis badge. */
  inspectionSeries?: string;
}

/** Bars for a plot. Series left out draw as lines over the bars, e.g. a target or a rate. */
export interface ChartBars<Id extends string = string> extends ChartBarLayout {
  /**
   * Series drawn as bars. Defaults to every series, or to the stacked series when the plot also
   * stacks; stacked bars always draw exactly the stack.
   */
  series?: readonly Id[];
}

/**
 * How stacked series combine. `sum` adds values, positives above zero and negatives below;
 * `percent` shows each series' share of its period and requires non-negative values.
 */
export type ChartStackMode = 'sum' | 'percent';

export interface ChartStack<Id extends string = string> {
  /**
   * Series that stack, bottom to top in chart series order. Defaults to every series. The rest
   * draw unstacked over the stack on the same scale, or on their own with `scale: 'secondary'`.
   */
  series?: readonly Id[];
  /** Defaults to `sum`. */
  mode?: ChartStackMode;
}

export interface ChartPlotProps extends ChartPlotCommonProps {
  /** Draw series as bars: `true` for every series, or choose series and spacing. */
  bars?: true | ChartBars;
  /** Stack series: `true` or `'sum'` adds every series, `'percent'` shows shares. */
  stack?: true | ChartStackMode | ChartStack;
}

export interface BarProps {
  series: string;
  className?: string;
}

export type RankingOrder = 'descending' | 'ascending' | 'input';

export interface CategorySelection<T> {
  id: string;
  row: T;
  value: number | null;
  pinned: boolean;
}

export interface ChartToolbarProps {
  actions?: ReactNode;
  className?: string;
}

export interface ChartReadoutProps {
  /** Optional normal-flow text summary; keyboard input remains in the plot. */
  className?: string;
}

export interface ChartBrushProps {
  className?: string;
}

export interface ChartOverviewProps {
  className?: string;
}

export interface LineProps {
  series: string;
  className?: string;
}

export interface AreaProps {
  series: string;
  className?: string;
}

/** Range marks name the series they draw and the IDs of the fields they read. */
export interface IntervalBandProps {
  series: string;
  /** Field ID of the band's lower edge. */
  lower: string;
  /** Field ID of the band's upper edge. */
  upper: string;
  className?: string;
}

export interface RangeBarProps {
  series: string;
  /** Field ID of each bar's low end. */
  low: string;
  /** Field ID of each bar's high end. */
  high: string;
  /** Draws each bar as a solid block receding up and to the right; the front keeps low and high. */
  depth?: boolean;
  className?: string;
}

export interface ErrorBarProps {
  series: string;
  /** Field ID of each whisker's low end. */
  low: string;
  /** Field ID of each whisker's high end. */
  high: string;
  /** Draw the series value as a dot between the whiskers. Defaults to true. */
  point?: boolean;
  className?: string;
}

export interface BoxPlotProps {
  series: string;
  /** Field IDs of the box edges; the series value is the median line. */
  q1: string;
  q3: string;
  /** Field IDs of the whisker ends. */
  min: string;
  max: string;
  /** Values beyond the whiskers for a row, drawn as dots. Fit them with `y.include`. */
  outliers?(row: unknown): readonly number[];
  /** Draws each box as a solid block receding up and to the right; the front keeps Q1 and Q3. */
  depth?: boolean;
  className?: string;
}

export interface PrimitiveProps {
  className?: string;
}

export interface XAxisProps extends PrimitiveProps {
  /** Insets only the first and last tick labels; the plotted data stays edge to edge. */
  edgeInset?: number;
  /**
   * `ends` labels only the first and last observation; `fit` labels as many as fit. Minimal and
   * dots axes default to `ends`, which suits lines and areas; bars read better with `fit`.
   */
  labels?: 'ends' | 'fit';
}

export interface GridProps extends PrimitiveProps {
  pattern?: 'lines' | 'dots';
  color?: string;
  opacity?: number;
  lineWidth?: number;
  dotSpacing?: number;
  dotRadius?: number;
}

export interface YAxisProps extends PrimitiveProps {
  showTicks?: boolean;
  /** `secondary` labels series drawn with `scale: 'secondary'` on the right edge. */
  scale?: 'primary' | 'secondary';
}

export interface TooltipProps<Row = unknown, SeriesId extends string = string>
  extends PrimitiveProps {
  /** Optional accessible label for the inspection panel. */
  'aria-label'?: string;
  /** Keep plot inspection without a floating panel. Add ChartReadout separately if wanted. */
  floating?: boolean;
  /** Panel treatment: `soft` (default), `solid`, or `accent`. */
  variant?: ChartHoverStyle;
  /** Series marker on each row: `square` (default), `dot`, or `line`. */
  indicator?: ChartTooltipIndicator;
  /**
   * `float` (default) beside the crosshair, or `strip`: one line docked above the plot, centered
   * on the crosshair. Give the plot about 44px of top margin for the strip to sit in.
   */
  layout?: 'float' | 'strip';
  /**
   * When the chart is narrower than 420px, or another chart drives inspection, show the values
   * in a readout under the plot instead of the floating panel. The chart reserves the readout's
   * room even at rest, so it grows by about 130px and nothing jumps when inspection starts.
   * Defaults to true. Set `false` for a widget with a fixed height: the floating panel then
   * stays inside the plot at every width, turning compact when it would not fit (`density`).
   */
  adaptive?: boolean;
  /**
   * How tightly the floating panel sets its rows. `auto` (default) uses `comfortable` and
   * switches to `compact` when the panel would be taller than the plot: values in two columns,
   * Unpin beside the date, and less padding. Custom content and pin actions follow along.
   */
  density?: 'auto' | 'comfortable' | 'compact';
  /** Icon in the pinned inspection banner. Defaults to Lilt's native pin. */
  pinIcon?: ReactNode;
  /** Replace the default values body with accepted-value JSX; title, placement and pin actions remain. */
  renderContent?: (context: ChartTooltipContext<Row, SeriesId>) => ReactNode;
  /** Opt in to comparison content in this tooltip. Omit to render it elsewhere. */
  renderComparison?: (context: ChartComparisonContext<SeriesId, Row>) => ReactNode;
}

export interface ChartTooltipField {
  id: string;
  label: string;
  value: number | null;
  formattedValue: string;
}

export interface ChartTooltipContext<Row = unknown, SeriesId extends string = string> {
  /** The series the pointer, keyboard, or legend currently points at, when there is one. */
  activeSeriesId?: SeriesId | null;
  row: Row;
  sourceIndex: number;
  x: number;
  formattedX: string;
  pinned: boolean;
  series: readonly {
    id: SeriesId;
    label: string;
    value: number | null;
    formattedValue: string;
    status: ChartObservationStatus;
    /** The series' companion values, in descriptor order; empty when it has none. */
    fields: readonly ChartTooltipField[];
  }[];
}

export interface ChartLegendValue {
  id: string;
  label: string;
  value: number | null;
  formattedValue: string;
  status: ChartObservationStatus;
}

/**
 * How a skeleton moves while data loads: `shimmer` sweeps a highlight over still shapes, `draw`
 * reveals shapes in order and starts again, and `breathe` lets them rise and settle or pulse.
 * Moving skeletons on a page share one clock, so they move in step.
 */
export type ChartLoadingStyle = 'shimmer' | 'draw' | 'breathe';

/**
 * How a chart with nothing to draw looks: `dots` (the default) gathers a quiet dot field around
 * the message, and `shape` lays the chart's own outline behind it at a whisper. Both stay still
 * and always say so, so an empty chart never reads as loading.
 */
export type ChartEmptyLook = 'dots' | 'shape';

/**
 * What a chart shows when the period has no data: a built-in look, your own element (for example
 * `<ChartEmpty>No visits yet</ChartEmpty>`, or any component), or `null` for nothing at all. The
 * chart places it in the plot area; what it says and draws is yours.
 */
export type ChartEmptyState = ChartEmptyLook | ReactElement | null;

/**
 * How a legend lays out its entries: value `cards` (the default), compact `inline` labels, `list`
 * rows with values aligned right, color-tinted `pills`, or `bars` where each value also draws a
 * thin bar against the largest.
 */
export type ChartLegendVariant = 'cards' | 'inline' | 'list' | 'pills' | 'bars';

/** The mark beside each label: a rounded `square` (the default), a `dot`, or a short `line`. */
export type ChartLegendSwatch = 'square' | 'dot' | 'line';

/**
 * A card's legend: value `tiles` (the default), compact `inline` labels, `list` rows, tinted
 * `pills`, or `bars` that also draw each value against the largest.
 */
export type CardLegend = 'tiles' | 'inline' | 'list' | 'pills' | 'bars';

export interface LegendProps extends PrimitiveProps {
  /** Value cards are the default; see `ChartLegendVariant` for the other layouts. */
  variant?: ChartLegendVariant;
  /** The mark beside each label. Defaults to a rounded square. */
  swatch?: ChartLegendSwatch;
  /** Series show one entry per descriptor; observations show one entry per x bucket. */
  by?: 'series' | 'observation';
  /** Value source for observation entries. Defaults to the first visible series. */
  series?: string;
  style?: CSSProperties;
  /** Enable series toggles and hover/focus emphasis. Defaults to true. */
  interactive?: boolean;
  /** Show the isolate action; activating an isolated series restores the prior selection. Defaults to true. */
  allowIsolate?: boolean;
  /** Override the accepted hover/pin value slot. */
  renderValue?: (entry: ChartLegendValue) => ReactNode;
  renderLabel?: (entry: ChartLegendValue) => ReactNode;
  renderSwatch?: (entry: ChartLegendValue & { color: string }) => ReactNode;
  /** Consumer-owned comparison presentation for each series card. */
  renderDifference?: (difference: ChartComparisonSeries, entry: ChartLegendValue) => ReactNode;
  /** Replace one item's content; the outer item keeps linked hover/focus behaviour. */
  renderItem?: (
    entry: ChartLegendValue & { color: string },
    actions: {
      toggle: () => void;
      focus: () => void;
      isolate: () => void;
      comparison: ChartComparisonSeries | null;
    },
  ) => ReactNode;
}

export type ChartPercentagePolicy = 'positive-baseline' | 'signed' | 'absolute-baseline' | 'none';

export interface ChartCompareConfig {
  /** Lead series for the focus overview. Results always include every visible series. */
  series?: string;
  percentage?: ChartPercentagePolicy;
  /** Accepted values for all visible series, including range previews. No UI is inserted. */
  onChange?: (comparison: ChartComparisonResult | null) => void;
}

export interface ChartFocusConfig {
  overview?: boolean;
  onChange?: (range: ChartRange | null) => void;
}

export interface ChartLiveConfig {
  label?: string;
  returnLabel?: string;
  onFollowingChange?: (following: boolean) => void;
}

export interface ChartRange {
  readonly startX: number;
  readonly endX: number;
}

export interface ChartComparison extends ChartRange {
  series: string;
  startValue: number | null;
  endValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  elapsed: number;
  unavailableReason?: string;
}

export interface ChartComparisonSeries<Id extends string = string>
  extends Omit<ChartComparison, 'series'> {
  id: Id;
  label: string;
  color: string;
  dasharray?: string;
  formattedStartValue: string;
  formattedEndValue: string;
  formattedChange: string;
  formattedPercentage: string | null;
}

/** Presentation-independent endpoint changes, never interval sums or interpolated values. */
export interface ChartComparisonResult<Id extends string = string, Row = unknown>
  extends ChartRange {
  kind: 'range';
  startRow: Row | null;
  endRow: Row | null;
  startSourceIndex: number | null;
  endSourceIndex: number | null;
  percentagePolicy: ChartPercentagePolicy;
  formattedStartX: string;
  formattedEndX: string;
  elapsed: number;
  phase: 'preview' | 'complete';
  focused: boolean;
  series: readonly ChartComparisonSeries<Id>[];
}

/** Available through useChartComparison and an explicitly supplied tooltip renderer. */
export interface ChartComparisonContext<Id extends string = string, Row = unknown>
  extends ChartComparisonResult<Id, Row> {
  motion: ChartMotion;
  clear: () => void;
  focus?: () => void;
  fullRange?: () => void;
}

export interface ChartControllerInspection {
  readonly x: number;
  readonly pinned: boolean;
  readonly ownerId: string;
  /** A pin for this chart only: linked charts neither follow it nor release it. */
  readonly local?: boolean;
  /** For a pin that arrived from a linked chart, that chart's name, e.g. "Revenue". */
  readonly from?: string;
}

/** How a pin applies to linked charts. */
export interface ChartPinOptions {
  /** Pin this chart only, as Alt-click does. Defaults to false: linked charts pin too. */
  local?: boolean;
}

export interface ChartControllerSnapshot {
  readonly inspection: ChartControllerInspection | null;
  readonly comparison: (ChartRange & { readonly series?: string }) | null;
  readonly focus: ChartRange | null;
}

export interface ChartController {
  getSnapshot: () => ChartControllerSnapshot;
  subscribe: (listener: () => void) => () => void;
  inspect: (inspection: ChartControllerInspection) => void;
  clearInspection: (ownerId?: string) => void;
  /** Detach an unmounted input owner; retained pins and ranges survive expansion. */
  releaseOwner: (ownerId: string) => void;
  setComparison: (comparison: (ChartRange & { series?: string }) | null) => void;
  setFocus: (range: ChartRange | null) => void;
}

export interface ChartAnnotation {
  id: string;
  x: number | Date;
  label: string;
  description?: string;
  color?: string;
}

export interface AnnotationsProps extends PrimitiveProps {
  items: readonly ChartAnnotation[];
  onSelectionChange?: (annotation: ChartAnnotation | null) => void;
}

export interface ReferenceBandProps extends PrimitiveProps {
  /**
   * The band's ends: x values by default, or y values with `axis="y"`. Pass `-Infinity` or
   * `Infinity` for an open end that runs to the plot's edge.
   */
  from: number | Date;
  to: number | Date;
  /** Shown inside the band. Optional for y bands, such as an RSI 30–70 range. */
  label?: string;
  color?: string;
  /** `x` (default) spans a range of observations; `y` spans a range of values. */
  axis?: 'x' | 'y';
}

export interface ReferenceLineProps extends PrimitiveProps {
  /** The y value, in the primary scale's unit. */
  value: number;
  /** Text at the line's right end, e.g. "Target $4,000". */
  label?: string;
  color?: string;
}

export interface ChangeComparisonProps<T> extends PrimitiveProps {
  data: readonly T[];
  label: string;
  series?: string;
}

export interface ChartSelection<T> {
  row: T;
  sourceIndex: number;
  x: number;
  categoryId?: string;
  pinned: boolean;
  /** Pinned for this chart only. */
  local?: boolean;
}

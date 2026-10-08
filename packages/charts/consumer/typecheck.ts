import {
  SunburstTerracesCard,
  ClusterConstellationCard,
  TernaryPrismCard,
  WindRoseCard,
  MarimekkoBlocksCard,
  IntersectionTowersCard,
  HorizonFoldsCard,
  CircleArchipelagoCard,
  HelixRibbonsCard,
  VoxelCloudCard,
} from '@lilt-ui/charts';
import {
  ChordLoomCard,
  RankRibbonsCard,
  EventHelixCard,
  ContourIslandsCard,
  ParallelRibbonsCard,
  ArcBridgesCard,
  ChartComponentsProvider,
  TreemapChartCard,
  CalendarHeatmapCard,
  TimelineChartCard,
  StripChartCard,
  AreaChartCard,
  BarChartCard,
  createChartController,
  useChartComparison,
  ComparisonDetails,
  createCartesianChartModel,
  Chart,
  Line,
  Tooltip,
  RangeBar,
  ErrorBar,
  IntervalBand,
  RangeChartCard,
  BoxPlotCard,
  summarizeBox,
  RadialChartCard,
  ProgressCard,
  FunnelChartCard,
  HorizontalBarChartCard,
  StatCard,
  LineChartCard,
  ScatterChartCard,
  HeatmapChartCard,
  SankeyChartCard,
  SlopeChartCard,
} from '@lilt-ui/charts';
import type {
  ChartRangeSelectProps,
  ChartBarLayout,
  ChartCompareConfig,
  ChartComparisonContext,
  ChartFocusConfig,
  ChartPlotProps,
  ChartProps,
  ChartSeries,
  ChartStyle,
} from '@lilt-ui/charts';
import { summarizeRange, toChartCsv } from '@lilt-ui/charts/data';
import {
  Candles,
  CandlestickChartCard,
  DepthChartCard,
  IndicatorChartCard,
  OrderBook,
  PortfolioChartCard,
  PriceChartCard,
  depthLevels,
  macd,
  rsi,
  sma,
} from '@lilt-ui/charts/finance';
import type { DepthSummary } from '@lilt-ui/charts/finance';

interface ConsumerRow {
  revenue: number;
}

function builtModelContract() {
  const model = createCartesianChartModel({
    data: [{ date: 1, revenue: 8, account: 'A-1' }],
    x: { type: 'number', accessor: (row) => row.date },
    series: [{ id: 'revenue', label: 'Revenue', accessor: (row) => row.revenue }],
  });
  Chart({ model, 'aria-label': 'Revenue' });
  Line({ model, series: 'revenue' });
  Tooltip({ model, renderContent: ({ row }) => row.account });
  // @ts-expect-error Literal series references must match the built model declaration.
  Line({ model, series: 'reveneu' });
  // @ts-expect-error The tooltip preserves the original row type.
  Tooltip({ model, renderContent: ({ row }) => row.missing });
}
void builtModelContract;

const valid: ChartSeries<ConsumerRow> = {
  id: 'revenue',
  label: 'Revenue',
  accessor: (row) => row.revenue,
  color: '#168267',
  line: {
    width: 2,
    dasharray: '4 3',
    pointRadius: 3,
    pointStrokeWidth: 1,
    showInspectionPoint: false,
  },
  area: { opacity: 0.4 },
  bar: { radius: 0, stroke: '#0f513e', strokeWidth: 1, fillOpacity: 0.9 },
};

void valid;

const invalidReturn: ChartSeries<ConsumerRow> = {
  id: 'bad',
  label: 'Bad',
  // @ts-expect-error Consumer accessors must return number | null, not string.
  accessor: (row) => row.revenue.toFixed(2),
};

void invalidReturn;

const layout = { width: 18, gap: 4, segmentGap: 2 } satisfies ChartBarLayout;
const appearance = {
  '--lilt-series-1': '#168267',
  '--lilt-tooltip-radius': '8px',
  '--lilt-grid-dot-opacity': 0.12,
  color: '#37352f',
} satisfies ChartStyle;

void layout;
void appearance;

const invalidLine = {
  // @ts-expect-error A line width is numeric geometry, not a CSS length string.
  width: '2px',
} satisfies NonNullable<ChartSeries<ConsumerRow>['line']>;
void invalidLine;

const controller = createChartController();
controller.inspect({ x: 1, pinned: true, ownerId: 'consumer-chart' });
controller.setComparison({ startX: 1, endX: 2, series: 'revenue' });
controller.setFocus({ startX: 1, endX: 2 });

const compare = {
  series: 'revenue',
  percentage: 'positive-baseline',
  onChange: (result) => {
    const values: readonly (number | null)[] =
      result?.series.map((series) => series.absoluteChange) ?? [];
    void values;
  },
} satisfies ChartCompareConfig;
const comparisonHook: () => ChartComparisonContext | null = useChartComparison;
void comparisonHook;
void ComparisonDetails;
const focus = { overview: true } satisfies ChartFocusConfig;

void compare;
void focus;

const xNumber = { type: 'number' as const, accessor: (_row: ConsumerRow) => 1 };
const xCategory = { type: 'category' as const, accessor: (_row: ConsumerRow) => 'one' };
const common = { data: [{ revenue: 1 }], series: [valid], 'aria-label': 'Revenue' };
const numericChart = { ...common, x: xNumber, brush: true } satisfies ChartProps<ConsumerRow>;
const categoryChart = { ...common, x: xCategory } satisfies ChartProps<ConsumerRow>;
const selectedCategory = {
  ...common,
  x: xCategory,
  selectedCategoryId: 'one',
} satisfies ChartProps<ConsumerRow>;
void numericChart;
void categoryChart;
void selectedCategory;
// @ts-expect-error Category coordinates have no range brush.
const categoryBrush = { ...common, x: xCategory, brush: true } satisfies ChartProps<ConsumerRow>;
void categoryBrush;
const categoryController = {
  ...common,
  x: xCategory,
  controller,
};
// @ts-expect-error Category coordinates cannot join continuous controller ranges.
const invalidCategoryController: ChartProps<ConsumerRow> = categoryController;
void categoryController;
void invalidCategoryController;
const numericCategoryPin = {
  ...common,
  x: xNumber,
  selectedCategoryId: 'one',
};
// @ts-expect-error Category selection IDs do not apply to numeric coordinates.
const invalidNumericCategoryPin: ChartProps<ConsumerRow> = numericCategoryPin;
void numericCategoryPin;
void invalidNumericCategoryPin;
const barsPlot = { bars: { width: 12 } } satisfies ChartPlotProps;
const stackPlot = { stack: 'percent' } satisfies ChartPlotProps;
// Stacked bars with a target line drawn over the stack on the same scale.
const overlayPlot = {
  bars: { segmentGap: 2 },
  stack: { series: ['organic', 'paid'], mode: 'sum' },
} satisfies ChartPlotProps;
void barsPlot;
void stackPlot;
void overlayPlot;
// @ts-expect-error The old flattened layout is gone; use `bars` and `stack`.
const legacyLayout = { layout: 'stacked-bars' } satisfies ChartPlotProps;
void legacyLayout;
// @ts-expect-error Sum stacks already split positives and negatives.
const divergingStack = { stack: 'diverging' } satisfies ChartPlotProps;
void divergingStack;

void summarizeRange;
void toChartCsv;
// @ts-expect-error Controller snapshots cannot be assigned to directly.
controller.getSnapshot().focus = { startX: 1, endX: 2 };

// Key-typed card props survive the published declarations.
const cardRows = [{ month: 'Jan', organic: 1, label: 'x' }];
export const cardProbe = () =>
  AreaChartCard({ title: 'V', data: cardRows, x: 'month', series: [{ key: 'organic' }] });
export const cardTypoProbe = () =>
  // @ts-expect-error Unknown series keys are rejected by the built types.
  AreaChartCard({ title: 'V', data: cardRows, x: 'month', series: [{ key: 'organc' }] });

function stackContract() {
  const data = [{ month: 'Jan', organic: 30, paid: 10 as number | null, target: 45 }];
  BarChartCard({
    title: 'Mix',
    data,
    x: 'month',
    series: [{ key: 'organic' }, { key: 'paid' }, { key: 'target', dashed: true }],
    stack: true,
    corners: 'all',
    barStyle: 'isometric',
    tracks: true,
  });
  AreaChartCard({ title: 'Mix', data, x: 'month', series: [{ key: 'organic' }], stack: 'percent' });
  // @ts-expect-error Stacking is `true` or `'percent'`; sums are the default meaning of `true`.
  BarChartCard({ title: 'Mix', data, x: 'month', series: [{ key: 'paid' }], stack: 'absolute' });
  // @ts-expect-error Arrangement is `stack`, not a variant.
  AreaChartCard({ title: 'Mix', data, x: 'month', series: [{ key: 'paid' }], variant: 'stacked' });
  // @ts-expect-error A text field cannot be a stacked series.
  BarChartCard({ title: 'Mix', data, x: 'month', series: [{ key: 'month' }], stack: 'percent' });
}
void stackContract;

// Finance cards and helpers ship from their own entry point, with key-typed props intact.
const ohlc = [{ day: new Date(0), o: 1, h: 2, l: 0.5, c: 1.5, v: 10, name: 'x' }];
function financeContract() {
  CandlestickChartCard({
    title: 'P',
    data: ohlc,
    x: 'day',
    open: 'o',
    high: 'h',
    low: 'l',
    close: 'c',
    volume: 'v',
  });
  CandlestickChartCard({
    title: 'P',
    data: ohlc,
    x: 'day',
    open: 'o',
    high: 'h',
    low: 'l',
    // @ts-expect-error A text field cannot be a candle's close.
    close: 'name',
  });
  IndicatorChartCard({
    title: 'P',
    data: ohlc,
    x: 'day',
    close: 'c',
    overlays: ['sma', { kind: 'ema', period: 9 }],
    panes: ['rsi'],
  });
  // @ts-expect-error Unknown panes are rejected.
  IndicatorChartCard({ title: 'P', data: ohlc, x: 'day', close: 'c', panes: ['stochastic'] });
  PriceChartCard({ title: 'P', data: ohlc, x: 'day', price: 'c', versus: [{ key: 'o' }] });
  PortfolioChartCard({ title: 'P', data: ohlc, x: 'day', value: 'c', basis: 'o' });
  DepthChartCard({ title: 'B', bids: [{ price: 1, size: 2 }], asks: [{ price: 2, size: 1 }] });
  OrderBook({ title: 'B', bids: [], asks: [], levels: 5 });
  Candles({ series: 'price', open: 'open', high: 'high', low: 'low', display: 'hollow' });
  const closes: number[] = [1, 2, 3];
  const averages: (number | null)[] = sma(closes, 2);
  const oscillator: (number | null)[] = rsi(closes);
  const { histogram } = macd(closes, 2, 3, 2);
  const book: DepthSummary = depthLevels([{ price: 1, size: 1 }], [{ price: 2, size: 1 }]);
  return [averages, oscillator, histogram, book];
}
void financeContract;

// Series carry named companion fields and per-observation colors; range marks read the fields.
const ranged: ChartSeries<{ v: number; lo: number; hi: number }> = {
  id: 'v',
  label: 'V',
  accessor: (row) => row.v,
  fields: {
    lo: { label: 'Low', accessor: (row) => row.lo },
    hi: { label: 'High', accessor: (row) => row.hi },
  },
  colorAt: (row) => (row.v > 1 ? 'green' : undefined),
};
void ranged;
export const rangeProbe = () => [
  RangeBar({ series: 'v', low: 'lo', high: 'hi' }),
  ErrorBar({ series: 'v', low: 'lo', high: 'hi' }),
  IntervalBand({ series: 'v', lower: 'lo', upper: 'hi' }),
  RangeChartCard({ title: 'R', data: [{ m: 'Jan', lo: 1, hi: 2 }], x: 'm', low: 'lo', high: 'hi' }),
  BoxPlotCard({ title: 'B', data: [{ g: 'A', s: [1, 2, 3] }], x: 'g', samples: 's' }),
  summarizeBox([1, 2, 3]),
];
export const intervalProbe: ChartSeries<{ v: number }> = {
  id: 'v',
  label: 'V',
  accessor: (row) => row.v,
  // @ts-expect-error `interval` was replaced by `fields`.
  interval: {},
};

// One `depth` prop across every family that can carry it; bars keep `barStyle` for the look.
const channels = [{ channel: 'Direct', revenue: 10 }];
export const depthProbe = () => [
  RadialChartCard({
    title: 'R',
    data: channels,
    category: 'channel',
    value: 'revenue',
    depth: true,
  }),
  ProgressCard({ title: 'P', value: 1, target: 2, depth: true }),
  FunnelChartCard({
    title: 'F',
    data: channels,
    category: 'channel',
    value: 'revenue',
    depth: true,
  }),
  HorizontalBarChartCard({
    title: 'H',
    data: channels,
    category: 'channel',
    value: 'revenue',
    barStyle: 'isometric',
  }),
  StatCard({
    title: 'S',
    data: channels,
    value: 'revenue',
    chart: 'meter',
    target: 20,
    depth: true,
  }),
  BarChartCard({
    title: 'B',
    data: channels,
    x: 'channel',
    series: [{ key: 'revenue' }],
    depth: true,
  }),
  RangeChartCard({
    title: 'R',
    data: [{ m: 'Jan', lo: 1, hi: 2 }],
    x: 'm',
    low: 'lo',
    high: 'hi',
    depth: true,
  }),
  BoxPlotCard({ title: 'B', data: [{ g: 'A', s: [1, 2, 3] }], x: 'g', samples: 's', depth: true }),
  RangeBar({ series: 'v', low: 'lo', high: 'hi', depth: true }),
  Candles({ series: 'c', open: 'o', high: 'h', low: 'l', depth: true }),
  CandlestickChartCard({
    title: 'P',
    data: ohlc,
    x: 'day',
    open: 'o',
    high: 'h',
    low: 'l',
    close: 'c',
    depth: true,
  }),
  LineChartCard({
    title: 'L',
    data: channels,
    x: 'channel',
    series: [{ key: 'revenue' }],
    depth: true,
  }),
  ScatterChartCard({ title: 'S', data: channels, x: 'revenue', y: 'revenue', depth: true }),
  HeatmapChartCard({
    title: 'H',
    data: channels,
    x: 'channel',
    y: 'channel',
    value: 'revenue',
    depth: true,
  }),
  SankeyChartCard({
    title: 'S',
    data: [{ a: 'x', b: 'y', v: 1 }],
    source: 'a',
    target: 'b',
    value: 'v',
    depth: true,
  }),
  SlopeChartCard({
    title: 'S',
    data: [{ r: 'x', a: 1, b: 2 }],
    category: 'r',
    from: 'a',
    to: 'b',
    depth: true,
  }),
  OrderBook({ title: 'B', bids: [], asks: [], levels: 5, depth: true }),
  DepthChartCard({ title: 'D', bids: [], asks: [], depth: true }),
  // @ts-expect-error Depth is a switch, not an amount.
  RadialChartCard({ title: 'R', data: channels, category: 'channel', value: 'revenue', depth: 10 }),
];

// Legends: five layouts and three marks, with value tiles staying the default.
export const legendProbe = () => [
  LineChartCard({
    title: 'L',
    data: channels,
    x: 'channel',
    series: [{ key: 'revenue' }],
    legend: 'pills',
    legendSwatch: 'line',
  }),
  RadialChartCard({
    title: 'R',
    data: channels,
    category: 'channel',
    value: 'revenue',
    legend: 'bars',
  }),
  FunnelChartCard({
    title: 'F',
    data: channels,
    category: 'channel',
    value: 'revenue',
    legend: 'list',
  }),
  ScatterChartCard({ title: 'S', data: channels, x: 'revenue', y: 'revenue', legend: 'inline' }),
  LineChartCard({
    title: 'L',
    data: channels,
    x: 'channel',
    series: [{ key: 'revenue' }],
    // @ts-expect-error Legends come in five layouts; `grid` is not one of them.
    legend: 'grid',
  }),
];

// Embedded cards omit visible titles without losing their accessible name or typed fields.
export const embeddedCardProbe = () => [
  RadialChartCard({
    data: channels,
    category: 'channel',
    value: 'revenue',
    header: false,
    legend: false,
    'aria-label': 'Channels',
    surface: 'ghost',
    selected: null,
    onSelectedChange: () => {},
  }),
  LineChartCard({
    data: channels,
    x: 'channel',
    series: [{ key: 'revenue' }],
    header: false,
    legend: false,
    'aria-label': 'Revenue',
  }),
  FunnelChartCard({
    data: channels,
    category: 'channel',
    value: 'revenue',
    header: false,
    legend: false,
  }),
  ScatterChartCard({ data: channels, x: 'revenue', y: 'revenue', header: false, legend: false }),
  PriceChartCard({ data: channels, x: 'channel', price: 'revenue', header: false, legend: false }),
  DepthChartCard({ bids: [], asks: [], header: false, 'aria-label': 'Depth' }),
  OrderBook({ bids: [], asks: [], header: false, 'aria-label': 'Orders' }),
];

const observationRows = [
  {
    name: 'A',
    category: 'Team',
    value: 12 as number | null,
    date: new Date('2024-01-01'),
    start: 0 as number | null,
    end: 100,
    valid: true,
  },
];
export const observationCardsProbe = () => [
  TreemapChartCard({
    data: observationRows,
    label: 'name',
    value: 'value',
    group: 'category',
    depth: true,
    loadingStyle: 'breathe',
    header: false,
  }),
  CalendarHeatmapCard({
    data: observationRows,
    date: 'date',
    value: 'value',
    depth: true,
    weekStartsOn: 0,
    loadingStyle: 'draw',
  }),
  TimelineChartCard({
    data: observationRows,
    label: 'name',
    start: 'start',
    end: 'end',
    depth: true,
    onSelectionChange: (selection) => {
      const row: (typeof observationRows)[number] | null | undefined = selection?.row;
      void row;
    },
  }),
  StripChartCard({
    data: observationRows,
    category: 'category',
    label: 'name',
    value: 'value',
    display: 'beeswarm',
    depth: true,
  }),
  // @ts-expect-error Areas must refer to numeric fields.
  TreemapChartCard({ data: observationRows, label: 'name', value: 'category' }),
  // @ts-expect-error Calendar values must refer to numeric fields.
  CalendarHeatmapCard({ data: observationRows, date: 'date', value: 'name' }),
  // @ts-expect-error Boolean fields are not time endpoints.
  TimelineChartCard({ data: observationRows, label: 'name', start: 'valid', end: 'end' }),
  // @ts-expect-error Category fields must hold text.
  StripChartCard({ data: observationRows, category: 'value', value: 'value' }),
];

// An app's own period select plugs into every card through the provider.
const appRangeSelect = (props: ChartRangeSelectProps) => {
  const label: string = props['aria-label'];
  const next: string | undefined = props.options.find((option) => option.id !== props.value)?.id;
  if (next) props.onValueChange(next);
  return label;
};
void ChartComponentsProvider({ rangeSelect: () => null, children: null });
void appRangeSelect;

const sculptedRows = [
  {
    name: 'A',
    target: 'B',
    date: '2026-09-28T06:00:00Z',
    period: 'Jan',
    score: 20 as number | null,
    cost: 10,
    enabled: true,
  },
];
export const sculptedCardsProbe = () => [
  ChordLoomCard({
    data: sculptedRows,
    source: 'name',
    target: 'target',
    value: 'score',
    tilt: 0.6,
  }),
  ArcBridgesCard({
    data: sculptedRows,
    source: 'name',
    target: 'target',
    value: 'score',
    rise: 0.7,
  }),
  RankRibbonsCard({
    data: sculptedRows,
    series: 'name',
    period: 'period',
    value: 'score',
    order: 'ascending',
  }),
  EventHelixCard({
    data: sculptedRows,
    label: 'name',
    date: 'date',
    value: 'score',
    cycle: 'week',
  }),
  ContourIslandsCard({ data: sculptedRows, label: 'name', x: 'score', y: 'cost', weight: 'score' }),
  ParallelRibbonsCard({
    data: sculptedRows,
    label: 'name',
    metrics: ['score', 'cost'],
    domains: { score: [0, 100] },
    onSelectionChange: (selection) => {
      const row: (typeof sculptedRows)[number] | null | undefined = selection?.row;
      void row;
    },
  }),
  // @ts-expect-error Flow values must be numeric fields.
  ChordLoomCard({ data: sculptedRows, source: 'name', target: 'target', value: 'name' }),
  // @ts-expect-error Bridge sources must be text fields.
  ArcBridgesCard({ data: sculptedRows, source: 'score', target: 'target', value: 'score' }),
  // @ts-expect-error Periods are categorical text.
  RankRibbonsCard({ data: sculptedRows, series: 'name', period: 'enabled', value: 'score' }),
  // @ts-expect-error Booleans are not timestamps.
  EventHelixCard({ data: sculptedRows, label: 'name', date: 'enabled', value: 'score' }),
  // @ts-expect-error Coordinates must be numeric.
  ContourIslandsCard({ data: sculptedRows, label: 'name', x: 'name', y: 'cost' }),
  // @ts-expect-error Every metric must be numeric.
  ParallelRibbonsCard({ data: sculptedRows, label: 'name', metrics: ['cost', 'name'] }),
];
void ChartComponentsProvider({
  // @ts-expect-error The provider's select must accept the period props.
  rangeSelect: (props: { value: number }) => props.value,
  children: null,
});

{
  const rows = [{ path: 'A/B', value: 2 }];
  SunburstTerracesCard({ data: rows, path: 'path', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  SunburstTerracesCard({ data: rows, path: 'path', value: 'path' });
}
{
  const rows = [{ name: 'A', x: 1, y: 2, z: 3, value: 2, group: 'G', links: [] as string[] }];
  ClusterConstellationCard({
    data: rows,
    label: 'name',
    x: 'x',
    y: 'y',
    z: 'z',
    value: 'value',
    connections: 'links',
    group: 'group',
  });
  ClusterConstellationCard({
    data: rows,
    label: 'name',
    x: 'x',
    y: 'y',
    z: 'z',
    // @ts-expect-error Values must identify a numeric field of the row.
    value: 'name',
    connections: 'links',
    group: 'group',
  });
}
{
  const rows = [{ name: 'A', a: 1, b: 2, c: 3, value: 2 }];
  TernaryPrismCard({ data: rows, label: 'name', a: 'a', b: 'b', c: 'c', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  TernaryPrismCard({ data: rows, label: 'name', a: 'a', b: 'b', c: 'c', value: 'name' });
}
{
  const rows = [{ direction: 0, band: 'Light', value: 2 }];
  WindRoseCard({ data: rows, direction: 'direction', band: 'band', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  WindRoseCard({ data: rows, direction: 'direction', band: 'band', value: 'band' });
}
{
  const rows = [{ category: 'A', segment: 'B', value: 2 }];
  MarimekkoBlocksCard({ data: rows, category: 'category', segment: 'segment', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  MarimekkoBlocksCard({ data: rows, category: 'category', segment: 'segment', value: 'category' });
}
{
  const rows = [{ sets: ['A'], value: 2 }];
  IntersectionTowersCard({ data: rows, members: 'sets', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  IntersectionTowersCard({ data: rows, members: 'sets', value: 'sets' });
}
{
  const rows = [{ series: 'A', time: 0, value: 2 }];
  HorizonFoldsCard({ data: rows, series: 'series', time: 'time', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  HorizonFoldsCard({ data: rows, series: 'series', time: 'time', value: 'series' });
}
{
  const rows = [{ path: 'A/B', value: 2 }];
  CircleArchipelagoCard({ data: rows, path: 'path', value: 'value' });
  // @ts-expect-error Values must identify a numeric field of the row.
  CircleArchipelagoCard({ data: rows, path: 'path', value: 'path' });
}
{
  const rows = [{ series: 'A', cycle: 0, phase: 0, value: 2 }];
  HelixRibbonsCard({
    data: rows,
    series: 'series',
    cycle: 'cycle',
    phase: 'phase',
    value: 'value',
  });
  HelixRibbonsCard({
    data: rows,
    series: 'series',
    cycle: 'cycle',
    phase: 'phase',
    // @ts-expect-error Values must identify a numeric field of the row.
    value: 'series',
  });
}
{
  const rows = [{ name: 'A', x: 1, y: 2, z: 3, value: 2, group: 'G', links: [] as string[] }];
  VoxelCloudCard({
    data: rows,
    label: 'name',
    x: 'x',
    y: 'y',
    z: 'z',
    value: 'value',
    group: 'group',
  });
  VoxelCloudCard({
    data: rows,
    label: 'name',
    x: 'x',
    y: 'y',
    z: 'z',
    // @ts-expect-error Values must identify a numeric field of the row.
    value: 'name',
    group: 'group',
  });
}
import {
  StreamgraphCard,
  DivergingBarCard,
  MirroredBarCard,
  ComparativeFunnelCard,
  NestedDonutCard,
  GoalPacingCard,
  MilestoneProgressCard,
  ViolinCard,
  CorrelationMatrixCard,
} from '@lilt-ui/charts';

{
  const rows = [
    { label: 'A', group: 'Team', path: 'Team/A', x: 0, actual: 2, expected: 3, low: 1, high: 4 },
  ];
  StreamgraphCard({ data: rows, x: 'x', series: [{ key: 'actual' }, { key: 'expected' }] });
  DivergingBarCard({
    data: rows,
    category: 'label',
    series: [
      { key: 'actual', side: 'negative' },
      { key: 'expected', side: 'positive' },
    ],
  });
  MirroredBarCard({ data: rows, category: 'label', left: 'actual', right: 'expected' });
  ComparativeFunnelCard({
    data: rows,
    stage: 'label',
    cohorts: [{ key: 'actual' }, { key: 'expected' }],
  });
  NestedDonutCard({ data: rows, path: 'path', value: 'actual' });
  GoalPacingCard({ data: rows, x: 'x', actual: 'actual', expected: 'expected', at: 1, target: 10 });
  MilestoneProgressCard({
    data: rows,
    label: 'label',
    position: 'expected',
    current: 2,
    target: 10,
  });
  ViolinCard({ data: rows, category: 'group', value: 'actual', label: 'label' });
  CorrelationMatrixCard({ data: rows, metrics: [{ key: 'actual' }, { key: 'expected' }] });
  LineChartCard({ data: rows, x: 'x', series: [{ key: 'actual' }], indexed: true });
  LineChartCard({
    data: rows,
    x: 'x',
    series: [{ key: 'actual' }],
    forecast: { from: 0, bands: [{ lower: 'low', upper: 'high', label: '95%' }] },
  });
  ScatterChartCard({
    data: rows,
    x: 'actual',
    y: 'expected',
    group: 'group',
    trails: true,
    trailOrder: 'x',
  });
  TreemapChartCard({
    data: rows,
    label: 'label',
    value: 'actual',
    group: 'group',
    drilldown: true,
  });
  HorizontalBarChartCard({ data: rows, category: 'label', value: 'actual', barStyle: 'lollipop' });
  // @ts-expect-error A text field cannot be a stream measurement.
  StreamgraphCard({ data: rows, x: 'x', series: [{ key: 'label' }] });
  // @ts-expect-error Mirror measurements must identify numeric fields.
  MirroredBarCard({ data: rows, category: 'label', left: 'label', right: 'actual' });
  // @ts-expect-error Checkpoint positions must identify numeric fields.
  MilestoneProgressCard({ data: rows, label: 'label', position: 'label', current: 2 });
  // @ts-expect-error Correlation metrics are checked against the row type.
  CorrelationMatrixCard({ data: rows, metrics: [{ key: 'label' }] });
  // @ts-expect-error Only explicit response directions are supported.
  DivergingBarCard({ data: rows, category: 'label', series: [{ key: 'actual', side: 'outward' }] });
  // @ts-expect-error A comparative funnel needs exactly two cohorts.
  ComparativeFunnelCard({ data: rows, stage: 'label', cohorts: [{ key: 'actual' }] });
  // @ts-expect-error Hierarchy paths are text fields.
  NestedDonutCard({ data: rows, path: 'actual', value: 'expected' });
  // @ts-expect-error Pacing readings must be numeric fields.
  GoalPacingCard({ data: rows, x: 'x', actual: 'label', expected: 'expected', at: 1, target: 10 });
  // @ts-expect-error Violin measurements must be numeric fields.
  ViolinCard({ data: rows, category: 'group', value: 'label' });
}

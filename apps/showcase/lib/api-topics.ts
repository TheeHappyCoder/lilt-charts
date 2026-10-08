/** The API reference, one page per topic, in reading order within each group. */
export type ApiGroup = 'Core' | 'Appearance & motion' | 'Chart families' | 'Interaction & export';

export interface ApiTopic {
  slug: string;
  group: ApiGroup;
  title: string;
  /** One line for the index card and the topic's lede. */
  summary: string;
  /** The names the topic documents, shown on its card and matched by the filter. */
  exports: readonly string[];
}

export const apiGroups: readonly { group: ApiGroup; description: string }[] = [
  {
    group: 'Core',
    description: 'Cards, the chart root and plot, data rules, composition and small plots.',
  },
  {
    group: 'Appearance & motion',
    description: 'Series styling, semantic marks, availability and animated values.',
  },
  {
    group: 'Chart families',
    description: 'What each family accepts and the parts it lets you replace.',
  },
  {
    group: 'Interaction & export',
    description: 'Controlled selection, brushing and static output.',
  },
];

export const apiTopics = [
  {
    slug: 'cards',
    group: 'Core',
    title: 'Cards',
    summary: 'Finished cards that take your rows and field names: the quickest way to a chart.',
    exports: ['AreaChartCard', 'LineChartCard', 'BarChartCard', 'StatCard', 'ChartCard'],
  },
  {
    slug: 'runtime',
    group: 'Core',
    title: 'Runtime and layout',
    summary: 'Compose a Cartesian chart yourself: one root, one plot, and the marks inside it.',
    exports: ['Chart', 'ChartPlot', 'useCartesianChartModel', 'useChartState'],
  },
  {
    slug: 'data',
    group: 'Core',
    title: 'Data and identity',
    summary: 'Accessor rules, gaps versus zero, category identity, and the server-safe entry.',
    exports: ['@lilt-ui/charts/data', 'CategoryXConfig', 'summarizeRange', 'toChartCsv'],
  },
  {
    slug: 'toolkit',
    group: 'Core',
    title: 'Toolkit',
    summary: 'Optional toolbar, readout, overview and tooltip siblings, and comparison results.',
    exports: ['ChartToolbar', 'ChartReadout', 'ChartOverview', 'useChartComparison'],
  },
  {
    slug: 'legends',
    group: 'Core',
    title: 'Value legends',
    summary: 'Legends that show inspected values, inspect on hover and pin on click.',
    exports: ['Legend', 'ValueLegend'],
  },
  {
    slug: 'composition',
    group: 'Core',
    title: 'Composition contracts',
    summary: 'The tooltip slot, the inspected series, and how bars and stacks share a plot.',
    exports: ['Tooltip', 'inspectionSeries', 'renderContent', 'bars', 'stack'],
  },
  {
    slug: 'compact',
    group: 'Core',
    title: 'Small and fixed-height plots',
    summary: 'Fit inspection, pins and keyboard hints inside a dashboard widget’s allocation.',
    exports: ['Tooltip', 'adaptive', 'density', 'compactHeight'],
  },
  {
    slug: 'appearance',
    group: 'Appearance & motion',
    title: 'Appearance',
    summary: 'Series descriptors for color, line, area and bar marks, and --lilt-* tokens.',
    exports: ['ChartSeries', 'Grid', '--lilt-*'],
  },
  {
    slug: 'marks',
    group: 'Appearance & motion',
    title: 'Semantic marks',
    summary: 'Treatments, reading status, step curves, companion fields and per-row color.',
    exports: ['series.fields', 'series.colorAt', 'IntervalBand', 'RangeBar', 'ErrorBar', 'BoxPlot'],
  },
  {
    slug: 'availability',
    group: 'Appearance & motion',
    title: 'Availability and motion',
    summary: 'Loading, empty and error status, entrances, resets and reduced motion.',
    exports: ['status', 'empty', 'ChartEmpty', 'motion', 'animateIn', 'resetKey'],
  },
  {
    slug: 'animated-numbers',
    group: 'Appearance & motion',
    title: 'Animated numbers',
    summary: 'Six ways for a value to change, always read out as the exact number.',
    exports: ['AnimatedNumber', 'numberStyle', 'renderValue'],
  },
  {
    slug: 'vertical-bars',
    group: 'Chart families',
    title: 'Vertical bars',
    summary: 'Grouped and stacked bars on a shared zero baseline, with lines over the stack.',
    exports: ['Bar', 'ChartPlot bars', 'stack'],
  },
  {
    slug: 'stacked-area',
    group: 'Chart families',
    title: 'Stacked area',
    summary: 'Sum and percent stacks with original values in every readout.',
    exports: ['ChartPlot stack', 'Area', 'Line'],
  },
  {
    slug: 'combo',
    group: 'Chart families',
    title: 'Combo charts',
    summary: 'Bars and lines on one plot, with an optional secondary scale.',
    exports: ['ComboChartCard', 'Bar', 'Line', "scale: 'secondary'"],
  },
  {
    slug: 'stat-cards',
    group: 'Chart families',
    title: 'Stat cards and sparklines',
    summary: 'One metric with a sparkline, bars, a meter or a ring.',
    exports: ['StatCard', 'StatCardChart'],
  },
  {
    slug: 'horizontal-bars',
    group: 'Chart families',
    title: 'Horizontal bars',
    summary: 'Ranked categories keyed by identity while values and order change.',
    exports: ['HorizontalBarChartCard'],
  },
  {
    slug: 'category-radial',
    group: 'Chart families',
    title: 'Category and radial charts',
    summary: 'Category x on the shared chart, and shares, progress and rhythm in polar geometry.',
    exports: ['RadialChartCard', 'ProgressCard', 'ActivityRingCard', 'Chart'],
  },
  {
    slug: 'funnels-heatmaps',
    group: 'Chart families',
    title: 'Funnels and heatmaps',
    summary: 'Cumulative stages with honest conversion, and matrices with fixed color domains.',
    exports: ['FunnelChartCard', 'HeatmapChartCard', 'summarizeFunnelStages'],
  },
  {
    slug: 'scatter-flow-profile',
    group: 'Chart families',
    title: 'Scatter, flow and profile charts',
    summary: 'Points, conserved flows, profiles and before-and-after pairs.',
    exports: ['ScatterChartCard', 'SankeyChartCard', 'RadarChartCard', 'SlopeChartCard'],
  },
  {
    slug: 'finance',
    group: 'Chart families',
    title: 'Finance',
    summary: 'Candles, indicators, price, depth, order book and portfolio from their own entry.',
    exports: ['@lilt-ui/charts/finance', 'CandlestickChartCard', 'Candles', 'OrderBook'],
  },
  {
    slug: 'selection',
    group: 'Interaction & export',
    title: 'Dashboard selection and export',
    summary: 'Selections you own, linked charts, range summaries and CSV.',
    exports: ['selected', 'selectedCategoryId', 'createChartController', 'ChartRangeSummary'],
  },
  {
    slug: 'range-brush',
    group: 'Interaction & export',
    title: 'Range brush',
    summary: 'Choose and refine an interval on an overview without resampling.',
    exports: ['ChartBrush', 'brush'],
  },
  {
    slug: 'svg-export',
    group: 'Interaction & export',
    title: 'Static SVG export',
    summary: 'A captioned, self-contained SVG of a settled plot.',
    exports: ['serializeChartSvg'],
  },
] as const satisfies readonly ApiTopic[];

export type ApiTopicSlug = (typeof apiTopics)[number]['slug'];

export const apiTopicHref = (slug: string) => `/guides/api/${slug}`;

export function apiTopic(slug: string): ApiTopic | undefined {
  return (apiTopics as readonly ApiTopic[]).find((topic) => topic.slug === slug);
}

/** The topics either side of one, across groups, for the pager at the foot of each page. */
export function apiNeighbours(slug: string): { previous?: ApiTopic; next?: ApiTopic } {
  const topics: readonly ApiTopic[] = apiTopics;
  const index = topics.findIndex((topic) => topic.slug === slug);
  return { previous: topics[index - 1], next: topics[index + 1] };
}

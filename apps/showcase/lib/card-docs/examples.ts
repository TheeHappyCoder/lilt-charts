import type {
  StreamgraphCardProps,
  DivergingBarCardProps,
  MirroredBarCardProps,
  ComparativeFunnelCardProps,
  NestedDonutCardProps,
  GoalPacingCardProps,
  MilestoneProgressCardProps,
  ViolinCardProps,
  CorrelationMatrixCardProps,
  SunburstTerracesCardProps,
  ClusterConstellationCardProps,
  TernaryPrismCardProps,
  WindRoseCardProps,
  MarimekkoBlocksCardProps,
  IntersectionTowersCardProps,
  HorizonFoldsCardProps,
  CircleArchipelagoCardProps,
  HelixRibbonsCardProps,
  VoxelCloudCardProps,
  ChordLoomCardProps,
  RankRibbonsCardProps,
  EventHelixCardProps,
  ContourIslandsCardProps,
  ParallelRibbonsCardProps,
  ArcBridgesCardProps,
  TreemapChartCardProps,
  SkylineCardProps,
  BlockCityCardProps,
  RidgelineCardProps,
  SpiralYearCardProps,
  TerrainCardProps,
  HexCityCardProps,
  VoxelWaffleCardProps,
  CalendarHeatmapCardProps,
  TimelineChartCardProps,
  StripChartCardProps,
  ActivityRingCardProps,
  AreaChartCardProps,
  BarChartCardProps,
  BoxPlotCardProps,
  RangeChartCardProps,
  ComboChartCardProps,
  FunnelChartCardProps,
  HeatmapChartCardProps,
  HorizontalBarChartCardProps,
  LineChartCardProps,
  NumericKey,
  ProgressCardProps,
  RadarChartCardProps,
  RadialChartCardProps,
  SankeyChartCardProps,
  ScatterChartCardProps,
  SlopeChartCardProps,
  StatCardProps,
} from '@lilt-ui/charts';
import type {
  CandlestickChartCardProps,
  DepthChartCardProps,
  IndicatorChartCardProps,
  OrderBookProps,
  PortfolioChartCardProps,
  PriceChartCardProps,
} from '@lilt-ui/charts/finance';
import {
  bookSets,
  rangeSets,
  type BookName,
  type DataName,
  type RangeName,
  datasets,
} from './data';
import { isPeriodSource, rangesOf } from './periods';

export type CardKind =
  | 'streamgraph'
  | 'diverging'
  | 'mirrored'
  | 'comparativefunnel'
  | 'nesteddonut'
  | 'goalpacing'
  | 'milestoneprogress'
  | 'violin'
  | 'correlation'
  | 'sunburstterraces'
  | 'clusterconstellation'
  | 'ternaryprism'
  | 'windrose'
  | 'marimekkoblocks'
  | 'intersectiontowers'
  | 'horizonfolds'
  | 'circlearchipelago'
  | 'helixribbons'
  | 'voxelcloud'
  | 'chordloom'
  | 'rankribbons'
  | 'eventhelix'
  | 'contourislands'
  | 'parallelribbons'
  | 'arcbridges'
  | 'treemap'
  | 'skyline'
  | 'blockcity'
  | 'ridgeline'
  | 'spiral'
  | 'terrain'
  | 'hexcity'
  | 'voxel'
  | 'calendar'
  | 'timeline'
  | 'strip'
  | 'area'
  | 'line'
  | 'bar'
  | 'combo'
  | 'ranking'
  | 'radial'
  | 'stat'
  | 'funnel'
  | 'heatmap'
  | 'scatter'
  | 'sankey'
  | 'radar'
  | 'slope'
  | 'activity'
  | 'progress'
  | 'range'
  | 'boxplot'
  | 'candlestick'
  | 'indicator'
  | 'depth'
  | 'orderbook'
  | 'portfolio'
  | 'price';
export type SourceName = DataName | RangeName | BookName;

export const cardComponents: Record<CardKind, string> = {
  streamgraph: 'StreamgraphCard',
  diverging: 'DivergingBarCard',
  mirrored: 'MirroredBarCard',
  comparativefunnel: 'ComparativeFunnelCard',
  nesteddonut: 'NestedDonutCard',
  goalpacing: 'GoalPacingCard',
  milestoneprogress: 'MilestoneProgressCard',
  violin: 'ViolinCard',
  correlation: 'CorrelationMatrixCard',
  sunburstterraces: 'SunburstTerracesCard',
  clusterconstellation: 'ClusterConstellationCard',
  ternaryprism: 'TernaryPrismCard',
  windrose: 'WindRoseCard',
  marimekkoblocks: 'MarimekkoBlocksCard',
  intersectiontowers: 'IntersectionTowersCard',
  horizonfolds: 'HorizonFoldsCard',
  circlearchipelago: 'CircleArchipelagoCard',
  helixribbons: 'HelixRibbonsCard',
  voxelcloud: 'VoxelCloudCard',
  chordloom: 'ChordLoomCard',
  rankribbons: 'RankRibbonsCard',
  eventhelix: 'EventHelixCard',
  contourislands: 'ContourIslandsCard',
  parallelribbons: 'ParallelRibbonsCard',
  arcbridges: 'ArcBridgesCard',
  treemap: 'TreemapChartCard',
  skyline: 'SkylineCard',
  blockcity: 'BlockCityCard',
  ridgeline: 'RidgelineCard',
  spiral: 'SpiralYearCard',
  terrain: 'TerrainCard',
  hexcity: 'HexCityCard',
  voxel: 'VoxelWaffleCard',
  calendar: 'CalendarHeatmapCard',
  timeline: 'TimelineChartCard',
  strip: 'StripChartCard',
  area: 'AreaChartCard',
  line: 'LineChartCard',
  bar: 'BarChartCard',
  combo: 'ComboChartCard',
  ranking: 'HorizontalBarChartCard',
  radial: 'RadialChartCard',
  progress: 'ProgressCard',
  funnel: 'FunnelChartCard',
  heatmap: 'HeatmapChartCard',
  scatter: 'ScatterChartCard',
  sankey: 'SankeyChartCard',
  radar: 'RadarChartCard',
  slope: 'SlopeChartCard',
  activity: 'ActivityRingCard',
  stat: 'StatCard',
  range: 'RangeChartCard',
  boxplot: 'BoxPlotCard',
  candlestick: 'CandlestickChartCard',
  indicator: 'IndicatorChartCard',
  depth: 'DepthChartCard',
  orderbook: 'OrderBook',
  portfolio: 'PortfolioChartCard',
  price: 'PriceChartCard',
};

const financeKinds: readonly CardKind[] = [
  'candlestick',
  'indicator',
  'depth',
  'orderbook',
  'portfolio',
  'price',
];

/** Where a card is imported from: finance cards have their own entry point. */
export function cardModule(kind: CardKind): string {
  return financeKinds.includes(kind) ? '@lilt-ui/charts/finance' : '@lilt-ui/charts';
}

type RowOf<S extends SourceName> = S extends DataName
  ? (typeof datasets)[S][number]
  : S extends RangeName
    ? (typeof rangeSets)[S][number]['data'][number]
    : never;

/** Cards that take an order book's bids and asks instead of rows. */
type BookKind = 'depth' | 'orderbook';

type PropsFor<K extends CardKind, Row> = K extends 'streamgraph'
  ? StreamgraphCardProps<Row, NumericKey<Row>>
  : K extends 'diverging'
    ? DivergingBarCardProps<Row, NumericKey<Row>>
    : K extends 'mirrored'
      ? MirroredBarCardProps<Row, NumericKey<Row>>
      : K extends 'comparativefunnel'
        ? ComparativeFunnelCardProps<Row, NumericKey<Row>>
        : K extends 'nesteddonut'
          ? NestedDonutCardProps<Row, NumericKey<Row>>
          : K extends 'goalpacing'
            ? GoalPacingCardProps<Row, NumericKey<Row>>
            : K extends 'milestoneprogress'
              ? MilestoneProgressCardProps<Row, NumericKey<Row>>
              : K extends 'violin'
                ? ViolinCardProps<Row, NumericKey<Row>>
                : K extends 'correlation'
                  ? CorrelationMatrixCardProps<Row, NumericKey<Row>>
                  : K extends 'sunburstterraces'
                    ? SunburstTerracesCardProps<Row, NumericKey<Row>>
                    : K extends 'clusterconstellation'
                      ? ClusterConstellationCardProps<Row, NumericKey<Row>>
                      : K extends 'ternaryprism'
                        ? TernaryPrismCardProps<Row, NumericKey<Row>>
                        : K extends 'windrose'
                          ? WindRoseCardProps<Row, NumericKey<Row>>
                          : K extends 'marimekkoblocks'
                            ? MarimekkoBlocksCardProps<Row, NumericKey<Row>>
                            : K extends 'intersectiontowers'
                              ? IntersectionTowersCardProps<Row, NumericKey<Row>>
                              : K extends 'horizonfolds'
                                ? HorizonFoldsCardProps<Row, NumericKey<Row>>
                                : K extends 'circlearchipelago'
                                  ? CircleArchipelagoCardProps<Row, NumericKey<Row>>
                                  : K extends 'helixribbons'
                                    ? HelixRibbonsCardProps<Row, NumericKey<Row>>
                                    : K extends 'voxelcloud'
                                      ? VoxelCloudCardProps<Row, NumericKey<Row>>
                                      : K extends 'chordloom'
                                        ? ChordLoomCardProps<Row, NumericKey<Row>>
                                        : K extends 'rankribbons'
                                          ? RankRibbonsCardProps<Row, NumericKey<Row>>
                                          : K extends 'eventhelix'
                                            ? EventHelixCardProps<Row, NumericKey<Row>>
                                            : K extends 'contourislands'
                                              ? ContourIslandsCardProps<Row, NumericKey<Row>>
                                              : K extends 'parallelribbons'
                                                ? ParallelRibbonsCardProps<Row, NumericKey<Row>>
                                                : K extends 'arcbridges'
                                                  ? ArcBridgesCardProps<Row, NumericKey<Row>>
                                                  : K extends 'terrain'
                                                    ? TerrainCardProps<Row, NumericKey<Row>>
                                                    : K extends 'hexcity'
                                                      ? HexCityCardProps<Row, NumericKey<Row>>
                                                      : K extends 'voxel'
                                                        ? VoxelWaffleCardProps<Row, NumericKey<Row>>
                                                        : K extends 'skyline'
                                                          ? SkylineCardProps<Row, NumericKey<Row>>
                                                          : K extends 'blockcity'
                                                            ? BlockCityCardProps<
                                                                Row,
                                                                NumericKey<Row>
                                                              >
                                                            : K extends 'ridgeline'
                                                              ? RidgelineCardProps<
                                                                  Row,
                                                                  NumericKey<Row>
                                                                >
                                                              : K extends 'spiral'
                                                                ? SpiralYearCardProps<
                                                                    Row,
                                                                    NumericKey<Row>
                                                                  >
                                                                : K extends 'treemap'
                                                                  ? TreemapChartCardProps<
                                                                      Row,
                                                                      NumericKey<Row>
                                                                    >
                                                                  : K extends 'calendar'
                                                                    ? CalendarHeatmapCardProps<
                                                                        Row,
                                                                        NumericKey<Row>
                                                                      >
                                                                    : K extends 'timeline'
                                                                      ? TimelineChartCardProps<Row>
                                                                      : K extends 'strip'
                                                                        ? StripChartCardProps<
                                                                            Row,
                                                                            NumericKey<Row>
                                                                          >
                                                                        : K extends 'area'
                                                                          ? AreaChartCardProps<
                                                                              Row,
                                                                              NumericKey<Row>
                                                                            >
                                                                          : K extends 'line'
                                                                            ? LineChartCardProps<
                                                                                Row,
                                                                                NumericKey<Row>
                                                                              >
                                                                            : K extends 'bar'
                                                                              ? BarChartCardProps<
                                                                                  Row,
                                                                                  NumericKey<Row>
                                                                                >
                                                                              : K extends 'combo'
                                                                                ? ComboChartCardProps<
                                                                                    Row,
                                                                                    NumericKey<Row>
                                                                                  >
                                                                                : K extends 'ranking'
                                                                                  ? HorizontalBarChartCardProps<
                                                                                      Row,
                                                                                      NumericKey<Row>
                                                                                    >
                                                                                  : K extends 'radial'
                                                                                    ? RadialChartCardProps<
                                                                                        Row,
                                                                                        NumericKey<Row>
                                                                                      >
                                                                                    : K extends 'funnel'
                                                                                      ? FunnelChartCardProps<
                                                                                          Row,
                                                                                          NumericKey<Row>
                                                                                        >
                                                                                      : K extends 'heatmap'
                                                                                        ? HeatmapChartCardProps<
                                                                                            Row,
                                                                                            NumericKey<Row>
                                                                                          >
                                                                                        : K extends 'scatter'
                                                                                          ? ScatterChartCardProps<
                                                                                              Row,
                                                                                              NumericKey<Row>
                                                                                            >
                                                                                          : K extends 'sankey'
                                                                                            ? SankeyChartCardProps<
                                                                                                Row,
                                                                                                NumericKey<Row>
                                                                                              >
                                                                                            : K extends 'radar'
                                                                                              ? RadarChartCardProps<
                                                                                                  Row,
                                                                                                  NumericKey<Row>
                                                                                                >
                                                                                              : K extends 'slope'
                                                                                                ? SlopeChartCardProps<
                                                                                                    Row,
                                                                                                    NumericKey<Row>
                                                                                                  >
                                                                                                : K extends 'activity'
                                                                                                  ? ActivityRingCardProps<
                                                                                                      Row,
                                                                                                      NumericKey<Row>
                                                                                                    >
                                                                                                  : K extends 'range'
                                                                                                    ? RangeChartCardProps<
                                                                                                        Row,
                                                                                                        NumericKey<Row>
                                                                                                      >
                                                                                                    : K extends 'boxplot'
                                                                                                      ? BoxPlotCardProps<Row>
                                                                                                      : K extends 'candlestick'
                                                                                                        ? CandlestickChartCardProps<
                                                                                                            Row,
                                                                                                            NumericKey<Row>
                                                                                                          >
                                                                                                        : K extends 'indicator'
                                                                                                          ? IndicatorChartCardProps<
                                                                                                              Row,
                                                                                                              NumericKey<Row>
                                                                                                            >
                                                                                                          : K extends 'portfolio'
                                                                                                            ? PortfolioChartCardProps<
                                                                                                                Row,
                                                                                                                NumericKey<Row>
                                                                                                              >
                                                                                                            : K extends 'price'
                                                                                                              ? PriceChartCardProps<
                                                                                                                  Row,
                                                                                                                  NumericKey<Row>
                                                                                                                >
                                                                                                              : StatCardProps<
                                                                                                                  Row,
                                                                                                                  NumericKey<Row>
                                                                                                                >;

/** An example is data only: the preview and the printed code are both derived from it. */
export interface CardExample {
  id: string;
  title: string;
  description: string;
  kind: CardKind;
  /** The dataset the card renders. Cards that take plain numbers have none. */
  source?: SourceName;
  props: Readonly<Record<string, unknown>>;
}

/** Several cards shown side by side, e.g. a dashboard row of stat cards. */
export interface CardExampleRow {
  id: string;
  title: string;
  description: string;
  kind: CardKind;
  row: readonly CardExample[];
}

export type DocExample = CardExample | CardExampleRow;

export const isExampleRow = (example: DocExample): example is CardExampleRow => 'row' in example;

/** How wide the stage draws an example: a row spans it, a stat card is narrow, others default. */
export function stageSize(example: DocExample): 'narrow' | 'wide' | undefined {
  if (isExampleRow(example)) return 'wide';
  return example.kind === 'stat' ? 'narrow' : undefined;
}

/** The inline grid a row prints and renders with, so both stay identical. */
export const ROW_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
  gap: 16,
} as const;

/** Declare an example; its props are checked against the real card props for its rows. */
export function cardExample<
  K extends Exclude<CardKind, 'progress' | BookKind>,
  S extends DataName | RangeName,
>(example: {
  id: string;
  title: string;
  description: string;
  kind: K;
  source: S;
  props: Omit<PropsFor<K, RowOf<S>>, 'data' | 'ranges'>;
}): CardExample {
  return example as unknown as CardExample;
}

/** Declare an example for a card that reads an order book: its bids and asks. */
export function bookExample<K extends BookKind>(example: {
  id: string;
  title: string;
  description: string;
  kind: K;
  source: BookName;
  props: Omit<K extends 'depth' ? DepthChartCardProps : OrderBookProps, 'bids' | 'asks'>;
}): CardExample {
  return example as unknown as CardExample;
}

/** Declare an example for a card that takes plain numbers rather than rows. */
export function valueExample(example: {
  id: string;
  title: string;
  description: string;
  kind: 'progress';
  props: ProgressCardProps;
}): CardExample {
  return example as unknown as CardExample;
}

export const isRangeSource = (source: SourceName | undefined): source is RangeName =>
  source !== undefined && (source in rangeSets || isPeriodSource(source));

export const isBookSource = (source: SourceName | undefined): source is BookName =>
  source !== undefined && source in bookSets;

/** The data props an example prints, in order. */
function dataLines(source: SourceName | undefined): string[] {
  if (source === undefined) return [];
  if (isRangeSource(source)) return ['  ranges={ranges}'];
  if (isBookSource(source)) return [`  bids={${source}.bids}`, `  asks={${source}.asks}`];
  return [`  data={${source}}`];
}

function printValue(value: unknown, indent: string): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Date) return `new Date('${value.toISOString()}')`;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => `${indent}  ${printValue(item, `${indent}  `)},`);
    return `[\n${items.join('\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, item]) => `${JSON.stringify(key)}: ${printValue(item, indent)}`,
    );
    return `{ ${entries.join(', ')} }`;
  }
  return String(value);
}

/** Print an example (or a row of them) as JSX exactly as the preview renders it. */
export function exampleJsx(example: DocExample): string {
  if (isExampleRow(example)) {
    const cards = example.row
      .map((item) =>
        cardJsx(item)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
      )
      .join('\n');
    return `<div style={${printValue(ROW_STYLE, '')}}>\n${cards}\n</div>`;
  }
  return cardJsx(example);
}

/** One prop as JSX prints it: `key="text"`, a bare `key` for true, or `key={value}`. */
export function propSource(key: string, value: unknown, indent = ''): string {
  if (typeof value === 'string') return `${key}="${value}"`;
  if (value === true) return key;
  return `${key}={${printValue(value, indent)}}`;
}

function cardJsx(example: CardExample): string {
  const lines = Object.entries(example.props).map(
    ([key, value]) => `  ${propSource(key, value, '  ')}`,
  );
  const [titleLine, ...others] = lines;
  return `<${cardComponents[example.kind]}\n${[titleLine, ...dataLines(example.source), ...others].join('\n')}\n/>`;
}

/** Serialize the same rows the preview reads, including every period and order-book level. */
function sourceDefinition(source: SourceName): string {
  if (isRangeSource(source)) return `const ranges = ${printValue(rangesOf(source), '')};`;
  const data = isBookSource(source) ? bookSets[source] : datasets[source];
  return `const ${source} = ${printValue(data, '')};`;
}

/** A complete, copyable file for the Code tab. */
export function exampleSource(example: DocExample, name: string): string {
  const jsx = exampleJsx(example)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  const sources = [
    ...new Set(isExampleRow(example) ? example.row.map((item) => item.source) : [example.source]),
  ].flatMap((source) => (source ? [source] : []));
  return `'use client';

import { ${cardComponents[example.kind]} } from '${cardModule(example.kind)}';
import '@lilt-ui/charts/styles.css';

${sources.map((source) => `${sourceDefinition(source)}\n\n`).join('')}export function ${name}() {
  return (
${jsx}
  );
}
`;
}

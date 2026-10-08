'use client';

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
  ChordLoomCard,
  RankRibbonsCard,
  EventHelixCard,
  ContourIslandsCard,
  ParallelRibbonsCard,
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
  ArcBridgesCard,
  TreemapChartCard,
  SkylineCard,
  BlockCityCard,
  RidgelineCard,
  SpiralYearCard,
  TerrainCard,
  HexCityCard,
  VoxelWaffleCard,
  CalendarHeatmapCard,
  TimelineChartCard,
  StripChartCard,
  ActivityRingCard,
  AreaChartCard,
  BarChartCard,
  BoxPlotCard,
  RangeChartCard,
  ComboChartCard,
  FunnelChartCard,
  HeatmapChartCard,
  HorizontalBarChartCard,
  LineChartCard,
  ProgressCard,
  RadarChartCard,
  RadialChartCard,
  SankeyChartCard,
  ScatterChartCard,
  SlopeChartCard,
  StatCard,
} from '@lilt-ui/charts';
import {
  CandlestickChartCard,
  DepthChartCard,
  IndicatorChartCard,
  OrderBook,
  PortfolioChartCard,
  PriceChartCard,
} from '@lilt-ui/charts/finance';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { bookSets, datasets } from '@/lib/card-docs/data';
import { rangesOf } from '@/lib/card-docs/periods';
import {
  isBookSource,
  isExampleRow,
  isRangeSource,
  ROW_STYLE,
  type CardExample,
  type DocExample,
} from '@/lib/card-docs/examples';

const components = {
  streamgraph: StreamgraphCard,
  diverging: DivergingBarCard,
  mirrored: MirroredBarCard,
  comparativefunnel: ComparativeFunnelCard,
  nesteddonut: NestedDonutCard,
  goalpacing: GoalPacingCard,
  milestoneprogress: MilestoneProgressCard,
  violin: ViolinCard,
  correlation: CorrelationMatrixCard,
  chordloom: ChordLoomCard,
  rankribbons: RankRibbonsCard,
  eventhelix: EventHelixCard,
  contourislands: ContourIslandsCard,
  parallelribbons: ParallelRibbonsCard,
  sunburstterraces: SunburstTerracesCard,
  clusterconstellation: ClusterConstellationCard,
  ternaryprism: TernaryPrismCard,
  windrose: WindRoseCard,
  marimekkoblocks: MarimekkoBlocksCard,
  intersectiontowers: IntersectionTowersCard,
  horizonfolds: HorizonFoldsCard,
  circlearchipelago: CircleArchipelagoCard,
  helixribbons: HelixRibbonsCard,
  voxelcloud: VoxelCloudCard,
  arcbridges: ArcBridgesCard,
  treemap: TreemapChartCard,
  skyline: SkylineCard,
  blockcity: BlockCityCard,
  ridgeline: RidgelineCard,
  spiral: SpiralYearCard,
  terrain: TerrainCard,
  hexcity: HexCityCard,
  voxel: VoxelWaffleCard,
  calendar: CalendarHeatmapCard,
  timeline: TimelineChartCard,
  strip: StripChartCard,
  area: AreaChartCard,
  line: LineChartCard,
  bar: BarChartCard,
  combo: ComboChartCard,
  ranking: HorizontalBarChartCard,
  radial: RadialChartCard,
  progress: ProgressCard,
  funnel: FunnelChartCard,
  heatmap: HeatmapChartCard,
  scatter: ScatterChartCard,
  sankey: SankeyChartCard,
  radar: RadarChartCard,
  slope: SlopeChartCard,
  activity: ActivityRingCard,
  stat: StatCard,
  range: RangeChartCard,
  boxplot: BoxPlotCard,
  candlestick: CandlestickChartCard,
  indicator: IndicatorChartCard,
  depth: DepthChartCard,
  orderbook: OrderBook,
  portfolio: PortfolioChartCard,
  price: PriceChartCard,
} as const;

type LooseProps = ComponentProps<typeof AreaChartCard>;

function Card({ example, badge }: { example: CardExample; badge?: ReactNode }) {
  const Component = components[example.kind] as unknown as (props: LooseProps) => ReactElement;
  const source =
    example.source === undefined
      ? {}
      : isRangeSource(example.source)
        ? { ranges: rangesOf(example.source) }
        : isBookSource(example.source)
          ? bookSets[example.source]
          : { data: datasets[example.source] };
  return (
    <Component
      {...(example.props as unknown as LooseProps)}
      {...(source as unknown as LooseProps)}
      badge={badge}
    />
  );
}

/**
 * Renders an example exactly as its printed code does. Example props were checked against the
 * card and its rows when the example was declared, so the loose typing stops here. A `badge`
 * places page content, such as a cue or a command, on a single card's tab.
 */
export function CardExamplePreview({ example, badge }: { example: DocExample; badge?: ReactNode }) {
  if (!isExampleRow(example)) return <Card example={example} badge={badge} />;
  return (
    <div style={ROW_STYLE}>
      {example.row.map((item) => (
        <Card key={item.id} example={item} />
      ))}
    </div>
  );
}

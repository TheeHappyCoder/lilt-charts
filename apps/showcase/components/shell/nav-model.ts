import type { IconSvgElement } from '@hugeicons/react';
import Activity01Icon from '@hugeicons/core-free-icons/Activity01Icon';
import Link01Icon from '@hugeicons/core-free-icons/Link01Icon';
import Pin02Icon from '@hugeicons/core-free-icons/Pin02Icon';
import ArrowDataTransferHorizontalIcon from '@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon';
import Target03Icon from '@hugeicons/core-free-icons/Target03Icon';
import DashboardSquare01Icon from '@hugeicons/core-free-icons/DashboardSquare01Icon';
import ChartCandlestickIcon from '@hugeicons/core-free-icons/ChartCandlestickIcon';
import ChartGanttIcon from '@hugeicons/core-free-icons/ChartGanttIcon';
import ChartMaximumIcon from '@hugeicons/core-free-icons/ChartMaximumIcon';
import ChartSplineIcon from '@hugeicons/core-free-icons/ChartSplineIcon';
import MarketAnalysisIcon from '@hugeicons/core-free-icons/MarketAnalysisIcon';
import MarketOrderIcon from '@hugeicons/core-free-icons/MarketOrderIcon';
import TradeUpIcon from '@hugeicons/core-free-icons/TradeUpIcon';
import Wallet01Icon from '@hugeicons/core-free-icons/Wallet01Icon';
import GridViewIcon from '@hugeicons/core-free-icons/GridViewIcon';
import SlidersHorizontalIcon from '@hugeicons/core-free-icons/SlidersHorizontalIcon';
import BookOpen01Icon from '@hugeicons/core-free-icons/BookOpen01Icon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import ChartAreaIcon from '@hugeicons/core-free-icons/ChartAreaIcon';
import ChartColumnIcon from '@hugeicons/core-free-icons/ChartColumnIcon';
import ChartHistogramIcon from '@hugeicons/core-free-icons/ChartHistogramIcon';
import ChartHighLowIcon from '@hugeicons/core-free-icons/ChartHighLowIcon';
import ChartLineIcon from '@hugeicons/core-free-icons/ChartLineIcon';
import ChartRadarIcon from '@hugeicons/core-free-icons/ChartRadarIcon';
import ChartScatterIcon from '@hugeicons/core-free-icons/ChartScatterIcon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon';
import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon';
import Target02Icon from '@hugeicons/core-free-icons/Target02Icon';
import Cursor01Icon from '@hugeicons/core-free-icons/Cursor01Icon';
import HashtagIcon from '@hugeicons/core-free-icons/HashtagIcon';
import CodeIcon from '@hugeicons/core-free-icons/CodeIcon';
import FileScriptIcon from '@hugeicons/core-free-icons/FileScriptIcon';
import GridIcon from '@hugeicons/core-free-icons/GridIcon';
import GridTableIcon from '@hugeicons/core-free-icons/GridTableIcon';
import PaintBoardIcon from '@hugeicons/core-free-icons/PaintBoardIcon';
import PipelineIcon from '@hugeicons/core-free-icons/PipelineIcon';
import RadialIcon from '@hugeicons/core-free-icons/RadialIcon';
import RulerIcon from '@hugeicons/core-free-icons/RulerIcon';
import SquareIcon from '@hugeicons/core-free-icons/SquareIcon';
import CubeIcon from '@hugeicons/core-free-icons/CubeIcon';
import LeftToRightListBulletIcon from '@hugeicons/core-free-icons/LeftToRightListBulletIcon';
import WaveIcon from '@hugeicons/core-free-icons/WaveIcon';
import WorkflowSquare05Icon from '@hugeicons/core-free-icons/WorkflowSquare05Icon';
import { appRoutes, type AppRoute, type RouteGroup, type RouteIcon } from '@/lib/routes';

/**
 * The site's navigation, as data: the four places to browse, which one a page lives under, and
 * each place's pages in groups. The rail and its panel draw it.
 */
export const icons: Record<RouteIcon, IconSvgElement> = {
  chordloom: RadialIcon,
  rankribbons: ChartHighLowIcon,
  eventhelix: RadialIcon,
  contourislands: ChartSplineIcon,
  parallelribbons: ChartLineIcon,
  sunburstterraces: RadialIcon,
  clusterconstellation: ChartScatterIcon,
  ternaryprism: CubeIcon,
  windrose: RadialIcon,
  marimekkoblocks: GridTableIcon,
  intersectiontowers: GridTableIcon,
  horizonfolds: ChartSplineIcon,
  circlearchipelago: ChartScatterIcon,
  helixribbons: ChartSplineIcon,
  voxelcloud: CubeIcon,
  arcbridges: WorkflowSquare05Icon,
  treemap: DashboardSquare01Icon,
  skyline: CubeIcon,
  blockcity: GridIcon,
  ridgeline: WaveIcon,
  spiral: RadialIcon,
  terrain: ChartSplineIcon,
  hexcity: CubeIcon,
  voxel: GridTableIcon,
  area: ChartAreaIcon,
  line: ChartLineIcon,
  bar: ChartColumnIcon,
  ranking: ChartColumnIcon,
  sparkline: Activity01Icon,
  radial: RadialIcon,
  activity: Clock01Icon,
  progress: Target02Icon,
  radar: ChartRadarIcon,
  slope: ChartHighLowIcon,
  combo: ChartHistogramIcon,
  funnel: PipelineIcon,
  sankey: WorkflowSquare05Icon,
  scatter: ChartScatterIcon,
  heatmap: GridTableIcon,
  range: ChartGanttIcon,
  boxplot: ChartMaximumIcon,
  candlestick: ChartCandlestickIcon,
  indicator: MarketAnalysisIcon,
  depth: ChartSplineIcon,
  orderbook: MarketOrderIcon,
  portfolio: Wallet01Icon,
  price: TradeUpIcon,
  start: CodeIcon,
  api: FileScriptIcon,
  motion: WaveIcon,
  background: GridIcon,
  surface: SquareIcon,
  cube: CubeIcon,
  legend: LeftToRightListBulletIcon,
  ruler: RulerIcon,
  hover: Cursor01Icon,
  numbers: HashtagIcon,
  palette: PaintBoardIcon,
  sync: Link01Icon,
  pin: Pin02Icon,
  compare: ArrowDataTransferHorizontalIcon,
  targets: Target03Icon,
  speed: DashboardSpeed02Icon,
  loading: Loading03Icon,
  empty: InboxIcon,
};

export type Tab = 'charts' | 'customize' | 'features' | 'docs';

export const tabs: readonly { value: Tab; label: string; icon: IconSvgElement }[] = [
  { value: 'charts', label: 'Charts', icon: GridViewIcon },
  { value: 'customize', label: 'Customize', icon: SlidersHorizontalIcon },
  { value: 'features', label: 'Features', icon: SparklesIcon },
  { value: 'docs', label: 'Docs', icon: BookOpen01Icon },
];

/** Which tab a page lives under: charts and finance, what applies to every chart, what charts
    do, and the rest (getting started and reference). */
export const tabOf = (group: RouteGroup): Tab =>
  group === 'Charts' || group === 'Finance'
    ? 'charts'
    : group === 'Customize'
      ? 'customize'
      : group === 'Features'
        ? 'features'
        : 'docs';

export interface TileGroup {
  key: string;
  /** A quiet heading over the tiles; none for a group that needs no name. */
  heading?: string;
  routes: readonly AppRoute[];
  /** One tile across the whole row, for the way in. */
  wide?: boolean;
}

const allRoutes: readonly AppRoute[] = appRoutes;
const navRoutes = allRoutes.filter((route) => route.navigation);
const topIn = (group: RouteGroup) => navRoutes.filter((r) => r.group === group && !r.parent);
/** A route, then the routes nested under it as neighbouring tiles. */
const withNested = (routes: readonly AppRoute[]): AppRoute[] =>
  routes.flatMap((route) => [route, ...withNested(navRoutes.filter((r) => r.parent === route.id))]);

function chartGroups(): TileGroup[] {
  const charts = topIn('Charts');
  const jobs = [...new Set(charts.map((route) => route.job))];
  return [
    ...jobs.map((job) => ({
      key: `job-${job}`,
      heading: job,
      routes: charts.filter((route) => route.job === job),
    })),
    { key: 'finance', heading: 'Finance', routes: topIn('Finance') },
  ];
}

export const groupsByTab: Record<Tab, readonly TileGroup[]> = {
  charts: chartGroups(),
  customize: [{ key: 'customize', routes: topIn('Customize') }],
  features: [{ key: 'features', routes: withNested(topIn('Features')) }],
  docs: [
    { key: 'start', routes: topIn('Start'), wide: true },
    { key: 'reference', heading: 'Reference', routes: topIn('Reference') },
  ],
};

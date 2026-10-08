'use client';

import './styles.css';

export { Chart, useChartComparison } from './runtime/chart-runtime';
export {
  createCartesianChartModel,
  useCartesianChartModel,
  useCartesianModelState,
} from './model/cartesian-model';
export { useChartState } from './model/use-chart-state';
export type {
  CartesianChartModel,
  CartesianModelState,
  CartesianSummaryQuery,
  CartesianSummaryResult,
} from './model/cartesian-model';
export { ComparisonDetails } from './toolkit/comparison-details';
export type { ComparisonDetailsProps } from './toolkit/comparison-details';
export { ChartPlot } from './chart-plot';
export { ChartToolbar } from './toolkit/chart-toolbar';
export { ChartReadout } from './toolkit/chart-readout';
export { ChartOverview } from './toolkit/chart-overview';
export { ChartBrush } from './toolkit/chart-brush';
export { Area } from './primitives/area';
export { IntervalBand } from './primitives/interval-band';
export { RangeBar } from './primitives/range-bar';
export { ErrorBar } from './primitives/error-bar';
export { BoxPlot } from './primitives/box-plot';
export { summarizeBox } from './engine/box';
export type { BoxSummary } from './engine/box';
export { Line } from './primitives/line';
export { Bar } from './primitives/bar';
export type { SankeyNode, SankeyLink, ConservationPolicy } from './engine/sankey';
export { serializeChartSvg } from './export-chart-svg';
export type { ChartSvgExportOptions } from './export-chart-svg';
export { Grid } from './primitives/grid';
export { XAxis, YAxis } from './primitives/axes';
export { Tooltip } from './interaction/tooltip';
export { Legend } from './interaction/legend';
export {
  ValueLegend,
  type ValueLegendEntry,
  type ValueLegendProps,
} from './interaction/value-legend';
export { createChartController } from './interaction/chart-controller';
export { useChartSync } from './interaction/chart-sync';
export type { ChartSyncPosition } from './interaction/chart-sync';
export { Annotations, ReferenceBand } from './primitives/annotations';
export { ReferenceLine } from './primitives/reference-line';
export { ChangeComparison } from './primitives/change-comparison';
export { AnimatedNumber } from './motion/animated-number';
export type { AnimatedNumberProps, AnimatedNumberVariant } from './motion/animated-number';
export type {
  ChartAxis,
  ChartAxisSide,
  ChartAxisStyle,
  ChartBackground,
  ChartPalette,
  ChartHoverReadout,
  ChartHoverStyle,
  ChartTooltipIndicator,
  ChartSurface,
  AreaProps,
  IntervalBandProps,
  RangeBarProps,
  ErrorBarProps,
  BoxPlotProps,
  ChartSeriesField,
  ChartTooltipField,
  ReferenceLineProps,
  BarProps,
  ChartCurve,
  ChartFillTreatment,
  ChartObservationStatus,
  ChartMargins,
  ChartMotion,
  ChartProps,
  ChartPlotProps,
  ChartToolbarProps,
  ChartReadoutProps,
  ChartOverviewProps,
  ChartBrushProps,
  ChartSeries,
  ChartStyle,
  ChartLineStyle,
  ChartAreaStyle,
  ChartBarStyle,
  ChartBarAppearance,
  ChartBarLayout,
  ChartBars,
  ChartStack,
  ChartStackMode,
  ChartStatus,
  ChartXConfig,
  ChartYConfig,
  ChartSelection,
  ChartAnnotation,
  ChartCompareConfig,
  ChartComparison,
  ChartComparisonSeries,
  ChartComparisonResult,
  ChartComparisonContext,
  ChartController,
  ChartControllerInspection,
  ChartPinOptions,
  ChartControllerSnapshot,
  ChartFocusConfig,
  ChartLiveConfig,
  ChartPercentagePolicy,
  ChartRange,
  ChangeComparisonProps,
  AnnotationsProps,
  ReferenceBandProps,
  LegendProps,
  ChartLegendVariant,
  ChartLegendSwatch,
  CardLegend,
  ChartLoadingStyle,
  ChartEmptyLook,
  ChartEmptyState,
  LineProps,
  NumericXConfig,
  CategoryXConfig,
  PrimitiveProps,
  GridProps,
  TimeXConfig,
  TooltipProps,
  ChartTooltipContext,
  ChartLegendValue,
  XAxisProps,
  YAxisProps,
} from './types';

export { summarizeRange, toChartCsv } from './data/chart-data';
export { funnelRows as summarizeFunnelStages } from './engine/analysis';
export type { FunnelRow as FunnelStageSummary } from './engine/analysis';
export type { ChartSummary, CsvColumn } from './data/chart-data';
export { ChartRangeSummary } from './toolkit/chart-range-summary';
export type { ChartRangeSummaryProps } from './toolkit/chart-range-summary';

export { ChartComponentsProvider } from './cards/range-select';
export type { ChartRangeSelectProps } from './cards/range-select';
export { AreaChartCard } from './cards/area-chart-card';
export type { AreaChartCardProps, CardSeries, CardRange } from './cards/area-chart-card';
export { LineChartCard } from './cards/line-chart-card';
export type { LineChartCardProps } from './cards/line-chart-card';
export { BarChartCard } from './cards/bar-chart-card';
export type { BarChartCardProps } from './cards/bar-chart-card';
export type { CardForecast, CardTarget, CartesianCardProps } from './cards/cartesian-card';
export { StatCard } from './cards/stat-card';
export type { StatCardProps, StatCardChart } from './cards/stat-card';
export type { CardAggregate } from './cards/format';
export { HorizontalBarChartCard } from './cards/horizontal-bar-chart-card';
export type { HorizontalBarChartCardProps } from './cards/horizontal-bar-chart-card';
export { ComboChartCard } from './cards/combo-chart-card';
export type { ComboChartCardProps, ComboLineSeries } from './cards/combo-chart-card';
export { RadialChartCard } from './cards/radial-chart-card';
export type {
  RadialCenterCategory,
  RadialChartCardProps,
  RadialChartCardVariant,
} from './cards/radial-chart-card';
export { ProgressCard } from './cards/progress-card';
export type { ProgressCardProps, ProgressRange } from './cards/progress-card';
export { FunnelChartCard } from './cards/funnel-chart-card';
export type { FunnelChartCardProps } from './cards/funnel-chart-card';
export { HeatmapChartCard } from './cards/heatmap-chart-card';
export { TreemapChartCard } from './cards/treemap-chart-card';
export type { TreemapChartCardProps } from './cards/treemap-chart-card';
export { CalendarHeatmapCard } from './cards/calendar-heatmap-card';
export type { CalendarHeatmapCardProps } from './cards/calendar-heatmap-card';
export { TimelineChartCard } from './cards/timeline-chart-card';
export type { TimelineChartCardProps } from './cards/timeline-chart-card';
export { StripChartCard } from './cards/strip-chart-card';
export type { StripChartCardProps } from './cards/strip-chart-card';
export { SkylineCard } from './cards/skyline-card';
export type { SkylineCardProps } from './cards/skyline-card';
export { BlockCityCard } from './cards/block-city-card';
export type { BlockCityCardProps } from './cards/block-city-card';
export { RidgelineCard } from './cards/ridgeline-card';
export type { RidgelineCardProps } from './cards/ridgeline-card';
export { SpiralYearCard } from './cards/spiral-year-card';
export type { SpiralYearCardProps } from './cards/spiral-year-card';
export type { PrismGridOptions } from './cards/prism-grid';
export { TerrainCard } from './cards/terrain-card';
export type { TerrainCardProps } from './cards/terrain-card';
export { HexCityCard } from './cards/hex-city-card';
export type { HexCityCardProps } from './cards/hex-city-card';
export { VoxelWaffleCard } from './cards/voxel-waffle-card';
export type { VoxelWaffleCardProps } from './cards/voxel-waffle-card';
export type { HeatmapAggregate, HeatmapChartCardProps } from './cards/heatmap-chart-card';
export { ScatterChartCard } from './cards/scatter-chart-card';
export type { ScatterAggregate, ScatterChartCardProps } from './cards/scatter-chart-card';
export { SankeyChartCard } from './cards/sankey-chart-card';
export type { SankeyChartCardProps } from './cards/sankey-chart-card';
export { RadarChartCard } from './cards/radar-chart-card';
export { RangeChartCard } from './cards/range-chart-card';
export type { RangeChartCardProps } from './cards/range-chart-card';
export { BoxPlotCard } from './cards/box-plot-card';
export type { BoxPlotCardProps } from './cards/box-plot-card';
export type { RadarAggregate, RadarChartCardProps } from './cards/radar-chart-card';
export { SlopeChartCard } from './cards/slope-chart-card';
export type { SlopeChartCardProps, SlopeOrder } from './cards/slope-chart-card';
export { ChartEmpty } from './lifecycle/chart-empty';
export type { ChartEmptyProps } from './lifecycle/chart-empty';
export { ActivityRingCard } from './cards/activity-ring-card';
export type { ActivityAggregate, ActivityRingCardProps } from './cards/activity-ring-card';
export {
  ChartCard,
  ChartCardHeader,
  ChartCardTitle,
  ChartCardValue,
  ChartCardDelta,
  ChartCardCaption,
  ChartCardRange,
  CardBadge,
} from './cards/chart-card';
export type {
  ChartCardProps,
  ChartCardHeaderProps,
  ChartCardValueProps,
  ChartCardDeltaProps,
  ChartCardRangeProps,
  ChartCardRangeOption,
  CardBadgeProps,
} from './cards/chart-card';
export type { KeysOfType, NumericKey, TextKey, TimeKey, XKey, XKind } from './cards/keys';

export { ChordLoomCard, type ChordLoomCardProps } from './cards/chord-loom-card';
export { RankRibbonsCard, type RankRibbonsCardProps } from './cards/rank-ribbons-card';
export { EventHelixCard, type EventHelixCardProps } from './cards/event-helix-card';
export { ContourIslandsCard, type ContourIslandsCardProps } from './cards/contour-islands-card';
export { ParallelRibbonsCard, type ParallelRibbonsCardProps } from './cards/parallel-ribbons-card';
export {
  SunburstTerracesCard,
  type SunburstTerracesCardProps,
} from './cards/sunburst-terraces-card';
export {
  ClusterConstellationCard,
  type ClusterConstellationCardProps,
} from './cards/cluster-constellation-card';
export { TernaryPrismCard, type TernaryPrismCardProps } from './cards/ternary-prism-card';
export { WindRoseCard, type WindRoseCardProps } from './cards/wind-rose-card';
export { MarimekkoBlocksCard, type MarimekkoBlocksCardProps } from './cards/marimekko-blocks-card';
export {
  IntersectionTowersCard,
  type IntersectionTowersCardProps,
} from './cards/intersection-towers-card';
export { HorizonFoldsCard, type HorizonFoldsCardProps } from './cards/horizon-folds-card';
export {
  CircleArchipelagoCard,
  type CircleArchipelagoCardProps,
} from './cards/circle-archipelago-card';
export { HelixRibbonsCard, type HelixRibbonsCardProps } from './cards/helix-ribbons-card';
export { VoxelCloudCard, type VoxelCloudCardProps } from './cards/voxel-cloud-card';
export { ArcBridgesCard, type ArcBridgesCardProps } from './cards/arc-bridges-card';
export { StreamgraphCard, type StreamgraphCardProps } from './cards/trend-forms';
export {
  DivergingBarCard,
  MirroredBarCard,
  ComparativeFunnelCard,
  type DivergingBarCardProps,
  type MirroredBarCardProps,
  type ComparativeFunnelCardProps,
} from './cards/comparison-forms';
export { NestedDonutCard, type NestedDonutCardProps } from './cards/composition-forms';
export {
  GoalPacingCard,
  MilestoneProgressCard,
  type GoalPacingCardProps,
  type MilestoneProgressCardProps,
} from './cards/progress-forms';
export {
  ViolinCard,
  CorrelationMatrixCard,
  type ViolinCardProps,
  type CorrelationMatrixCardProps,
} from './cards/distribution-forms';

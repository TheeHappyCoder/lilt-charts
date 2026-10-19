import type { CardDocContent } from './content';
import { activityRingDoc } from './activity-ring';
import { areaDoc } from './area';
import { barDoc } from './bar';
import { boxPlotDoc } from './box-plot';
import { candlestickDoc } from './candlestick';
import { comboDoc } from './combo';
import {
  blockCityDoc,
  hexCityDoc,
  ridgelineDoc,
  skylineDoc,
  spiralYearDoc,
  terrainDoc,
  voxelWaffleDoc,
} from './cool';
import { depthDoc } from './depth';
import { funnelDoc } from './funnel';
import { heatmapDoc } from './heatmap';
import { horizontalBarDoc } from './horizontal-bar';
import { indicatorDoc } from './indicator';
import { lineDoc } from './line';
import { orderBookDoc } from './order-book';
import { portfolioDoc } from './portfolio';
import { priceDoc } from './price';
import { progressDoc } from './progress';
import { radarDoc } from './radar';
import { radialDoc } from './radial';
import { rangeDoc } from './range';
import { sankeyDoc } from './sankey';
import { scatterDoc } from './scatter';
import {
  arcBridgesDoc,
  chordLoomDoc,
  contourIslandsDoc,
  eventHelixDoc,
  parallelRibbonsDoc,
  rankRibbonsDoc,
} from './sculpted';
import { slopeDoc } from './slope';
import {
  circleArchipelagoDoc,
  clusterConstellationDoc,
  helixRibbonsDoc,
  horizonFoldsDoc,
  intersectionTowersDoc,
  marimekkoBlocksDoc,
  sunburstTerracesDoc,
  ternaryPrismDoc,
  voxelCloudDoc,
  windRoseDoc,
} from './spatial';
import { statDoc } from './stat';
import { treemapDoc } from './treemap';

/** Every chart family's documentation, by its page, for the gallery and the home page. */
export const chartDocs: Readonly<Record<string, CardDocContent>> = {
  '/charts/activity-ring': activityRingDoc,
  '/charts/arc-bridges': arcBridgesDoc,
  '/charts/area': areaDoc,
  '/charts/bar': barDoc,
  '/charts/block-city': blockCityDoc,
  '/charts/box-plot': boxPlotDoc,
  '/charts/chord-loom': chordLoomDoc,
  '/charts/circle-archipelago': circleArchipelagoDoc,
  '/charts/cluster-constellation': clusterConstellationDoc,
  '/charts/combo': comboDoc,
  '/charts/contour-islands': contourIslandsDoc,
  '/charts/event-helix': eventHelixDoc,
  '/charts/funnel': funnelDoc,
  '/charts/heatmap': heatmapDoc,
  '/charts/helix-ribbons': helixRibbonsDoc,
  '/charts/hex-city': hexCityDoc,
  '/charts/horizon-folds': horizonFoldsDoc,
  '/charts/horizontal-bar': horizontalBarDoc,
  '/charts/intersection-towers': intersectionTowersDoc,
  '/charts/line': lineDoc,
  '/charts/marimekko-blocks': marimekkoBlocksDoc,
  '/charts/parallel-ribbons': parallelRibbonsDoc,
  '/charts/progress': progressDoc,
  '/charts/radar': radarDoc,
  '/charts/radial': radialDoc,
  '/charts/range': rangeDoc,
  '/charts/rank-ribbons': rankRibbonsDoc,
  '/charts/ridgeline': ridgelineDoc,
  '/charts/sankey': sankeyDoc,
  '/charts/scatter': scatterDoc,
  '/charts/skyline': skylineDoc,
  '/charts/slope': slopeDoc,
  '/charts/spiral-year': spiralYearDoc,
  '/charts/stat-cards': statDoc,
  '/charts/sunburst-terraces': sunburstTerracesDoc,
  '/charts/ternary-prism': ternaryPrismDoc,
  '/charts/terrain': terrainDoc,
  '/charts/treemap': treemapDoc,
  '/charts/voxel-cloud': voxelCloudDoc,
  '/charts/voxel-waffle': voxelWaffleDoc,
  '/charts/wind-rose': windRoseDoc,
  '/finance/candlestick': candlestickDoc,
  '/finance/depth': depthDoc,
  '/finance/indicator': indicatorDoc,
  '/finance/order-book': orderBookDoc,
  '/finance/portfolio': portfolioDoc,
  '/finance/price': priceDoc,
};

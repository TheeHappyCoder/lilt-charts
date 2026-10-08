import type { PropRow } from './content';
import type { CardKind } from './examples';

/** One prop in the Tune tab, with the value the card uses when it is left out. */
export interface TuneSpec {
  prop: string;
  default: string | number | boolean;
  /** Options come from the prop's type in the table unless listed here. */
  options?: readonly (string | number | boolean)[];
}

/**
 * Props: each chart's own props a reader can flip on the stage, so the forms one prop makes
 * (stacked, step, needles, pie) live here rather than as variants. Only what changes how this
 * chart draws or sums up; site-wide styles (palette, depth, legend, axis, hover, loading) belong
 * to the chart style, and data stays the reader's.
 */
/** Bar styles a page can try; `isometric` is depth, which the chart style sets for every chart. */
const barStyles = ['solid', 'segmented', 'needle', 'gradient', 'outline'] as const;
/** Dragging across the plot to read a change: every card that plots values over time. */
const compare: TuneSpec = { prop: 'compare', default: false, options: [false, true, 'badge'] };

export const tuneSpecs: Partial<Record<CardKind, readonly TuneSpec[]>> = {
  treemap: [{ prop: 'drilldown', default: false }],
  streamgraph: [{ prop: 'curve', default: 'smooth' }],
  diverging: [{ prop: 'percent', default: false }],
  nesteddonut: [{ prop: 'hole', default: 0.3, options: [0.15, 0.3, 0.5] }],
  violin: [
    { prop: 'points', default: true },
    { prop: 'scale', default: 'width' },
  ],
  correlation: [{ prop: 'minPairs', default: 3, options: [2, 3, 5, 10] }],
  goalpacing: [{ prop: 'at', default: 60, options: [30, 45, 60, 75] }],
  milestoneprogress: [{ prop: 'current', default: 68, options: [0, 25, 68, 100] }],
  bar: [
    { prop: 'stack', default: false, options: [false, true, 'percent'] },
    { prop: 'barStyle', default: 'solid', options: barStyles },
    { prop: 'corners', default: 'end' },
    { prop: 'tracks', default: false },
    { prop: 'radius', default: 6, options: [0, 3, 6, 10] },
    compare,
  ],
  area: [
    { prop: 'stack', default: false, options: [false, true, 'percent'] },
    { prop: 'curve', default: 'smooth' },
    { prop: 'bleed', default: true },
    compare,
  ],
  line: [
    { prop: 'indexed', default: false },
    { prop: 'curve', default: 'smooth' },
    { prop: 'points', default: false },
    { prop: 'baseline', default: 'auto' },
    { prop: 'bleed', default: true },
    compare,
  ],
  combo: [
    { prop: 'lineScale', default: 'shared' },
    { prop: 'barStyle', default: 'solid', options: barStyles },
    { prop: 'curve', default: 'smooth' },
    { prop: 'points', default: true },
    compare,
  ],
  ranking: [
    { prop: 'sort', default: 'descending' },
    { prop: 'share', default: true },
    { prop: 'rank', default: false },
    { prop: 'barStyle', default: 'inline', options: ['inline', 'track', 'lollipop'] },
  ],
  funnel: [
    { prop: 'curve', default: 'smooth' },
    { prop: 'colors', default: 'stages' },
    { prop: 'tracks', default: false },
  ],
  radial: [
    { prop: 'variant', default: 'donut' },
    { prop: 'sort', default: 'descending' },
    { prop: 'limit', default: 5, options: [3, 5, 8] },
  ],
  chordloom: [
    { prop: 'tilt', default: 0.68, options: [0.45, 0.68, 1] },
    { prop: 'gap', default: 0.06, options: [0.02, 0.06, 0.12] },
  ],
  rankribbons: [
    { prop: 'order', default: 'descending' },
    { prop: 'thickness', default: 10, options: [4, 10, 16] },
  ],
  eventhelix: [
    { prop: 'cycle', default: 'day' },
    { prop: 'pitch', default: 54, options: [32, 54, 80] },
  ],
  contourislands: [
    { prop: 'levels', default: 6, options: [3, 6, 9] },
    { prop: 'bandwidth', default: 0.1, options: [0.06, 0.1, 0.18] },
  ],
  parallelribbons: [{ prop: 'thickness', default: 5, options: [2, 5, 10] }],
  sunburstterraces: [
    { prop: 'tilt', default: 0.62, options: [0.45, 0.62, 1] },
    { prop: 'rise', default: 12, options: [0, 12, 24] },
  ],
  clusterconstellation: [
    { prop: 'yaw', default: 35, options: [-45, 0, 35, 90, 180] },
    { prop: 'elevation', default: 25, options: [15, 25, 55] },
    { prop: 'size', default: 0.09, options: [0.05, 0.09, 0.14] },
  ],
  ternaryprism: [
    { prop: 'tilt', default: 0.65, options: [0.45, 0.65, 1] },
    { prop: 'rise', default: 38, options: [0, 38, 70] },
  ],
  windrose: [{ prop: 'tilt', default: 0.76, options: [0.5, 0.76, 1] }],
  marimekkoblocks: [{ prop: 'gap', default: 0.06, options: [0, 0.06, 0.16] }],
  intersectiontowers: [{ prop: 'sort', default: 'value', options: ['value', 'input'] }],
  horizonfolds: [{ prop: 'bands', default: 3, options: [2, 3, 5] }],
  circlearchipelago: [{ prop: 'padding', default: 0.7, options: [0, 0.7, 2] }],
  helixribbons: [
    { prop: 'yaw', default: 25, options: [-45, 25, 90, 180] },
    { prop: 'elevation', default: 20, options: [15, 20, 45] },
    { prop: 'thickness', default: 13, options: [6, 13, 22] },
    { prop: 'maxGap', default: 0.3, options: [0.15, 0.3, 0.5] },
  ],
  voxelcloud: [
    { prop: 'yaw', default: 35, options: [-45, 0, 35, 90, 180] },
    { prop: 'elevation', default: 25, options: [15, 25, 55] },
    { prop: 'size', default: 0.09, options: [0.05, 0.09, 0.14] },
  ],
  arcbridges: [
    { prop: 'rise', default: 0.85, options: [0.4, 0.65, 0.85] },
    { prop: 'thickness', default: 18, options: [8, 18, 26] },
  ],
  terrain: [
    { prop: 'rise', default: 3, options: [2, 3, 5] },
    { prop: 'smoothing', default: 4, options: [1, 4, 6] },
  ],
  hexcity: [
    { prop: 'arrange', default: 'rank' },
    { prop: 'rise', default: 2, options: [1, 2, 3.5] },
  ],
  voxel: [{ prop: 'footprint', default: 5, options: [4, 5, 7] }],
  skyline: [
    { prop: 'rise', default: 5, options: [3, 5, 8] },
    { prop: 'gap', default: 0.2, options: [0.08, 0.2, 0.36] },
  ],
  blockcity: [
    { prop: 'rise', default: 4, options: [2, 4, 7] },
    { prop: 'gap', default: 0.2, options: [0.08, 0.2, 0.36] },
  ],
  ridgeline: [{ prop: 'overlap', default: 2.2, options: [1, 2.2, 3.5] }],
  heatmap: [
    { prop: 'radius', default: 5, options: [0, 3, 5, 8] },
    { prop: 'gap', default: 4, options: [2, 4, 6] },
    { prop: 'aggregate', default: 'sum' },
  ],
  progress: [{ prop: 'variant', default: 'ring' }],
  scatter: [
    { prop: 'trend', default: false },
    { prop: 'trails', default: false },
  ],
  radar: [
    { prop: 'grid', default: 'polygon' },
    { prop: 'aggregate', default: 'mean' },
  ],
  slope: [
    { prop: 'variant', default: 'slope' },
    { prop: 'sort', default: 'change' },
  ],
  stat: [
    { prop: 'chart', default: 'area' },
    { prop: 'aggregate', default: 'sum' },
  ],
  boxplot: [{ prop: 'outliers', default: true }],
  range: [{ prop: 'display', default: 'bar' }],
  candlestick: [
    { prop: 'display', default: 'candle' },
    { prop: 'scale', default: 'linear' },
    compare,
  ],
  indicator: [
    { prop: 'display', default: 'candle' },
    { prop: 'scale', default: 'linear' },
    compare,
  ],
  price: [{ prop: 'display', default: 'area' }, compare],
  orderbook: [
    { prop: 'flash', default: true },
    { prop: 'levels', default: 8, options: [5, 8, 12] },
  ],
  portfolio: [{ prop: 'drawdown', default: true }, compare],
  activity: [{ prop: 'aggregate', default: 'sum' }],
};

/** A Tune control as the stage draws it: one prop, its default, and the values to try. */
export interface TuneControl {
  prop: string;
  defaultValue: string | number | boolean;
  options: readonly (string | number | boolean)[];
}

/** A chart's Tune controls: listed options, or every value of a boolean or a union of strings. */
export function tuneControls(kind: CardKind, props: readonly PropRow[]): readonly TuneControl[] {
  return (tuneSpecs[kind] ?? []).flatMap((spec) => {
    const type = props.find((row) => row.name === spec.prop)?.type ?? '';
    const options =
      spec.options ??
      (type === 'boolean' ? [false, true] : [...type.matchAll(/'([^']+)'/g)].map((m) => m[1]!));
    return options.length > 1 ? [{ prop: spec.prop, defaultValue: spec.default, options }] : [];
  });
}

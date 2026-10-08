import type { CardKind } from './examples';
import type { PropRow } from './content';

/** Shared public options omitted by the family-specific prose. Kept honest by the API contract test. */
const supplementaryProps: readonly { kinds: readonly CardKind[]; row: PropRow }[] = [
  {
    kinds: [
      'area',
      'range',
      'sunburstterraces',
      'clusterconstellation',
      'ternaryprism',
      'windrose',
      'marimekkoblocks',
      'intersectiontowers',
      'horizonfolds',
      'circlearchipelago',
      'helixribbons',
      'voxelcloud',
    ],
    row: {
      name: 'aggregate',
      type: "'sum' | 'mean' | 'last' | 'max'",
      description:
        'Summary at rest: sum for counts, mean for rates, last for levels, or max for peaks. Area defaults to sum; Range defaults to mean.',
    },
  },
  {
    kinds: ['area', 'combo', 'bar'],
    row: {
      name: 'headlineSeries',
      type: 'key of Row',
      description: 'Numeric series whose value drives the headline instead of the combined total.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'defaultRange',
      type: 'string',
      description: 'Initial range id; defaults to the first supplied range.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'stat',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'depth',
      'orderbook',
      'portfolio',
    ],
    row: {
      name: 'locale',
      type: 'string',
      description: 'Locale used for number formatting. Defaults to en-US.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'stat',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'formatValue',
      type: '(value: number) => string',
      description: 'Custom value text, taking precedence over valueFormat.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'range',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'formatAxisValue',
      type: '(value: number) => string',
      description: 'Custom compact axis value text.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'range',
      'stat',
      'scatter',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'formatX',
      type: '(value: string | number | Date) => string',
      description: 'Custom x label text.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'range',
      'stat',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'xType',
      type: "'category' | 'number' | 'time'",
      description:
        'Override inferred x type. Use time for numeric Unix timestamps in milliseconds.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'range',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'spotlight',
      type: 'boolean',
      description: 'Highlight the inspected position in the plot background. Defaults to true.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'stat',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'portfolio',
    ],
    row: {
      name: 'badge',
      type: 'ReactNode',
      description:
        'Content in the tab above the card. A comparison badge can replace this while a comparison is active.',
    },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'stat',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'depth',
      'orderbook',
      'portfolio',
    ],
    row: { name: 'className', type: 'string', description: 'Additional class on the card frame.' },
  },
  {
    kinds: [
      'area',
      'line',
      'combo',
      'bar',
      'ranking',
      'slope',
      'range',
      'radial',
      'funnel',
      'sankey',
      'stat',
      'progress',
      'activity',
      'heatmap',
      'scatter',
      'radar',
      'boxplot',
      'candlestick',
      'indicator',
      'price',
      'depth',
      'orderbook',
      'portfolio',
    ],
    row: {
      name: 'style',
      type: 'CSSProperties | ChartStyle',
      description: 'Inline styles and scoped --lilt-* chart variables.',
    },
  },
  {
    kinds: [
      'streamgraph',
      'diverging',
      'mirrored',
      'timeline',
      'nesteddonut',
      'treemap',
      'comparativefunnel',
      'goalpacing',
      'milestoneprogress',
      'correlation',
      'calendar',
      'strip',
      'violin',
      'chordloom',
      'rankribbons',
      'eventhelix',
      'contourislands',
      'parallelribbons',
      'sunburstterraces',
      'clusterconstellation',
      'ternaryprism',
      'windrose',
      'marimekkoblocks',
      'intersectiontowers',
      'horizonfolds',
      'circlearchipelago',
      'helixribbons',
      'voxelcloud',
      'arcbridges',
      'terrain',
      'hexcity',
      'voxel',
      'skyline',
      'blockcity',
      'ridgeline',
      'spiral',
    ],
    row: {
      name: 'onKeyDown',
      type: 'KeyboardEventHandler<HTMLElement>',
      description:
        'Keyboard handler on the card frame. Chart inspection also has its own keyboard handling.',
    },
  },
  {
    kinds: ['line', 'bar', 'range', 'boxplot', 'candlestick', 'indicator', 'price', 'portfolio'],
    row: {
      name: 'pillValue',
      type: "'series' | 'stack'",
      description:
        'Read an individual series value (default) or its stacked height. Has no effect when the card has no stacked series.',
    },
  },
  {
    kinds: ['combo'],
    row: {
      name: 'stack',
      type: "boolean | 'percent'",
      description:
        'Stack the bar series with true or show percentage shares with percent. Lines remain unstacked.',
    },
  },
  {
    kinds: ['combo'],
    row: {
      name: 'corners',
      type: "'end' | 'all'",
      description: 'Round the value end (default), or all bar corners.',
    },
  },
  {
    kinds: ['combo'],
    row: {
      name: 'tracks',
      type: 'boolean',
      description: 'Draw full-height tracks behind bars or stacks. Defaults to false.',
    },
  },
  {
    kinds: ['combo', 'bar', 'range', 'boxplot', 'candlestick', 'indicator', 'price', 'portfolio'],
    row: {
      name: 'decimate',
      type: 'boolean',
      description:
        'Defaults to true. Line and Area marks retain at most four observations per pixel column. Other marks draw every row; inspection and summaries always read the full data.',
    },
  },
  {
    kinds: ['combo', 'price', 'portfolio'],
    row: {
      name: 'bleed',
      type: 'boolean',
      description: 'Let marks reach the card edges with a soft fade.',
    },
  },
  {
    kinds: ['range'],
    row: {
      name: 'tiles',
      type: 'boolean',
      description: 'Show the range series value tile beneath the plot. Defaults to false.',
    },
  },
  {
    kinds: [
      'chordloom',
      'rankribbons',
      'eventhelix',
      'parallelribbons',
      'sunburstterraces',
      'clusterconstellation',
      'ternaryprism',
      'windrose',
      'marimekkoblocks',
      'intersectiontowers',
      'horizonfolds',
      'circlearchipelago',
      'helixribbons',
      'voxelcloud',
      'arcbridges',
    ],
    row: {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description:
        'Marker beside each group label, where a group legend is present. Defaults to square.',
    },
  },
  {
    kinds: [
      'sunburstterraces',
      'clusterconstellation',
      'ternaryprism',
      'windrose',
      'marimekkoblocks',
      'intersectiontowers',
      'horizonfolds',
      'circlearchipelago',
      'helixribbons',
      'voxelcloud',
    ],
    row: {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description:
        'Layout for the group legend where the data produces groups. False hides it; defaults to tiles.',
    },
  },
  {
    kinds: ['candlestick', 'indicator', 'price', 'portfolio'],
    row: {
      name: 'headline',
      type: 'number',
      description: 'Override the resting headline; an active range headline takes precedence.',
    },
  },
  {
    kinds: ['indicator'],
    row: {
      name: 'label',
      type: 'string',
      description: 'Names the price series in the hover readout. Defaults to Price.',
    },
  },
  {
    kinds: ['depth'],
    row: {
      name: 'numberStyle',
      type: "'count' | 'pop' | 'slide' | 'roll' | 'flow' | 'scramble'",
      description: 'Headline number animation. Defaults to count; motion settings take precedence.',
    },
  },
];

const heightDefaults: Partial<Record<CardKind, number>> = {
  milestoneprogress: 170,
  terrain: 320,
  skyline: 320,
  blockcity: 300,
  ridgeline: 300,
  spiral: 380,
};

/** Expand paired labels and fill the shared options without duplicating a family's own wording. */
export function completeProps(kind: CardKind, rows: readonly PropRow[]): readonly PropRow[] {
  const expanded = rows.flatMap((row) => row.name.split(' / ').map((name) => ({ ...row, name })));
  const names = new Set(expanded.map((row) => row.name));
  const additions = supplementaryProps
    .filter((item) => item.kinds.includes(kind) && !names.has(item.row.name))
    .map((item) => item.row);
  return [...expanded, ...additions].map((row) => {
    if (row.name === 'height' && heightDefaults[kind] !== undefined)
      return {
        ...row,
        description: `Minimum plot height, default ${heightDefaults[kind]}px. Dense data may expand within the scrollable viewport.`,
      };
    if (row.name === 'aggregate' && kind === 'violin')
      return { ...row, description: 'Summarizes the group medians at rest. Defaults to mean.' };
    if (row.name === 'aggregate' && !['area', 'range'].includes(kind) && additions.includes(row))
      return {
        ...row,
        type: "'sum' | 'mean' | 'max'",
        description:
          'Fallback resting summary. A family-defined summary (such as located point count, hierarchy total, or mean signed value) takes precedence. Use headline to override that summary.',
      };
    if (row.name === 'formatValue' && kind === 'price')
      return {
        ...row,
        description:
          'Custom price text, taking precedence over valueFormat. Comparing instruments with versus uses signed percentages instead.',
      };
    return row;
  });
}

import { violinExample, violinForm } from './expansion-variants';
import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const ms = { style: 'unit', unit: 'millisecond', maximumFractionDigits: 0 } as const;

const boxPlotContent: CardDocContent = {
  forms: [violinForm],
  kind: 'boxplot',
  title: 'Box plot',
  lede: 'Distributions side by side: quartiles, median, whiskers and outliers from raw samples.',
  heroFile: 'LatencyCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Box plot card',
    description: '',
    kind: 'boxplot',
    source: 'regionLatency',
    props: {
      title: 'Response time by region',
      x: 'region',
      samples: 'samples',
      valueFormat: ms,
    },
  }),
  usage: `<BoxPlotCard
  title="Response time by region"
  data={regionLatency}
  x="region"
  samples="samples"
/>`,
  dataShape: `// One row per box with its raw samples; Lilt computes the statistics.
const regionLatency = [
  { region: 'US East', samples: [38, 44, 41, 52, 36] },
  { region: 'Europe', samples: [61, 58, 70, 66, 95] },
];`,
  dataNote:
    'Quartiles use linear interpolation. Whiskers reach the furthest sample within 1.5 times the interquartile range, and samples beyond them draw as outliers, which the axis always includes. The headline is the median of every sample pooled, not an average of medians. `summarizeBox` returns the same statistics, and `BoxPlot` draws precomputed quartiles from any series’ `fields`.',
  hover:
    'Hover a box to read its median in the headline with its quartiles beside it. With `hover="tooltip"`, the panel also lists the whisker ends.',
  props: cartesianProps([
    {
      name: 'samples',
      type: 'key of Row',
      description: 'Field holding each row’s raw samples, as a number array.',
    },
    {
      name: 'label',
      type: 'string',
      description: 'Names the series in hover. Defaults to Median.',
    },
    { name: 'color', type: 'string', description: 'Any CSS color.' },
    {
      name: 'outliers',
      type: 'boolean',
      description: 'Draw samples beyond the whiskers as dots. Defaults to true.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each box as a solid block centered on its group, with whiskers through its middle and the median wrapped around it.',
    },
  ]).filter(
    (row) => !['series', 'target', 'forecast', 'pillSeries', 'tiles', 'ranges'].includes(row.name),
  ),
  examples: [
    violinExample,
    cardExample({
      id: 'no-outliers',
      title: 'Without outliers',
      description: 'Boxes and whiskers only, without the outlier points.',
      kind: 'boxplot',
      source: 'regionLatency',
      props: {
        title: 'Response time by region',
        x: 'region',
        samples: 'samples',
        outliers: false,
        valueFormat: ms,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each box becomes a solid block centered on its group, with whiskers through its middle and the median wrapped around it.',
      kind: 'boxplot',
      source: 'regionLatency',
      props: {
        title: 'Response time by region',
        x: 'region',
        samples: 'samples',
        valueFormat: ms,
        depth: true,
      },
    }),
  ],
};

export const boxPlotDoc = curate(boxPlotContent, { drop: ['no-outliers', 'depth'] });

import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { timelineExample, timelineForm } from './observation-variants';

const rangeContent: CardDocContent = {
  kind: 'range',
  forms: [timelineForm],
  title: 'Range chart',
  lede: 'A low and a high for every observation: floating bars, or error bars around a value.',
  heroFile: 'TemperatureCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Range card',
    description: '',
    kind: 'range',
    source: 'cityTemperature',
    props: {
      title: 'Temperature by month',
      x: 'month',
      low: 'low',
      high: 'high',
      value: 'mean',
      label: 'Mean',
      valueFormat: { style: 'unit', unit: 'celsius', maximumFractionDigits: 1 },
    },
  }),
  usage: `<RangeChartCard
  title="Temperature by month"
  data={temperature}
  x="month"
  low="low"
  high="high"
  value="mean"
/>`,
  dataShape: `// One row per x with the low and high of its range, and optionally a value inside it.
const temperature = [
  { month: 'Jan', low: 2, high: 9, mean: 5.5 },
  { month: 'Feb', low: 3, high: 11, mean: 7 },
];`,
  dataNote:
    'Each range needs `low` at or below `high`; error bars also need the value between them. The headline averages the values by default (`aggregate="mean"`), because ranges rarely add up. Without `value`, the high of each range drives the headline and pills. The same marks are available as `RangeBar` and `ErrorBar` primitives, reading any series’ `fields`.',
  hover:
    'Hover a range to read its low and high beside the value, and to lift it over the dimmed rest.',
  props: cartesianProps([
    { name: 'low', type: 'key of Row', description: 'Numeric field holding each range’s low.' },
    { name: 'high', type: 'key of Row', description: 'Numeric field holding each range’s high.' },
    {
      name: 'value',
      type: 'key of Row',
      description: 'Numeric field holding the measured value. Defaults to high.',
    },
    { name: 'label', type: 'string', description: 'Names the series in hover.' },
    { name: 'color', type: 'string', description: 'Any CSS color.' },
    {
      name: 'display',
      type: "'bar' | 'error'",
      description: 'Floating bars (default), or whiskers around a dot at the value.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each bar as a solid block whose front spans exactly low to high. Error bars stay flat.',
    },
  ]).filter((row) => !['series', 'target', 'forecast', 'pillSeries', 'tiles'].includes(row.name)),
  examples: [
    timelineExample,
    cardExample({
      id: 'error',
      title: 'Error bars',
      description: 'Each variant’s conversion rate with its 95% confidence interval as whiskers.',
      kind: 'range',
      source: 'experimentResults',
      props: {
        title: 'Conversion by variant',
        x: 'variant',
        low: 'low',
        high: 'high',
        value: 'rate',
        label: 'Conversion',
        display: 'error',
        valueFormat: { style: 'percent', maximumFractionDigits: 1 },
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description: 'Each range becomes a solid block whose front spans exactly low to high.',
      kind: 'range',
      source: 'cityTemperature',
      props: {
        title: 'Temperature by month',
        x: 'month',
        low: 'low',
        high: 'high',
        value: 'mean',
        label: 'Mean',
        valueFormat: { style: 'unit', unit: 'celsius', maximumFractionDigits: 1 },
        depth: true,
      },
    }),
  ],
};

export const rangeDoc = curate(rangeContent, { drop: ['depth'] });

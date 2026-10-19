import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const content: CardDocContent = {
  kind: 'yieldcurve',
  title: 'Yield curve',
  lede: 'Yield against maturity, today over earlier curves, with every stretch where longer money yields less shaded.',
  heroFile: 'YieldCurveCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Yield curve',
    description: '',
    kind: 'yieldcurve',
    source: 'curveRanges',
    props: {
      title: 'Treasury curve',
      maturity: 'maturity',
      yield: 'curve',
      label: 'Curve',
      versus: [{ key: 'yearEarlier', label: 'A year earlier' }],
    },
  }),
  usage: `<YieldCurveCard
  title="Treasury curve"
  data={curve}
  maturity="maturity"
  yield="today"
  versus={[{ key: 'yearAgo', label: 'A year ago' }]}
/>`,
  dataShape: `// One row per maturity, shortest first. Yields are in percent: 4.19 is 4.19%.
const curve = [
  { maturity: '2Y', today: 4.38, yearAgo: 5.04 },
  { maturity: '10Y', today: 4.19, yearAgo: 4.41 },
];`,
  dataNote:
    'Maturities are spaced evenly in your order, as curves are usually read. The headline is the spread between two maturities, long minus short: 2Y to 10Y when the curve has both, otherwise its shortest and longest, or the pair you pass as spread. Below zero the curve is inverted and the caption says so. Every stretch where the curve falls as maturities lengthen is shaded. Earlier curves are drawn dashed and read in the tiles.',
  hover:
    'Hover a maturity to read today’s yield in the headline, and each earlier curve’s in its tile. At rest the headline is the spread.',
  props: cartesianProps([
    {
      name: 'maturity',
      type: 'text key of Row',
      description: 'Each maturity’s name, shortest first.',
    },
    { name: 'yield', type: 'numeric key of Row', description: 'Today’s yield, in percent.' },
    { name: 'label', type: 'string', description: 'Names today’s curve. Defaults to Today.' },
    {
      name: 'versus',
      type: '{ key, label?, color? }[]',
      description: 'Earlier curves, drawn dashed.',
    },
    {
      name: 'spread',
      type: '[short, long]',
      description: 'The maturities whose gap is the headline. Defaults to 2Y and 10Y.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Draws today’s curve as a lit tube with a soft shadow.',
    },
  ]).filter(
    (row) => !['x', 'series', 'target', 'forecast', 'compare', 'pillSeries'].includes(row.name),
  ),
  examples: [
    cardExample({
      id: 'normal',
      title: 'Upward',
      description:
        'A normal curve, where longer money yields more: nothing is shaded and the spread from the shortest to the longest is positive.',
      kind: 'yieldcurve',
      source: 'upwardCurve',
      props: { title: 'Upward curve', maturity: 'maturity', yield: 'today' },
    }),
  ],
};

export const yieldCurveDoc = curate(content, {});

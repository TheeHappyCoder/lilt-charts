import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { legendProps, observationPropsFor } from './market-props';

const content: CardDocContent = {
  kind: 'monthlyreturns',
  title: 'Monthly returns',
  lede: 'A factsheet grid: one row per year, every month green or red by its return, and each year compounded at the end.',
  heroFile: 'MonthlyReturnsCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Monthly returns',
    description: '',
    kind: 'monthlyreturns',
    source: 'fundRanges',
    props: { title: 'Fund returns', x: 'month', price: 'nav' },
  }),
  usage: `<MonthlyReturnsCard title="Fund returns" data={closes} x="month" price="nav" />`,
  dataShape: `// Prices over time: daily, weekly or one per month. Months are read in UTC.
const closes = [
  { month: new Date('2024-01-31'), nav: 101.9 },
  { month: new Date('2024-02-29'), nav: 104.2 },
  // …
];`,
  dataNote:
    'Pass prices, not returns: each month returns its last close over the last close of the month before, and the first month returns from its first price. Daily rows work as well as month ends. A month with no rows is drawn hatched and the next month returns from the last close before the gap, so the compounded totals stay true. Years run newest first. Tiles reach full color at scale, an 8% month by default.',
  hover:
    'Hover or focus a month to read its return in the headline, with its year kept lit. At rest the headline is the return over the whole history, compounded. The year column reads each year’s compounded return.',
  props: observationPropsFor(
    [
      {
        name: 'x',
        type: 'key of Row',
        description: 'Date of each row: a Date, an ISO string or a timestamp.',
      },
      { name: 'price', type: 'numeric key of Row', description: 'Price or level at that date.' },
      {
        name: 'total',
        type: 'boolean',
        description: 'Add each year’s compounded return as a last column. Defaults to true.',
      },
      {
        name: 'scale',
        type: 'number',
        description: 'The monthly return at which tiles reach full color. Defaults to 0.08.',
      },
    ],
    { omit: ['color', 'aggregate'], extra: legendProps },
  ),
  examples: [
    cardExample({
      id: 'gap',
      title: 'Missing months',
      description:
        'Two months with no prices are hatched, and the month after returns from the last close before the gap.',
      kind: 'monthlyreturns',
      source: 'fundClosesWithGap',
      props: { title: 'Fund returns', x: 'month', price: 'nav' },
    }),
  ],
};

export const monthlyReturnsDoc = curate(content, {});

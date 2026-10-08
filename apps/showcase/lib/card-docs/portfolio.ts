import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
} as const;

const portfolioContent: CardDocContent = {
  kind: 'portfolio',
  title: 'Portfolio chart',
  lede: 'What an account is worth next to what went into it, and how far it sits below its best.',
  heroFile: 'PortfolioCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Portfolio card',
    description: '',
    kind: 'portfolio',
    source: 'portfolioRanges',
    props: {
      title: 'Portfolio',
      x: 'date',
      value: 'value',
      basis: 'basis',
      valueFormat: usd,
      defaultRange: '1y',
    },
  }),
  usage: `<PortfolioChartCard
  title="Portfolio"
  data={portfolio}
  x="date"
  value="value"
  basis="basis"
  valueFormat={{ style: 'currency', currency: 'USD', notation: 'compact' }}
/>`,
  dataShape: `// One row per day: what the account is worth and what went into it.
const portfolio = [
  { date: new Date('2025-09-26'), value: 25084, basis: 25000 },
  { date: new Date('2025-10-26'), value: 26867, basis: 26250 }, // a deposit raises the basis
];`,
  dataNote:
    'The chip is the gain over basis at the latest row, so deposits never read as returns. Drawdown is how far `value` sits below its highest point so far, zero at every new high; the pane reads the current drawdown and the worst in view. `drawdown` is exported for your own layouts.',
  hover:
    'Hover a day to read its value in the headline; the drawdown pane reads the same day, and the basis draws as a stepped dashed line so each deposit shows as a step.',
  props: cartesianProps([
    { name: 'value', type: 'key of Row', description: 'Numeric field holding the account value.' },
    {
      name: 'basis',
      type: 'key of Row',
      description: 'Numeric field holding the cost basis, drawn as a stepped dashed line.',
    },
    { name: 'label', type: 'string', description: 'Names the value series. Defaults to Value.' },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Lights the value path as a tube; the dashed basis stays flat.',
    },
    {
      name: 'drawdown',
      type: 'boolean',
      description:
        'Shade how far the value sits below its best in a linked pane. Defaults to true.',
    },
    {
      name: 'drawdownHeight',
      type: 'number',
      description: 'Height of the drawdown pane in pixels. Defaults to 64.',
    },
  ]).filter(
    (row) =>
      !['series', 'headline', 'tiles', 'target', 'forecast', 'pillSeries'].includes(row.name),
  ),
  examples: [
    cardExample({
      id: 'flat',
      title: 'Without drawdown',
      description: 'Value and basis alone, for a compact dashboard tile.',
      kind: 'portfolio',
      source: 'portfolio',
      props: {
        title: 'Retirement account',
        x: 'date',
        value: 'value',
        basis: 'basis',
        drawdown: false,
        height: 180,
        valueFormat: usd,
      },
    }),
  ],
};

export const portfolioDoc = curate(portfolioContent, { drop: ['flat'] });

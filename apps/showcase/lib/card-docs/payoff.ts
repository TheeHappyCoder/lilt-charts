import { curate, loadingProps, type CardDocContent } from './content';
import { legsExample } from './examples';

const content: CardDocContent = {
  kind: 'payoff',
  title: 'Options payoff',
  lede: 'An options strategy at expiry: profit or loss wherever the price ends, with today’s price and every breakeven marked.',
  heroFile: 'PayoffCard.tsx',
  hero: legsExample({
    id: 'hero',
    title: 'Payoff',
    description: '',
    kind: 'payoff',
    props: {
      title: 'Bull call spread',
      spot: 204,
      legs: [
        { type: 'call', strike: 200, premium: 9.4 },
        { type: 'call', side: 'short', strike: 220, premium: 3.1 },
      ],
    },
  }),
  usage: `<PayoffChartCard
  title="Bull call spread"
  spot={204}
  legs={[
    { type: 'call', strike: 200, premium: 9.4 },
    { type: 'call', side: 'short', strike: 220, premium: 3.1 },
  ]}
/>`,
  dataShape: `// Each leg: a call, put, or stock; long (default) or short; its strike, premium and quantity.
const legs = [
  { type: 'call', strike: 200, premium: 9.4 },
  { type: 'call', side: 'short', strike: 220, premium: 3.1, quantity: 1 },
];`,
  dataNote:
    'Every leg expires together. A long option pays its premium and a short one receives it; option quantities are contracts of multiplier shares (100 by default), and stock quantities are shares held from strike. Breakevens are found exactly where the curve crosses zero. Max profit or max loss reads Unlimited when it keeps growing as the price rises. `payoffAt` and `payoffSummary` return the same numbers for your own layouts.',
  hover:
    'Hover a price to read the strategy’s outcome there in the headline. At rest the headline reads the outcome at today’s price, and the stats keep the best and worst outcomes and the breakevens.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Optional visible title. Also names the chart unless aria-label is set.',
    },
    {
      name: 'header',
      type: 'boolean',
      description: 'False removes the title, headline and stats. Defaults to true.',
    },
    {
      name: 'aria-label',
      type: 'string',
      description: 'Accessible name, independent of the visible title.',
    },
    {
      name: 'legs',
      type: '{ type, side?, strike, premium?, quantity? }[]',
      description: 'The positions, all expiring together.',
    },
    { name: 'spot', type: 'number', description: 'Today’s price: marked, and read at rest.' },
    {
      name: 'priceRange',
      type: '[low, high]',
      description: 'Prices to draw. Defaults to 30% around the strikes and spot.',
    },
    { name: 'multiplier', type: 'number', description: 'Shares per contract. Defaults to 100.' },
    {
      name: 'valueFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Money format for profit and loss. Whole US dollars by default.',
    },
    {
      name: 'priceFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Price format for the underlying. Defaults to valueFormat with cents.',
    },
    { name: 'locale', type: 'string', description: 'Locale for numbers; defaults to en-US.' },
    { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 220.' },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Draws the payoff line as a lit tube with a soft shadow.',
    },
    {
      name: 'axis',
      type: "'minimal' | 'dots' | 'inline' | 'ruler' | 'classic' | 'segmented'",
      description: 'Axis preset.',
    },
    {
      name: 'background',
      type: "'dots' | 'grid' | 'lines' | 'none'",
      description: 'Texture behind the plot.',
    },
    { name: 'hoverStyle', type: "'soft' | 'solid' | 'accent'", description: 'How the pills look.' },
    {
      name: 'surface',
      type: "'elevated' | 'outline' | 'ghost'",
      description: 'Card treatment.',
    },
    {
      name: 'numberStyle',
      type: "'count' | 'pop' | 'slide' | 'roll' | 'flow' | 'scramble'",
      description: 'Headline number animation. Count by default.',
    },
    ...loadingProps,
    { name: 'motion', type: "'auto' | 'none'", description: 'None turns off decorative motion.' },
    { name: 'className', type: 'string', description: 'Class on the card frame.' },
    {
      name: 'style',
      type: 'CSSProperties | ChartStyle',
      description: 'Inline styles and scoped chart variables.',
    },
  ],
  examples: [
    legsExample({
      id: 'condor',
      title: 'Iron condor',
      description:
        'Four legs that profit while the price stays in a range: two breakevens, and a loss capped on both sides.',
      kind: 'payoff',
      props: {
        title: 'Iron condor',
        spot: 204,
        legs: [
          { type: 'put', strike: 180, premium: 1.6 },
          { type: 'put', side: 'short', strike: 190, premium: 3.4 },
          { type: 'call', side: 'short', strike: 220, premium: 3.1 },
          { type: 'call', strike: 230, premium: 1.3 },
        ],
      },
    }),
    legsExample({
      id: 'covered',
      title: 'Covered call',
      description:
        'A hundred shares with a call sold against them: the premium cushions a fall, and the upside stops at the strike.',
      kind: 'payoff',
      props: {
        title: 'Covered call',
        spot: 204,
        legs: [
          { type: 'stock', strike: 196, quantity: 100 },
          { type: 'call', side: 'short', strike: 215, premium: 4.2 },
        ],
      },
    }),
  ],
};

export const payoffDoc = curate(content, {});

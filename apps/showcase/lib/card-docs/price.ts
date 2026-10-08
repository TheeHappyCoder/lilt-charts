import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const priceContent: CardDocContent = {
  kind: 'price',
  title: 'Price chart',
  lede: 'The latest price in large type, how far it moved over the period, and the path it took.',
  heroFile: 'PriceCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Price card',
    description: '',
    kind: 'price',
    source: 'tokenPriceRanges',
    props: {
      title: 'Solana price',
      symbol: 'SOL',
      name: 'Solana',
      x: 'date',
      price: 'sol',
      defaultRange: '3m',
    },
  }),
  usage: `<PriceChartCard
  title="Solana price"
  symbol="SOL"
  name="Solana"
  data={prices}
  x="date"
  price="sol"
/>`,
  dataShape: `// One row per day with a price field; other fields can hold other instruments.
const prices = [
  { date: new Date('2026-06-28'), sol: 178.33, eth: 3114.78 },
  // …one row per day
];`,
  dataNote:
    'The headline is the latest price and the chip the change over the period, with the change in money beside it. The area is green when the period rose and red when it fell. With `versus`, every instrument is rebased to its change since the first row, so a $250 token and a $3,000 token share one axis.',
  hover:
    'Hover a day to move the headline to its price. With `versus`, the tiles read each instrument’s change at that day and the pill follows the line nearest the pointer.',
  props: cartesianProps([
    { name: 'price', type: 'key of Row', description: 'Numeric field holding the price or level.' },
    { name: 'symbol', type: 'string', description: 'Ticker in the heading, such as SOL.' },
    { name: 'name', type: 'string', description: 'Full name beside the ticker.' },
    { name: 'icon', type: 'ReactNode', description: 'A logo or glyph before the ticker.' },
    { name: 'display', type: "'area' | 'line'", description: 'Area (default) or line.' },
    {
      name: 'versus',
      type: '{ key, label?, color? }[]',
      description: 'Other instruments to compare, all rebased to percent change.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description: 'Draws the price line as a lit tube with a soft shadow.',
    },
  ]).filter(
    (row) =>
      !['series', 'headline', 'tiles', 'target', 'forecast', 'pillSeries'].includes(row.name),
  ),
  examples: [
    cardExample({
      id: 'versus',
      title: 'Compared',
      description: 'Three tokens rebased to their change over the quarter, on one axis.',
      kind: 'price',
      source: 'tokenPrices',
      props: {
        title: 'Majors',
        symbol: 'SOL',
        name: 'vs ETH and BTC',
        x: 'date',
        price: 'sol',
        versus: [
          { key: 'eth', label: 'ETH' },
          { key: 'btc', label: 'BTC' },
        ],
      },
    }),
    cardExample({
      id: 'line',
      title: 'Line',
      description: 'A quieter line for dense dashboards, priced in dollars.',
      kind: 'price',
      source: 'tokenPrices',
      props: {
        title: 'Ether price',
        symbol: 'ETH',
        name: 'Ethereum',
        x: 'date',
        price: 'eth',
        display: 'line',
        height: 160,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description: 'The price line becomes a lit tube with a soft shadow.',
      kind: 'price',
      source: 'tokenPrices',
      props: {
        title: 'Ether price',
        symbol: 'ETH',
        name: 'Ethereum',
        x: 'date',
        price: 'eth',
        display: 'line',
        height: 160,
        depth: true,
      },
    }),
  ],
};

export const priceDoc = curate(priceContent, { drop: ['line', 'depth'] });

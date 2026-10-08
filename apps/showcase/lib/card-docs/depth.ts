import { loadingProps, curate, type CardDocContent } from './content';
import { bookExample } from './examples';

const usd = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

const depthContent: CardDocContent = {
  kind: 'depth',
  title: 'Depth chart',
  lede: 'How much could trade at each price: buying on the left, selling on the right, and the gap between.',
  heroFile: 'DepthCard.tsx',
  hero: bookExample({
    id: 'hero',
    title: 'Depth card',
    description: '',
    kind: 'depth',
    source: 'solBook',
    props: { title: 'SOL · USDC', valueFormat: usd },
  }),
  usage: `<DepthChartCard
  title="SOL · USDC"
  bids={book.bids}
  asks={book.asks}
  valueFormat={{ style: 'currency', currency: 'USD' }}
/>`,
  dataShape: `// Resting orders: a price and the size at it, in any order.
const book = {
  bids: [
    { price: 182.28, size: 1050 },
    { price: 182.03, size: 626 },
  ],
  asks: [
    { price: 182.53, size: 356 },
    { price: 182.78, size: 1793 },
  ],
};

<DepthChartCard title="SOL · USDC" bids={book.bids} asks={book.asks} />`,
  dataNote:
    'Bids accumulate from the best (highest) bid down and asks from the best (lowest) ask up, so each curve shows how much size rests between the mid and a price. Orders at the same price merge. A crossed book, with a bid at or above an ask, throws rather than drawing a misleading spread. `depthLevels` returns the same cumulative levels, mid and spread for your own layouts.',
  hover:
    'Hover a price to see how much could trade on that side before reaching it. The header keeps the midpoint, and the stats keep the gap and the totals on each side.',
  props: [
    {
      name: 'header',
      type: 'boolean',
      description: 'False removes the title, midpoint and summary stats. Defaults to true.',
    },
    {
      name: 'aria-label',
      type: 'string',
      description: 'Accessible name, independent of the visible title.',
    },
    {
      name: 'title',
      type: 'string',
      description: 'Optional visible title. Also names the chart unless aria-label is set.',
    },
    { name: 'bids', type: '{ price, size }[]', description: 'Resting buy orders, in any order.' },
    { name: 'asks', type: '{ price, size }[]', description: 'Resting sell orders, in any order.' },
    {
      name: 'valueFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Price format for the mid, spread and axis. Defaults to US dollars.',
    },
    {
      name: 'sizeFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Size format for depth. Compact numbers by default.',
    },
    { name: 'height', type: 'number', description: 'Plot height in pixels. Defaults to 220.' },
    {
      name: 'background',
      type: "'dots' | 'grid' | 'lines' | 'none'",
      description: 'Texture behind the depth areas.',
    },
    {
      name: 'axis',
      type: "'minimal' | 'dots' | 'inline' | 'ruler' | 'classic' | 'segmented'",
      description: 'Axis preset.',
    },
    {
      name: 'hoverStyle',
      type: "'soft' | 'solid' | 'accent'",
      description: 'How the pills look.',
    },
    {
      name: 'surface',
      type: "'elevated' | 'outline' | 'ghost'",
      description: 'Card treatment.',
    },
    ...loadingProps,
    { name: 'motion', type: "'auto' | 'none'", description: 'None turns off decorative motion.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        "Draws both sides' edges as lit tubes with a soft shadow; every step keeps its exact price.",
    },
  ],
  examples: [
    bookExample({
      id: 'depth',
      title: '3D',
      description: "Both sides' edges become lit tubes; every step keeps its exact price.",
      kind: 'depth',
      source: 'ethBook',
      props: {
        title: 'ETH · USDC',
        axis: 'classic',
        valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 1 },
        depth: true,
      },
    }),
  ],
};

export const depthDoc = curate(depthContent, { drop: ['depth'] });

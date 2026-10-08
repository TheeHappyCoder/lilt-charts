import { loadingProps, curate, type CardDocContent } from './content';
import { bookExample } from './examples';

const orderBookContent: CardDocContent = {
  kind: 'orderbook',
  title: 'Order book',
  lede: 'Resting orders level by level, the best prices meeting in the middle.',
  heroFile: 'OrderBookCard.tsx',
  hero: bookExample({
    id: 'hero',
    title: 'Order book',
    description: '',
    kind: 'orderbook',
    source: 'solBook',
    props: { title: 'SOL order book' },
  }),
  usage: `<OrderBook title="SOL order book" bids={book.bids} asks={book.asks} />`,
  dataShape: `const book = {
  bids: [{ price: 182.28, size: 1050 } /* …resting buy orders */],
  asks: [{ price: 182.53, size: 356 } /* …resting sell orders */],
};

<OrderBook title="SOL order book" bids={book.bids} asks={book.asks} levels={8} />`,
  dataNote:
    'The ladder shows the best `levels` on each side: asks above, highest first, and bids below, so the best prices meet at the spread row. Each level’s bar is its running total from the spread outward. Pass new `bids` and `asks` as the book updates and changed levels flash once; reduced motion turns that off.',
  hover:
    'The ladder is a real table: a screen reader announces the caption, the asks, the spread and the bids row by row, with price as each row’s header.',
  props: [
    {
      name: 'header',
      type: 'boolean',
      description: 'False removes the caption; column headings remain. Defaults to true.',
    },
    {
      name: 'aria-label',
      type: 'string',
      description: 'Accessible name, independent of the visible title.',
    },
    {
      name: 'title',
      type: 'string',
      description: 'Optional visible table caption. Also names the card unless aria-label is set.',
    },
    { name: 'bids', type: '{ price, size }[]', description: 'Resting buy orders, in any order.' },
    { name: 'asks', type: '{ price, size }[]', description: 'Resting sell orders, in any order.' },
    {
      name: 'levels',
      type: 'number',
      description: 'Levels shown on each side of the spread. Defaults to 8.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description: "Draws each level's bar as a solid block with a lit roof and a shaded end.",
    },
    {
      name: 'valueFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Price format. Two decimals by default.',
    },
    {
      name: 'sizeFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Size format. Compact numbers by default.',
    },
    {
      name: 'flash',
      type: 'boolean',
      description: 'Highlight levels whose size changed. Defaults to true.',
    },
    {
      name: 'surface',
      type: "'elevated' | 'outline' | 'ghost'",
      description: 'Card treatment.',
    },
    ...loadingProps,
    { name: 'motion', type: "'auto' | 'none'", description: 'None turns off decorative motion.' },
  ],
  examples: [
    bookExample({
      id: 'shallow',
      title: 'Five levels',
      description: 'A compact ladder with the five best levels a side, priced in dollars.',
      kind: 'orderbook',
      source: 'ethBook',
      props: {
        title: 'ETH order book',
        levels: 5,
        valueFormat: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
      },
    }),
    bookExample({
      id: 'depth',
      title: '3D',
      description: "Each level's total becomes a solid block behind its row.",
      kind: 'orderbook',
      source: 'ethBook',
      props: {
        title: 'ETH order book',
        levels: 5,
        valueFormat: { style: 'currency', currency: 'USD', minimumFractionDigits: 2 },
        depth: true,
      },
    }),
  ],
};

export const orderBookDoc = curate(orderBookContent, { drop: ['shallow', 'depth'] });

import { curate, loadingProps, type CardDocContent } from './content';
import { cardExample } from './examples';
import { usd } from './market-props';

const content: CardDocContent = {
  kind: 'watchlist',
  title: 'Watchlist',
  lede: 'Every instrument you follow on one card: its path today, where it sits in its range, its price and its move.',
  heroFile: 'WatchlistCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Watchlist',
    description: '',
    kind: 'watchlist',
    source: 'watchlistRanges',
    props: {
      title: 'Watchlist',
      symbol: 'symbol',
      name: 'name',
      price: 'price',
      change: 'change',
      history: 'history',
      low: 'low',
      high: 'high',
      valueFormat: usd,
    },
  }),
  usage: `<WatchlistCard
  title="Watchlist"
  ranges={[
    { id: '1d', label: '1D', data: today },
    { id: '1w', label: '1W', data: week },
  ]}
  symbol="symbol"
  name="name"
  price="price"
  change="change"
  history="history"
  low="low"
  high="high"
/>`,
  dataShape: `// One row per instrument. history is recent prices, oldest first.
const quotes = [
  {
    symbol: 'SOL',
    name: 'Solana',
    price: 205.56,
    change: 0.0424,
    history: [197.2, 199.1, 198.4, 203.8, 205.56],
    low: 196.6,
    high: 207.1,
  },
];`,
  dataNote:
    'change is a fraction of the price at the start of the period: 0.0424 shows +4.2%. The sparkline is drawn green or red by that change, and history only needs to be in order; missing points are skipped. With low and high, a range shows where the price sits between them. Symbols identify rows, so keep them unique. When prices stream in, pass new rows: each price rolls to its new value rather than redrawing the list.',
  hover:
    'Switching the period rolls every price and move to its new value, reshapes each sparkline and slides each range tick. Hover or focus a row to read that instrument in the headline: its price and move. At rest the headline is the average move, with how many rose and fell. The Symbol, Price and Change headings sort the list; press one again to return to your order.',
  props: [
    {
      name: 'title',
      type: 'string',
      description: 'Optional visible title. Also names the list unless aria-label is set.',
    },
    {
      name: 'header',
      type: 'boolean',
      description: 'False removes the title and headline. Defaults to true.',
    },
    {
      name: 'aria-label',
      type: 'string',
      description: 'Accessible name, independent of the visible title.',
    },
    {
      name: 'data',
      type: 'Row[]',
      description: 'One row per instrument. Omit when using ranges.',
    },
    { name: 'range', type: 'string', description: 'Static period label, e.g. Today.' },
    {
      name: 'ranges',
      type: '{ id, label, data }[]',
      description:
        'Period select. Each period swaps the rows: prices and moves roll, sparklines reshape and range ticks slide.',
    },
    { name: 'defaultRange', type: 'string', description: 'Initial period id.' },
    { name: 'symbol', type: 'text key of Row', description: 'Ticker, unique per row.' },
    { name: 'name', type: 'text key of Row', description: 'Full name under the ticker.' },
    { name: 'price', type: 'numeric key of Row', description: 'Latest price.' },
    {
      name: 'change',
      type: 'numeric key of Row',
      description: 'Fractional move over the period: 0.012 is up 1.2%.',
    },
    {
      name: 'history',
      type: 'key of Row holding number[]',
      description: 'Recent prices, oldest first, drawn as a sparkline.',
    },
    { name: 'low', type: 'numeric key of Row', description: 'Period low, for the range column.' },
    { name: 'high', type: 'numeric key of Row', description: 'Period high, for the range column.' },
    {
      name: 'sort',
      type: "'none' | 'symbol' | 'price' | 'change'",
      description: 'Initial order. None (default) keeps yours.',
    },
    {
      name: 'sortable',
      type: 'boolean',
      description: 'Let readers sort from the column headings. Defaults to true.',
    },
    {
      name: 'valueFormat',
      type: 'Intl.NumberFormatOptions',
      description: 'Price format. Defaults to US dollars with cents.',
    },
    { name: 'locale', type: 'string', description: 'Locale for numbers; defaults to en-US.' },
    {
      name: 'surface',
      type: "'elevated' | 'outline' | 'ghost'",
      description: 'Card treatment.',
    },
    {
      name: 'palette',
      type: "'iris' | 'cobalt' | 'emerald'",
      description: 'Accent colors inside the card.',
    },
    {
      name: 'numberStyle',
      type: "'count' | 'pop' | 'slide' | 'roll' | 'flow' | 'scramble'",
      description: 'How prices and the headline animate when they change. Count by default.',
    },
    ...loadingProps,
    { name: 'motion', type: "'auto' | 'none'", description: 'None turns off decorative motion.' },
    { name: 'className', type: 'string', description: 'Class on the card frame.' },
    {
      name: 'style',
      type: 'CSSProperties | ChartStyle',
      description: 'Inline styles and scoped chart variables.',
    },
    {
      name: 'onSelectionChange',
      type: '(row | null) => void',
      description: 'Reports the hovered or focused row, or null when the pointer leaves.',
    },
  ],
  examples: [
    cardExample({
      id: 'stocks',
      title: 'Stocks, by move',
      description: 'Four large caps with no range column, sorted with the biggest gainer first.',
      kind: 'watchlist',
      source: 'stockWatchlist',
      props: {
        title: 'Large caps',
        symbol: 'symbol',
        name: 'name',
        price: 'price',
        change: 'change',
        history: 'history',
        sort: 'change',
        valueFormat: usd,
      },
    }),
  ],
};

export const watchlistDoc = curate(content, {});

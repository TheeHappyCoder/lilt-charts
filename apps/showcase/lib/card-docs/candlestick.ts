import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

const candlestickContent: CardDocContent = {
  kind: 'candlestick',
  title: 'Candlestick chart',
  lede: 'The range and direction of every period at a glance, with trading volume underneath.',
  heroFile: 'MarketCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Market card',
    description: '',
    kind: 'candlestick',
    source: 'candleRanges',
    props: {
      title: 'SOL · USDC',
      x: 'date',
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
      volume: 'volume',
      valueFormat: usd,
      defaultRange: '3m',
    },
  }),
  usage: `<CandlestickChartCard
  title="SOL · USDC"
  data={candles}
  x="date"
  open="open"
  high="high"
  low="low"
  close="close"
  volume="volume"
  valueFormat={{ style: 'currency', currency: 'USD' }}
/>`,
  dataShape: `// One row per period: its open, high, low, close, and optionally volume.
const candles = [
  { date: new Date('2026-08-20'), open: 243.1, high: 246.4, low: 241.8, close: 245.2, volume: 2410000 },
  { date: new Date('2026-08-21'), open: 245.2, high: 247.0, low: 243.9, close: 244.6, volume: 1980000 },
];

<CandlestickChartCard
  title="SOL · USDC"
  data={candles}
  x="date"       // a Date or number field
  open="open"    // numeric fields; TypeScript rejects anything else
  high="high"
  low="low"
  close="close"
  volume="volume" // optional: adds a linked volume pane
/>`,
  dataNote:
    'Each row needs a low at or below its open and close, and a high at or above them; Lilt throws on a candle that breaks that rule rather than drawing it wrong. The headline is the latest close and the chip is the change from the first open to the last close. A rising candle (close at or above open) takes `--lilt-candle-up`, a falling one `--lilt-candle-down`; both follow your positive and negative tokens. Every candle draws into a handful of paths, so years of history stay fast.',
  rangesUsage: `<CandlestickChartCard
  title="SOL · USDC"
  ranges={[
    { id: '1m', label: '1M', data: lastMonth },
    { id: '3m', label: '3M', data: lastQuarter },
    { id: '1y', label: '1Y', data: lastYear },
  ]}
  defaultRange="3m"
  x="date"
  open="open"
  high="high"
  low="low"
  close="close"
/>`,
  hover:
    'Hover a candle to move the headline to its close and read its open, high and low beside the date. The crosshair runs through the volume pane too, and hover there reads the same day.',
  props: cartesianProps([
    { name: 'open', type: 'key of Row', description: 'Numeric field holding each period’s open.' },
    { name: 'high', type: 'key of Row', description: 'Numeric field holding each period’s high.' },
    { name: 'low', type: 'key of Row', description: 'Numeric field holding each period’s low.' },
    {
      name: 'close',
      type: 'key of Row',
      description: 'Numeric field holding each period’s close. Drives the headline and pills.',
    },
    {
      name: 'volume',
      type: 'key of Row',
      description:
        'Numeric field holding traded volume, drawn as a linked pane colored by direction.',
    },
    {
      name: 'display',
      type: "'candle' | 'hollow' | 'ohlc' | 'area'",
      description:
        'Filled candles (default), hollow rising bodies, OHLC bars, or an area of the close colored by direction.',
    },
    {
      name: 'scale',
      type: "'linear' | 'log'",
      description: 'Log spaces prices by ratio, so a doubling looks the same at any level.',
    },
    { name: 'label', type: 'string', description: 'Names the price in hover. Defaults to Price.' },
    {
      name: 'live',
      type: 'boolean',
      description: 'Follow the newest candle as rows arrive, with a control to return to it.',
    },
    {
      name: 'volumeHeight',
      type: 'number',
      description: 'Height of the volume pane in pixels. Defaults to 64.',
    },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws each body as a solid block whose front spans exactly open to close. OHLC bars and the area stay flat.',
    },
  ]).filter(
    (row) =>
      !['series', 'headline', 'tiles', 'target', 'forecast', 'pillSeries'].includes(row.name),
  ),
  examples: [
    cardExample({
      id: 'hollow',
      title: 'Hollow candles',
      description:
        'Rising bodies are outlined and falling ones filled, so direction reads without color.',
      kind: 'candlestick',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        display: 'hollow',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'ohlc',
      title: 'OHLC bars',
      description: 'A tick left for the open and right for the close, the classic bar chart.',
      kind: 'candlestick',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        display: 'ohlc',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'area',
      title: 'Price area',
      description:
        'The close alone as an area, green or red by the period’s direction, with volume beneath.',
      kind: 'candlestick',
      source: 'candleRanges',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        volume: 'volume',
        display: 'area',
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'log',
      title: 'Log scale',
      description:
        'Six years of weekly candles on a log axis, so early moves stay as readable as recent ones.',
      kind: 'candlestick',
      source: 'btcWeekly',
      props: {
        title: 'BTC · USD weekly',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        scale: 'log',
        valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description:
        'Each body becomes a solid block whose front spans exactly open to close, with the wick through its middle.',
      kind: 'candlestick',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        valueFormat: usd,
        depth: true,
      },
    }),
  ],
};

export const candlestickDoc = curate(candlestickContent, {
  drop: ['area', 'hollow', 'ohlc', 'depth'],
  style: { log: { display: 'hollow' } },
  titles: { log: 'Six years on a log scale' },
});

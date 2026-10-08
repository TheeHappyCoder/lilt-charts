import { cartesianProps, curate, type CardDocContent } from './content';
import { cardExample } from './examples';

const usd = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

const indicatorContent: CardDocContent = {
  kind: 'indicator',
  title: 'Indicator chart',
  lede: 'Price on top and oscillators underneath, all reading the same day as you hover.',
  heroFile: 'IndicatorCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Indicator card',
    description: '',
    kind: 'indicator',
    source: 'candleRanges',
    props: {
      title: 'SOL · USDC',
      x: 'date',
      open: 'open',
      high: 'high',
      low: 'low',
      close: 'close',
      overlays: ['sma'],
      panes: ['rsi', 'macd'],
      valueFormat: usd,
      defaultRange: '3m',
    },
  }),
  usage: `<IndicatorChartCard
  title="SOL · USDC"
  data={candles}
  x="date"
  close="close"
  open="open"
  high="high"
  low="low"
  overlays={['sma']}
  panes={['rsi', 'macd']}
/>`,
  dataShape: `// The same rows as a candlestick card. Indicators are computed from the close.
const candles = [
  { date: new Date('2026-08-20'), open: 243.1, high: 246.4, low: 241.8, close: 245.2, volume: 2410000 },
  // …one row per period
];

<IndicatorChartCard
  title="SOL · USDC"
  data={candles}
  x="date"
  close="close"            // the only field indicators need
  overlays={[{ kind: 'ema', period: 21 }, 'bollinger']}
  panes={['rsi', { kind: 'macd', fast: 12, slow: 26, signal: 9 }]}
/>`,
  dataNote:
    'Every indicator derives from `close`: simple and exponential averages, Bollinger bands (20 periods, two deviations), RSI with Wilder’s smoothing (14 by default), and MACD (12, 26, 9). Each needs a warm-up window, so it starts where enough rows exist rather than inventing early values. Without `open`, `high` and `low` the price draws as a line. The same helpers (`sma`, `ema`, `rsi`, `macd`, `bollinger`) are exported for your own panes.',
  hover:
    'The crosshair runs through every pane. The headline reads the hovered close with its open, high and low; each pane’s corner reads its own value, such as RSI 54.5 or MACD with its signal, and returns to the latest reading at rest.',
  props: cartesianProps([
    {
      name: 'close',
      type: 'key of Row',
      description: 'Numeric field holding each close. Every indicator derives from it.',
    },
    {
      name: 'open',
      type: 'key of Row',
      description: 'With high and low, draws the price as candles.',
    },
    { name: 'high', type: 'key of Row', description: 'Each period’s high.' },
    { name: 'low', type: 'key of Row', description: 'Each period’s low.' },
    { name: 'volume', type: 'key of Row', description: 'Traded volume, for a volume pane.' },
    {
      name: 'display',
      type: "'candle' | 'hollow' | 'ohlc' | 'line'",
      description:
        'How the price draws. Candles when open, high and low are set; otherwise a line.',
    },
    {
      name: 'overlays',
      type: "('sma' | 'ema' | 'bollinger' | { kind, period?, deviations? })[]",
      description: 'Lines over the price. Periods default to 20.',
    },
    {
      name: 'panes',
      type: "('rsi' | 'macd' | 'volume' | { kind, … })[]",
      description: 'Linked panes under the price, top to bottom. Defaults to RSI then MACD.',
    },
    {
      name: 'paneHeight',
      type: 'number',
      description: 'Height of each pane in pixels. Defaults to 72.',
    },
    { name: 'scale', type: "'linear' | 'log'", description: 'Price axis scale.' },
    { name: 'live', type: 'boolean', description: 'Follow the newest row as it arrives.' },
    {
      name: 'depth',
      type: 'boolean',
      description:
        'Draws price and indicator lines as lit tubes. Bands and dashed lines stay flat.',
    },
  ]).filter(
    (row) =>
      !['series', 'headline', 'tiles', 'target', 'forecast', 'pillSeries'].includes(row.name),
  ),
  examples: [
    cardExample({
      id: 'bollinger',
      title: 'Bollinger bands',
      description:
        'A 20-period average with a band two deviations either side, over hollow candles.',
      kind: 'indicator',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        display: 'hollow',
        overlays: ['bollinger'],
        panes: ['rsi'],
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'line-volume',
      title: 'Line with volume',
      description:
        'The close as a line with fast and slow averages, and volume under it instead of oscillators.',
      kind: 'indicator',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        close: 'close',
        volume: 'volume',
        display: 'line',
        overlays: [
          { kind: 'ema', period: 9 },
          { kind: 'sma', period: 30 },
        ],
        panes: ['volume'],
        valueFormat: usd,
      },
    }),
    cardExample({
      id: 'depth',
      title: '3D',
      description: 'Price and indicator lines become lit tubes; the band stays flat.',
      kind: 'indicator',
      source: 'solQuarter',
      props: {
        title: 'SOL · USDC',
        x: 'date',
        open: 'open',
        high: 'high',
        low: 'low',
        close: 'close',
        display: 'hollow',
        overlays: ['bollinger'],
        panes: ['rsi'],
        valueFormat: usd,
        depth: true,
      },
    }),
  ],
};

export const indicatorDoc = curate(indicatorContent, {
  drop: ['depth'],
  style: { bollinger: { display: 'hollow' } },
});

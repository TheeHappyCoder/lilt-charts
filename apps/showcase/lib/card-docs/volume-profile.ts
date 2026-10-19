import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { observationPropsFor, usd } from './market-props';

const content: CardDocContent = {
  kind: 'volumeprofile',
  title: 'Volume profile',
  lede: 'Where a market traded: volume at each price, split into bought and sold, with the busiest price and its value area marked.',
  heroFile: 'VolumeProfileCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Volume profile',
    description: '',
    kind: 'volumeprofile',
    source: 'candleRanges',
    props: {
      title: 'SOL · USDC',
      close: 'close',
      volume: 'volume',
      open: 'open',
      high: 'high',
      low: 'low',
      defaultRange: '3m',
      valueFormat: usd,
    },
  }),
  usage: `<VolumeProfileCard
  title="SOL · USDC"
  data={candles}
  close="close"
  volume="volume"
  open="open"
  high="high"
  low="low"
/>`,
  dataShape: `// The same candles a candlestick card reads.
const candles = [
  { date: new Date('2026-06-28'), open: 178.1, high: 181.4, low: 176.9, close: 180.2, volume: 2_310_000 },
  // …one row per period
];`,
  dataNote:
    'Each period’s volume is spread evenly over the prices between its low and high, or placed at its close without them. It counts as bought when the period closed at or above its open, or above the previous close when there is no open. The range is split into bins (24 by default). The point of control is the busiest band; the value area grows from it toward whichever neighbour traded more until it holds valueArea (70%) of the volume. `volumeProfile` returns the same bins for your own layouts.',
  hover:
    'Hover or focus a bar to read that band in the headline: its price, and how much was bought or sold there. At rest the headline is the point of control. The note gives the value area and the last close, which the colored line marks.',
  props: observationPropsFor(
    [
      { name: 'close', type: 'numeric key of Row', description: 'Each period’s close.' },
      { name: 'volume', type: 'numeric key of Row', description: 'Each period’s traded volume.' },
      {
        name: 'open',
        type: 'numeric key of Row',
        description: 'Open, to count volume as bought or sold.',
      },
      {
        name: 'high / low',
        type: 'numeric key of Row',
        description: 'Spread each period’s volume over the prices it traded.',
      },
      { name: 'bins', type: 'number', description: 'Price bands, from 2 to 200. Defaults to 24.' },
      {
        name: 'valueArea',
        type: 'number',
        description: 'Share of volume the value area holds. Defaults to 0.7.',
      },
      {
        name: 'volumeFormat',
        type: 'Intl.NumberFormatOptions',
        description: 'Volume format. Compact numbers by default.',
      },
    ],
    { omit: ['color', 'aggregate'] },
  ),
  examples: [
    cardExample({
      id: 'closes',
      title: 'Closes only',
      description:
        'Six years of weekly Bitcoin closes with no high or low: each week’s volume sits at its close, in finer bands.',
      kind: 'volumeprofile',
      source: 'btcWeekly',
      props: {
        title: 'BTC · weekly',
        close: 'close',
        volume: 'volume',
        open: 'open',
        bins: 40,
        valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
      },
    }),
  ],
};

export const volumeProfileDoc = curate(content, {});

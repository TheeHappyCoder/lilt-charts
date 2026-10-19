import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { legendProps, observationPropsFor } from './market-props';

const compactUsd = {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
} as const;

const content: CardDocContent = {
  kind: 'marketmap',
  title: 'Market map',
  lede: 'A whole market at a glance: every company a tile sized by its weight and colored by how far it moved.',
  heroFile: 'MarketMapCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Market map',
    description: '',
    kind: 'marketmap',
    source: 'marketRanges',
    props: {
      title: 'Large caps today',
      label: 'symbol',
      value: 'cap',
      change: 'change',
      group: 'sector',
      valueFormat: compactUsd,
    },
  }),
  usage: `<MarketMapCard
  title="Large caps today"
  data={market}
  label="symbol"
  value="cap"
  change="change"
  group="sector"
/>`,
  dataShape: `// One row per company: its weight (here market cap) and its move.
const market = [
  { symbol: 'AAPL', sector: 'Technology', cap: 3_480_000_000_000, change: 0.0124 },
  { symbol: 'TSLA', sector: 'Consumer', cap: 780_000_000_000, change: -0.0412 },
];`,
  dataNote:
    'Each row is one tile. value sets its area and must be nonnegative; change is a fraction (0.0124 is up 1.24%) and sets its color: green up, red down, deeper the further it moved, reaching full strength at scale (3% by default). A flat tile is a quiet grey. group names one parent level and sits its tiles together under the sector name. Labels must be unique within their group. Rows with no area stay in the accessible table.',
  hover:
    'Hover or focus a tile to read its value in the headline and its move beside it. At rest the headline is the total of every tile. Click or press Enter to pin; arrow keys step through tiles.',
  props: observationPropsFor(
    [
      {
        name: 'label',
        type: 'text key of Row',
        description: 'Each tile’s name, such as a ticker.',
      },
      { name: 'value', type: 'numeric key of Row', description: 'Tile area, such as market cap.' },
      {
        name: 'change',
        type: 'numeric key of Row',
        description: 'Fractional move that colors the tile: 0.012 is up 1.2%.',
      },
      {
        name: 'group',
        type: 'text key of Row',
        description: 'Optional parent, such as a sector, named over its tiles.',
      },
      {
        name: 'scale',
        type: 'number',
        description: 'The move at which tiles reach full color. Defaults to 0.03.',
      },
    ],
    { omit: ['color'], extra: legendProps },
  ),
  examples: [
    cardExample({
      id: 'tokens',
      title: 'One level',
      description:
        'Tokens without sectors: one layout, colored at full strength from a 5% move, as crypto moves further.',
      kind: 'marketmap',
      source: 'tokenMarket',
      props: {
        title: 'Tokens today',
        label: 'symbol',
        value: 'cap',
        change: 'change',
        scale: 0.05,
        valueFormat: compactUsd,
      },
    }),
  ],
};

export const marketMapDoc = curate(content, {});

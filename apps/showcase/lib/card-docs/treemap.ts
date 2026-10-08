import { curate, type CardDocContent } from './content';
import { cardExample } from './examples';
import { observationProps } from './observation-variants';

const content: CardDocContent = {
  kind: 'treemap',
  title: 'Treemap',
  lede: 'See how each part contributes to the whole, with related parts grouped together.',
  heroFile: 'ProductRevenueCard.tsx',
  hero: cardExample({
    id: 'hero',
    title: 'Product revenue',
    description: '',
    kind: 'treemap',
    source: 'productRevenue',
    props: {
      title: 'Product revenue',
      label: 'product',
      value: 'revenue',
      group: 'department',
      valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
    },
  }),
  usage:
    '<TreemapChartCard title="Product revenue" data={productRevenue} label="product" value="revenue" group="department" />',
  dataShape: `const productRevenue = [
  { product: 'Analytics', department: 'Platform', revenue: 42000 },
  { product: 'Automations', department: 'Platform', revenue: 28000 },
  { product: 'Team', department: 'Workspace', revenue: 32000 },
];`,
  dataNote:
    'Each row is a leaf, with a nonnegative area. group optionally supplies one parent level; do not include parent totals as additional rows. Labels must be unique within their group. Null is missing and zero has no area: both remain in the accessible table. Negative areas and duplicate identities produce an error. Small tiles keep their full accessible name even when the visible label does not fit.',
  hover:
    'Hover or focus a tile to read its value in the headline. Click or press Enter to pin; Escape releases. Arrow keys step through tiles, and Home/End jump to either end. The group legend highlights matching tiles. Use renderReadout and onSelectionChange for your own JSX. Skeletons use the same shimmer, draw, breathe, and opacity exit as the other cards; reduced motion skips decorative transitions.',
  props: [
    {
      name: 'drilldown',
      type: 'boolean',
      description:
        'Show explicit group buttons and a breadcrumb. Exploring a group animates leaves into their new layout; clicking a leaf still pins it.',
    },
    ...observationProps,
    { name: 'label', type: 'text key of Row', description: 'Unique leaf name within its group.' },
    { name: 'value', type: 'numeric key of Row', description: 'Nonnegative tile area.' },
    {
      name: 'group',
      type: 'text key of Row',
      description: 'Optional parent category, shared color, and value legend.',
    },
    {
      name: 'legend',
      type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
      description: 'Group legend layout. Defaults to tiles; false removes it.',
    },
    {
      name: 'legendSwatch',
      type: "'square' | 'dot' | 'line'",
      description: 'Legend marker; square by default.',
    },
  ],
  examples: [
    cardExample({
      id: 'flat-data',
      title: 'One level',
      description:
        'Without a group, all products share one layout and each leaf gets its own palette color.',
      kind: 'treemap',
      source: 'productRevenue',
      props: {
        title: 'Product revenue',
        label: 'product',
        value: 'revenue',
        valueFormat: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 },
      },
    }),
  ],
};
export const treemapDoc = curate(content, {});

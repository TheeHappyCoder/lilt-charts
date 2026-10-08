import {
  sunburstTerracesDoc,
  clusterConstellationDoc,
  ternaryPrismDoc,
  windRoseDoc,
  marimekkoBlocksDoc,
  intersectionTowersDoc,
  horizonFoldsDoc,
  circleArchipelagoDoc,
  helixRibbonsDoc,
  voxelCloudDoc,
} from './card-docs/spatial';
import {
  chordLoomDoc,
  rankRibbonsDoc,
  eventHelixDoc,
  contourIslandsDoc,
  parallelRibbonsDoc,
  arcBridgesDoc,
} from './card-docs/sculpted';
import { boxPlotDoc } from './card-docs/box-plot';
import { treemapDoc } from './card-docs/treemap';
import {
  blockCityDoc,
  hexCityDoc,
  ridgelineDoc,
  skylineDoc,
  spiralYearDoc,
  terrainDoc,
  voxelWaffleDoc,
} from './card-docs/cool';
import { candlestickDoc } from './card-docs/candlestick';
import { depthDoc } from './card-docs/depth';
import { indicatorDoc } from './card-docs/indicator';
import { orderBookDoc } from './card-docs/order-book';
import { portfolioDoc } from './card-docs/portfolio';
import { priceDoc } from './card-docs/price';
import { rangeDoc } from './card-docs/range';
import { activityRingDoc } from './card-docs/activity-ring';
import { areaDoc } from './card-docs/area';
import { barDoc } from './card-docs/bar';
import { comboDoc } from './card-docs/combo';
import type { CardDocContent } from './card-docs/content';
import { cardComponents, cardModule, exampleSource } from './card-docs/examples';
import { stageExamples } from './card-docs/resolve-example';
import packageMetadata from '../../../packages/charts/package.json';
import { funnelDoc } from './card-docs/funnel';
import { heatmapDoc } from './card-docs/heatmap';
import { horizontalBarDoc } from './card-docs/horizontal-bar';
import { lineDoc } from './card-docs/line';
import { progressDoc } from './card-docs/progress';
import { radarDoc } from './card-docs/radar';
import { radialDoc } from './card-docs/radial';
import { sankeyDoc } from './card-docs/sankey';
import { scatterDoc } from './card-docs/scatter';
import { slopeDoc } from './card-docs/slope';
import { statDoc } from './card-docs/stat';
import { appRoutes, type AppRoute } from './routes';

export const PACKAGE_NAME = '@lilt-ui/charts';
export const PACKAGE_VERSION = packageMetadata.version;

/** The live docs site, so links work wherever the agent files are read. */
export const SITE_URL = 'https://liltui.vercel.app';

/** Each chart route's documentation, so agent files follow the same content as the pages. */
export const cardDocsByRoute: Readonly<Record<string, CardDocContent>> = {
  treemap: treemapDoc,
  area: areaDoc,
  line: lineDoc,
  bar: barDoc,
  ranking: horizontalBarDoc,
  'stat-cards': statDoc,
  radial: radialDoc,
  progress: progressDoc,
  'activity-ring': activityRingDoc,
  combo: comboDoc,
  funnel: funnelDoc,
  heatmap: heatmapDoc,
  scatter: scatterDoc,
  sankey: sankeyDoc,
  radar: radarDoc,
  slope: slopeDoc,
  range: rangeDoc,
  'box-plot': boxPlotDoc,
  'chord-loom': chordLoomDoc,
  'rank-ribbons': rankRibbonsDoc,
  'event-helix': eventHelixDoc,
  'contour-islands': contourIslandsDoc,
  'parallel-ribbons': parallelRibbonsDoc,
  'sunburst-terraces': sunburstTerracesDoc,
  'cluster-constellation': clusterConstellationDoc,
  'ternary-prism': ternaryPrismDoc,
  'wind-rose': windRoseDoc,
  'marimekko-blocks': marimekkoBlocksDoc,
  'intersection-towers': intersectionTowersDoc,
  'horizon-folds': horizonFoldsDoc,
  'circle-archipelago': circleArchipelagoDoc,
  'helix-ribbons': helixRibbonsDoc,
  'voxel-cloud': voxelCloudDoc,
  'arc-bridges': arcBridgesDoc,
  terrain: terrainDoc,
  'hex-city': hexCityDoc,
  'voxel-waffle': voxelWaffleDoc,
  skyline: skylineDoc,
  'block-city': blockCityDoc,
  ridgeline: ridgelineDoc,
  'spiral-year': spiralYearDoc,
  candlestick: candlestickDoc,
  indicator: indicatorDoc,
  price: priceDoc,
  depth: depthDoc,
  'order-book': orderBookDoc,
  portfolio: portfolioDoc,
};

/** Every chart in sidebar order, with the page that documents it. */
export function documentedCharts(): { route: AppRoute; doc: CardDocContent; component: string }[] {
  return (appRoutes as readonly AppRoute[])
    .filter((route) => (route.group === 'Charts' || route.group === 'Finance') && route.navigation)
    .flatMap((route) => {
      const doc = cardDocsByRoute[route.id];
      return doc ? [{ route, doc, component: cardComponents[doc.kind] }] : [];
    });
}

const code = (language: string, source: string) => `\`\`\`${language}\n${source}\n\`\`\``;

const header = [
  '# Lilt Charts',
  '',
  `> React chart cards for dashboards. Pass your rows and name the fields. Each family supplies its own headline, readout, and interaction. Package: \`${PACKAGE_NAME}\` ${PACKAGE_VERSION} (MIT). Requires React and React DOM 19.`,
  '',
  '## Install',
  '',
  code('bash', `npm install ${PACKAGE_NAME}`),
  '',
  `pnpm, yarn, and bun work the same way: \`pnpm add ${PACKAGE_NAME}\`, \`yarn add ${PACKAGE_NAME}\`, \`bun add ${PACKAGE_NAME}\`.`,
  '',
  'Import the stylesheet once, in the root layout or app entry:',
  '',
  code('ts', `import '${PACKAGE_NAME}/styles.css';`),
  '',
  '## Rules',
  '',
  "- Every card is a client component. In the Next.js App Router, render cards from a file that starts with `'use client'`.",
  `- Import cards and parts from \`${PACKAGE_NAME}\`, and finance cards (candlestick, indicators, price, depth, order book, portfolio) from \`${PACKAGE_NAME}/finance\`. Server-safe data helpers (\`summarizeRange\`, \`toChartCsv\`, \`summarizeFunnelStages\`) are also in \`${PACKAGE_NAME}/data\`.`,
  '- Card titles are optional: omit `title` to render no title. `header={false}` removes the entire header, including headline, delta and period controls. Supply an `aria-label` when your app owns the visible heading. Pass the selected rows through `data` when your app owns period selection.',
  '- Where a card supports legend layouts, `legend={false}` removes the legend without changing its data. `surface="ghost"` only removes the visual frame; it does not hide content. Radial charts keep their centre, pointer inspection, and keyboard inspection when the legend is hidden; Escape clears a pin in every layout.',
  '- Pass rows as they are. `x`, `category`, `value`, and each series `key` name fields of the row type; TypeScript rejects unknown or non-numeric fields.',
  '- `null` is a missing value and draws as a gap; `0` is a measurement. Never replace missing values with zero.',
  "- Format numbers with `valueFormat`, which takes `Intl.NumberFormatOptions`, e.g. `{ style: 'currency', currency: 'USD' }`.",
  "- For rates and levels such as latency or active users, set `aggregate` (`'mean'`, `'last'`, or `'max'`) so the headline is not a meaningless total.",
  '- Give Area, Line, Bar, Combo, and Stat cards the same `sync` name to link their hover; Stat requires `x`. A click pins every linked card (Alt-click or Alt+Enter pins one card only). Area, Line, Bar, and Combo support `target` goal lines and supplied `forecast` rows. Stat uses `target` for its meter or ring and has no `forecast` prop.',
  '- Cards follow shadcn theme variables (`--card`, `--card-foreground`, `--muted-foreground`, `--border`, `--ring`, `--chart-1` to `--chart-5`). Lilt styles sit in the `lilt` cascade layer, so app CSS overrides them.',
].join('\n');

/** What each sidebar job is for, so an agent can match a request to a card. */
const jobHints: Readonly<Record<string, string>> = {
  Trends: 'a value over time',
  Comparison: 'categories, before and after, or ranges side by side',
  'Part of a whole': 'shares of a total, or where a flow goes',
  KPIs: 'one headline number, a goal, or a streak',
  Patterns: 'density, correlation, profiles, or spread',
  Cool: 'spatial charts for calendars, grids, hierarchies, networks, distributions, and cycles; each has its own data contract',
  Finance: `markets and holdings, from \`${PACKAGE_NAME}/finance\``,
};

/** Cards under the sidebar's job headings, so "show revenue against target" finds a card. */
function chartsByJob(): string[] {
  const groups = new Map<string, string[]>();
  for (const { route, doc, component } of documentedCharts()) {
    const job = route.job ?? route.group;
    const line = `- [${doc.title}](${SITE_URL}${route.href}): \`${component}\`. ${doc.lede}`;
    const forms = (doc.forms ?? []).map(
      (form) =>
        `- [${form.title}](${SITE_URL}${route.href}#${form.kind}-api): \`${cardComponents[form.kind]}\`. ${form.description}`,
    );
    groups.set(job, [...(groups.get(job) ?? []), line, ...forms]);
  }
  return [...groups].flatMap(([job, lines]) => [
    `### ${job}${jobHints[job] ? `: ${jobHints[job]}` : ''}`,
    '',
    ...lines,
    '',
  ]);
}

/** A short index: what Lilt is, how to install it, the rules, and the cards by job. */
export function llmsIndex(): string {
  return [
    header,
    '',
    '## Cards by job',
    '',
    'Pick the card for the job, then follow its link for examples, data shape, and props. Cards include loading and empty states; legends and inspection controls depend on the family.',
    '',
    ...chartsByJob(),
    '## Reference',
    '',
    `- [Every card with its example, data shape, and props](${SITE_URL}/llms-full.txt)`,
    `- [Getting started](${SITE_URL}/guides/installation)`,
    `- [API reference](${SITE_URL}/guides/api)`,
    '',
  ].join('\n');
}

function cardSection({
  route,
  doc,
  component,
}: {
  route: AppRoute;
  doc: CardDocContent;
  component: string;
}): string {
  const props = doc.props.map((row) => `- \`${row.name}\` (\`${row.type}\`): ${row.description}`);
  return [
    `## ${doc.title}: \`${component}\``,
    '',
    `${doc.lede} Docs: ${SITE_URL}${route.href}`,
    '',
    code('tsx', `import { ${component} } from '${cardModule(doc.kind)}';\n\n${doc.usage}`),
    '',
    '### Complete examples',
    '',
    ...stageExamples(doc).flatMap(({ example }) => [
      `#### ${example.title}`,
      '',
      example.description,
      '',
      code('tsx', exampleSource(example, 'Example')),
      '',
    ]),
    '',
    '### Data',
    '',
    code('tsx', doc.dataShape),
    '',
    doc.dataNote,
    ...(doc.rangesUsage ? ['', '### Period select', '', code('tsx', doc.rangesUsage)] : []),
    '',
    '### Hover',
    '',
    doc.hover,
    '',
    '### Props',
    '',
    ...props,
    ...(doc.forms ?? []).flatMap((form) => [
      '',
      `### ${form.title}: ${cardComponents[form.kind]}`,
      '',
      form.description,
      '',
      code(
        'tsx',
        `import { ${cardComponents[form.kind]} } from '${cardModule(form.kind)}';\n\n${form.usage}`,
      ),
      '',
      ...form.props.map((row) => `- \`${row.name}\` (\`${row.type}\`): ${row.description}`),
    ]),
  ].join('\n');
}

/** Everything an agent needs to write a card: each card's example, data shape, and props. */
export function llmsFull(): string {
  return [
    header,
    '',
    ...documentedCharts()
      .map(cardSection)
      .flatMap((section) => [section, '']),
  ].join('\n');
}

/** One chart's documentation as Markdown, for "View as Markdown" and for opening in an assistant. */
export function chartMarkdown(pathname: string): string | null {
  const entry = documentedCharts().find(({ route }) => route.pathname === pathname);
  if (!entry) return null;
  return [
    '---',
    `title: ${entry.doc.title}`,
    `description: ${entry.doc.lede}`,
    `package: ${PACKAGE_NAME}`,
    `version: ${PACKAGE_VERSION}`,
    `component: ${entry.component}`,
    `page: ${SITE_URL}${pathname}`,
    `all-charts: ${SITE_URL}/llms-full.txt`,
    '---',
    '',
    `Install with \`npm install ${PACKAGE_NAME}\` and import \`${PACKAGE_NAME}/styles.css\` once.`,
    '',
    cardSection(entry),
    '',
  ].join('\n');
}

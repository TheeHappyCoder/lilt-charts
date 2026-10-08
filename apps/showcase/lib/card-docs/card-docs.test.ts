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
} from './spatial';
import {
  chordLoomDoc,
  rankRibbonsDoc,
  eventHelixDoc,
  contourIslandsDoc,
  parallelRibbonsDoc,
  arcBridgesDoc,
} from './sculpted';
import { describe, expect, it } from 'vitest';
import { tuneControls, tuneSpecs } from './tune';
import { boxPlotDoc } from './box-plot';
import { candlestickDoc } from './candlestick';
import { depthDoc } from './depth';
import { indicatorDoc } from './indicator';
import { orderBookDoc } from './order-book';
import { portfolioDoc } from './portfolio';
import { priceDoc } from './price';
import { rangeDoc } from './range';
import { activityRingDoc } from './activity-ring';
import { areaDoc } from './area';
import { barDoc } from './bar';
import { comboDoc } from './combo';
import { horizontalBarDoc } from './horizontal-bar';
import { lineDoc } from './line';
import { funnelDoc } from './funnel';
import { heatmapDoc } from './heatmap';
import { progressDoc } from './progress';
import { radialDoc } from './radial';
import { scatterDoc } from './scatter';
import { sankeyDoc } from './sankey';
import { radarDoc } from './radar';
import { slopeDoc } from './slope';
import { statDoc } from './stat';
import { treemapDoc } from './treemap';
import {
  blockCityDoc,
  hexCityDoc,
  ridgelineDoc,
  skylineDoc,
  spiralYearDoc,
  terrainDoc,
  voxelWaffleDoc,
} from './cool';
import {
  cardComponents,
  cardModule,
  exampleJsx,
  isBookSource,
  exampleSource,
  isExampleRow,
  isRangeSource,
  type CardExample,
  type DocExample,
} from './examples';

const docs = [
  treemapDoc,
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
  chordLoomDoc,
  rankRibbonsDoc,
  eventHelixDoc,
  contourIslandsDoc,
  parallelRibbonsDoc,
  arcBridgesDoc,
  terrainDoc,
  hexCityDoc,
  voxelWaffleDoc,
  skylineDoc,
  blockCityDoc,
  ridgelineDoc,
  spiralYearDoc,
  areaDoc,
  lineDoc,
  barDoc,
  comboDoc,
  horizontalBarDoc,
  radialDoc,
  funnelDoc,
  heatmapDoc,
  scatterDoc,
  sankeyDoc,
  radarDoc,
  slopeDoc,
  activityRingDoc,
  progressDoc,
  statDoc,
  rangeDoc,
  boxPlotDoc,
  candlestickDoc,
  indicatorDoc,
  priceDoc,
  depthDoc,
  orderBookDoc,
  portfolioDoc,
];

const cardsOf = (example: DocExample): readonly CardExample[] =>
  isExampleRow(example) ? example.row : [example];

/** Every rendered prop must appear in the printed JSX, so code and preview agree. */
function expectPrinted(jsx: string, card: CardExample, indent: string) {
  for (const [name, value] of Object.entries(card.props)) {
    expect(jsx, `${card.id}.${name}`).toMatch(new RegExp(`\n${indent}${name}(=|\n)`));
    if (typeof value === 'string') expect(jsx).toContain(`${name}="${value}"`);
    if (typeof value === 'number') expect(jsx).toContain(`${name}={${value}}`);
  }
  // Cards without a dataset print no data placeholder; an inline `ranges` prop is fine.
  if (card.source === undefined) expect(jsx).not.toMatch(/\n\s+(data=|ranges=\{ranges\})/);
  else if (isBookSource(card.source)) expect(jsx).toContain(`bids={${card.source}.bids}`);
  else
    expect(jsx).toContain(isRangeSource(card.source) ? 'ranges={ranges}' : `data={${card.source}}`);
}

describe('card documentation examples', () => {
  it('gives every retained family one stage and all three loading styles', () => {
    expect(docs).toHaveLength(47);
    for (const doc of docs) {
      expect(doc.props.find((prop) => prop.name === 'loadingStyle')?.type).toBe(
        "'shimmer' | 'draw' | 'breathe'",
      );
      expect(
        doc.examples.some((example) => example.id === 'loading'),
        doc.title,
      ).toBe(false);
    }
  });

  it.each(docs.map((doc) => [doc.title, doc] as const))(
    '%s prints every rendered prop, so code and preview agree',
    (_title, doc) => {
      for (const example of [doc.hero, ...doc.examples]) {
        const jsx = exampleJsx(example);
        const component = cardComponents[example.kind];
        if (isExampleRow(example)) {
          expect(jsx.startsWith('<div style={')).toBe(true);
          const blocks = jsx.split(`  <${component}\n`).slice(1);
          expect(blocks).toHaveLength(example.row.length);
          example.row.forEach((card, index) => expectPrinted(`\n${blocks[index]!}`, card, '    '));
        } else {
          expect(jsx.startsWith(`<${component}\n`)).toBe(true);
          expectPrinted(jsx, example, '  ');
        }
        for (const card of cardsOf(example))
          expect([doc.kind, ...(doc.forms ?? []).map((form) => form.kind)]).toContain(card.kind);
      }
    },
  );

  it('gives every example a unique anchor and a description', () => {
    for (const doc of docs) {
      const ids = [doc.hero, ...doc.examples].map((example) => example.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const example of doc.examples) expect(example.description.length).toBeGreaterThan(10);
    }
  });

  it('keeps forms one prop makes in Props, not in the carousel', () => {
    // A variant that is the hero's card with only its own props flipped (stacked, step, needles,
    // pie) is a Props setting, and one that only renames the period is the default again.
    // Variants are situations: other data, a target, a forecast.
    for (const doc of docs) {
      const hero = cardsOf(doc.hero)[0]!;
      const own = new Set((tuneSpecs[doc.kind] ?? []).map((spec) => spec.prop));
      for (const example of doc.examples) {
        if (isExampleRow(example) || example.kind !== doc.kind) continue;
        const sameData =
          example.source === hero.source ||
          example.source === hero.source?.replace(/Ranges$/, '') ||
          `${example.source}Ranges` === hero.source;
        if (!sameData || example.props.title !== hero.props.title) continue;
        const differs = Object.keys({ ...hero.props, ...example.props }).filter(
          (key) => JSON.stringify(example.props[key]) !== JSON.stringify(hero.props[key]),
        );
        expect(
          differs.every((key) => own.has(key) || key === 'delta' || key === 'range'),
          `${doc.title}: ${example.title} only flips ${differs.join(', ')}`,
        ).toBe(false);
      }
    }
  });

  it('keeps Variants about the chart itself', () => {
    // Axes, hover, legends, colors, surfaces, numbers, and loading apply to every chart and live
    // in Customize; linked hover and comparison are Features.
    const crossChart = [
      'axis',
      'hover',
      'hoverStyle',
      'tooltipIndicator',
      'palette',
      'color',
      'surface',
      'background',
      'legend',
      'legendSwatch',
      'numberStyle',
      'loading',
      'loadingStyle',
      'depth',
      'sync',
      'compare',
    ];
    // A stat card row is how stat cards are used, so it links their hover.
    const allowed: Record<string, readonly string[]> = {
      'stat:dashboard': ['sync'],
      // The fan opts into field readouts so all supplied uncertainty bounds can be inspected.
      'line:forecastfan': ['hover'],
      'area:forecastfan': ['hover'],
    };
    for (const doc of docs) {
      const hero = cardsOf(doc.hero)[0]!.props;
      for (const example of doc.examples)
        for (const card of cardsOf(example))
          for (const [key, value] of Object.entries(card.props))
            if (
              crossChart.includes(key) &&
              value !== undefined &&
              JSON.stringify(value) !== JSON.stringify(hero[key])
            )
              expect(
                allowed[`${doc.kind}:${example.id}`] ?? [],
                `${doc.title}: ${example.title} sets ${key}`,
              ).toContain(key);
    }
  });

  it('tunes only real props of the chart itself, each with a choice to make', () => {
    const siteWide = [
      'palette',
      'surface',
      'background',
      'axis',
      'legend',
      'legendSwatch',
      'tiles',
      'hover',
      'depth',
      'loadingStyle',
      'numberStyle',
    ];
    for (const doc of docs) {
      const names = doc.props.map((row) => row.name);
      const specs = tuneSpecs[doc.kind] ?? [];
      for (const spec of specs) {
        expect(names, `${doc.title}: ${spec.prop}`).toContain(spec.prop);
        expect(siteWide).not.toContain(spec.prop);
      }
      const controls = tuneControls(doc.kind, doc.props);
      expect(controls.map((control) => control.prop)).toEqual(specs.map((spec) => spec.prop));
      for (const control of controls) {
        expect(control.options).toContain(control.defaultValue);
        // Depth is the chart style's, even where a bar style can draw it.
        expect(control.options).not.toContain('isometric');
      }
    }
  });

  it('prints complete, importable files for the hero examples', () => {
    for (const doc of docs) {
      const source = exampleSource(doc.hero, 'Card');
      expect(source).toContain(
        `import { ${cardComponents[doc.kind]} } from '${cardModule(doc.kind)}';`,
      );
      expect(source).toContain("import '@lilt-ui/charts/styles.css';");
      expect(source).toContain('export function Card()');
      for (const card of cardsOf(doc.hero)) {
        if (card.source === undefined) continue;
        const name = isRangeSource(card.source) ? 'ranges' : card.source;
        // Rows are a literal or generated with Array.from; a book is an object.
        const declarations = isBookSource(card.source)
          ? [`const ${name} = {`]
          : [`const ${name} = [`, `const ${name} = Array.from(`];
        expect(
          declarations.some((line) => source.includes(line)),
          name,
        ).toBe(true);
      }
    }
  });

  it('documents every prop exactly once', () => {
    for (const doc of docs) {
      const names = doc.props.map((row) => row.name);
      expect(new Set(names).size, doc.title).toBe(names.length);
    }
  });
});

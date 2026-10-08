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
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { apiNeighbours, apiTopicHref, apiTopics } from './api-topics';
import { appRoutes, routeFor, type AppRoute } from './routes';
import { boxPlotDoc } from './card-docs/box-plot';
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
import { horizontalBarDoc } from './card-docs/horizontal-bar';
import { lineDoc } from './card-docs/line';
import { funnelDoc } from './card-docs/funnel';
import { heatmapDoc } from './card-docs/heatmap';
import { progressDoc } from './card-docs/progress';
import { radialDoc } from './card-docs/radial';
import { scatterDoc } from './card-docs/scatter';
import { sankeyDoc } from './card-docs/sankey';
import { radarDoc } from './card-docs/radar';
import { slopeDoc } from './card-docs/slope';
import { statDoc } from './card-docs/stat';
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
import { exampleSource } from './card-docs/examples';
import { resolveSubject, stageExamples } from './card-docs/resolve-example';
import { HERO_LOOK, heroSource, type SceneId } from './home-hero';

describe('API reference topics', () => {
  it('gives every topic a unique page that keeps the API reference current in the sidebar', () => {
    const slugs = apiTopics.map((topic) => topic.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(routeFor(apiTopicHref(slug)).id).toBe('api');
  });

  it('pages through every topic in order', () => {
    expect(apiNeighbours(apiTopics[0].slug).previous).toBeUndefined();
    expect(apiNeighbours(apiTopics[0].slug).next?.slug).toBe(apiTopics[1].slug);
    expect(apiNeighbours(apiTopics.at(-1)!.slug).next).toBeUndefined();
  });
});

describe('retained chart previews', () => {
  it('links every visible chart to its own route', () => {
    for (const route of appRoutes.filter(
      (route) =>
        route.group === 'Charts' || route.group === 'Finance' || route.group === 'Features',
    ) as AppRoute[]) {
      expect(routeFor(route.pathname).id).toBe(route.id);
    }
    expect(
      appRoutes.every(
        (route) =>
          route.group === 'Charts' ||
          route.group === 'Finance' ||
          route.group === 'Features' ||
          route.group === 'Start' ||
          route.group === 'Customize' ||
          route.group === 'Reference',
      ),
    ).toBe(true);
  });

  it('typechecks generated components for every retained family against public exports', () => {
    const sources = new Map<string, string>();
    for (const scene of [undefined, 'sync', 'compare', 'forecast'] as const) {
      for (const depth of [false, true]) {
        sources.set(
          `home-${scene ?? 'default'}-${depth}.tsx`,
          heroSource({ ...HERO_LOOK, depth }, scene as SceneId | undefined).code,
        );
      }
    }
    // Every card docs example prints a complete consumer file; each must compile on its own.
    for (const doc of [
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
    ]) {
      for (const example of [doc.hero, ...doc.examples]) {
        sources.set(`card-${doc.kind}-${example.id}.tsx`, exampleSource(example, 'Example'));
      }
      for (const look of stageExamples(doc)) {
        if ('row' in look.example) continue;
        const subject = { example: look.example, change: look.change };
        for (const loadingStyle of ['shimmer', 'draw', 'breathe'] as const) {
          const resolved = resolveSubject(
            subject,
            'Example',
            { palette: 'cobalt', surface: 'outline', depth: true },
            doc.props.map((prop) => prop.name),
            { loading: true, loadingStyle },
          );
          sources.set(
            `configured-${doc.kind}-${look.example.id}-${loadingStyle}.tsx`,
            resolved.code,
          );
        }
      }
      for (const example of doc.examples) {
        const form = doc.forms?.find((candidate) => candidate.kind === example.kind);
        if (!form || 'row' in example) continue;
        for (const depth of [false, true]) {
          for (const loadingStyle of ['shimmer', 'draw', 'breathe'] as const) {
            const resolved = resolveSubject(
              { example, change: [] },
              'Example',
              { palette: 'emerald', surface: 'ghost', axis: 'classic', depth, loadingStyle },
              form.props.map((prop) => prop.name),
              { loading: true },
            );
            sources.set(
              `form-${example.kind}-${example.id}-${depth}-${loadingStyle}.tsx`,
              resolved.code,
            );
          }
        }
      }
    }

    const normalize = (file: string) => file.replaceAll('\\', '/').toLowerCase();
    const virtual = new Map(
      [...sources].map(([name, source]) => [
        normalize(resolve(process.cwd(), 'apps/showcase/__generated-contract__', name)),
        source,
      ]),
    );
    const optionsForTypecheck: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      ...(process.env.LILT_AUDIT_PACKAGE_DIR
        ? {
            paths: {
              '@lilt-ui/charts': [resolve(process.env.LILT_AUDIT_PACKAGE_DIR, 'dist/index.d.ts')],
              '@lilt-ui/charts/finance': [
                resolve(process.env.LILT_AUDIT_PACKAGE_DIR, 'dist/finance/index.d.ts'),
              ],
              '@lilt-ui/charts/data': [
                resolve(process.env.LILT_AUDIT_PACKAGE_DIR, 'dist/data.d.ts'),
              ],
            },
          }
        : {}),
      esModuleInterop: true,
    };
    const host = ts.createCompilerHost(optionsForTypecheck);
    const getSourceFile = host.getSourceFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    const readFile = host.readFile.bind(host);
    host.fileExists = (file) => virtual.has(normalize(file)) || fileExists(file);
    host.readFile = (file) => virtual.get(normalize(file)) ?? readFile(file);
    host.getSourceFile = (file, languageVersion, onError, shouldCreateNewSourceFile) => {
      const text = virtual.get(normalize(file));
      return text === undefined
        ? getSourceFile(file, languageVersion, onError, shouldCreateNewSourceFile)
        : ts.createSourceFile(file, text, languageVersion, true, ts.ScriptKind.TSX);
    };
    const program = ts.createProgram([...virtual.keys()], optionsForTypecheck, host);
    expect(
      program.getSourceFiles().filter((file) => file.fileName.includes('__generated-contract__')),
    ).toHaveLength(sources.size);
    const errors = ts
      .getPreEmitDiagnostics(program)
      .filter((error) => error.category === ts.DiagnosticCategory.Error)
      .map(
        (error) =>
          ts.flattenDiagnosticMessageText(error.messageText, '\n') +
          (error.file
            ? ` (${error.file.fileName}:${error.file.getLineAndCharacterOfPosition(error.start ?? 0).line + 1})`
            : ''),
      );
    expect(errors).toEqual([]);
  }, 60_000);
});

import { describe, expect, it } from 'vitest';
import { areaDoc, areaLinkedExample } from './area';
import { barDoc, isometricBarExample } from './bar';
import { comboDoc } from './combo';
import { horizontalBarDoc } from './horizontal-bar';
import { radialDoc } from './radial';
import { statDoc } from './stat';
import { candlestickDoc } from './candlestick';
import { radarDoc } from './radar';
import { exampleSource, isExampleRow, type CardExample, type DocExample } from './examples';
import {
  resolveCardExample,
  resolveDocExample,
  resolveSubject,
  stageExamples,
} from './resolve-example';

/** The stage's single cards: the default, then each variant with the props it sets itself. */
const subjects = (doc: Parameters<typeof stageExamples>[0]) =>
  stageExamples(doc).filter(
    (item): item is { example: CardExample; change: readonly string[] } =>
      !isExampleRow(item.example),
  );
const variantOf = (id: string) => subjects(barDoc).find((item) => item.example.id === id)!;

describe('resolved documentation examples', () => {
  it('keeps the configured loading style in the source without forcing the card to load', () => {
    const look = subjects(barDoc)[0]!;
    const props = ['loadingStyle', 'loading'];
    const resting = resolveSubject(look, 'Example', { loadingStyle: 'draw' }, props);
    expect(resting.example.props.loading).toBeUndefined();
    expect(resting.code).toContain('loadingStyle="draw"');
    const loading = resolveSubject(look, 'Example', { loadingStyle: 'draw' }, props, {
      loading: true,
    });
    expect(loading.example.props.loading).toBe(true);
    expect(loading.code).toContain('loadingStyle="draw"');
  });

  it.each([barDoc, areaDoc, radialDoc])(
    '$title keeps the preview, full source, and AI prompt on the same props',
    (doc) => {
      const supported = doc.props.map((prop) => prop.name);
      for (const look of subjects(doc)) {
        const result = resolveSubject(
          look,
          'Example',
          { palette: 'cobalt', surface: 'outline', depth: true },
          supported,
          { loading: true, loadingStyle: 'breathe' },
        );
        // A variant keeps what it is about; site settings style the rest.
        const ownsDepth = look.change.some((key) => key === 'depth' || key === 'barStyle');
        expect(result.example.props).toMatchObject({
          palette: look.change.includes('palette') ? look.example.props.palette : 'cobalt',
          surface: look.change.includes('surface') ? look.example.props.surface : 'outline',
          loading: true,
          loadingStyle: 'breathe',
        });
        expect(result.example.props.depth).toBe(ownsDepth ? look.example.props.depth : true);
        expect(result.example.source).toBe(look.example.source);
        expect(result.code).toBe(exampleSource(result.example, 'Example'));
        expect(result.code).toContain('palette="cobalt"');
        expect(result.code).toContain('loadingStyle="breathe"');
        expect(supported).toContain('loadingStyle');
        expect(result.prompt).toContain(result.code);
        expect(result.prompt).toContain(String(result.example.props.title));
        expect(look.example.props).not.toHaveProperty('loading');
      }
    },
  );

  it('keeps explicit false in the source while loading without duplicating a prop', () => {
    const look = subjects(barDoc)[0]!;
    const result = resolveSubject(look, 'Example', { depth: false }, ['depth'], {
      loading: true,
      loadingStyle: 'breathe',
    });
    expect(result.example.props.depth).toBe(false);
    expect(result.code).toContain('depth={false}');
    expect(result.code.match(/\bdepth(?:=|\s)/g)).toHaveLength(1);
  });

  it('lets an example keep the props that define it, like a theme under explicit options', () => {
    const isometric = { example: isometricBarExample, change: ['depth'] as const };
    const flat = resolveSubject(isometric, 'Example', { depth: false, palette: 'emerald' }, [
      'depth',
      'palette',
    ]);
    expect(flat.example.props).toMatchObject({ depth: true, palette: 'emerald' });
    expect(flat.code).not.toContain('depth={false}');

    const needle = variantOf('needle');
    expect(needle.change).toContain('barStyle');
    const deep = resolveSubject(needle, 'Example', { depth: true }, ['depth']).example.props;
    expect(deep.barStyle).toBe('needle');
    expect(deep).not.toHaveProperty('depth');
  });

  it('makes an explicit Bar appearance obey a site depth override', () => {
    const needle = variantOf('needle').example;
    expect(resolveCardExample(needle, { depth: true }, ['depth']).props).toMatchObject({
      depth: true,
      barStyle: 'isometric',
    });
    expect(resolveCardExample(needle, { depth: false }, ['depth']).props.barStyle).toBe('needle');
    const prism = { ...needle, props: { ...needle.props, barStyle: 'isometric' } };
    expect(resolveCardExample(prism, { depth: false }, ['depth']).props.barStyle).toBe('solid');
    expect(needle.props.barStyle).toBe('needle');
  });

  it.each([comboDoc, horizontalBarDoc, statDoc])(
    '$title lets the shared depth setting override an explicit bar appearance',
    (doc) => {
      const withStyle = subjects(doc).find(
        (item) => typeof item.example.props.barStyle === 'string',
      );
      const example = withStyle?.example ?? {
        ...(doc.hero as CardExample),
        props: { ...(doc.hero as CardExample).props, barStyle: 'gradient' },
      };
      const look = { example };
      const defaults = look.example.props.barStyle;
      expect(resolveCardExample(look.example, { depth: true }, ['depth']).props).toMatchObject({
        depth: true,
        barStyle: 'isometric',
      });
      const prism = { ...look.example, props: { ...look.example.props, barStyle: 'isometric' } };
      expect(resolveCardExample(prism, { depth: false }, ['depth']).props.barStyle).toBe(
        prism.kind === 'ranking' ? 'inline' : 'solid',
      );
      expect(look.example.props.barStyle).toBe(defaults);
    },
  );

  it('does not add unsupported settings to previews or generated props', () => {
    const hero = radarDoc.hero as CardExample;
    const result = resolveCardExample(
      hero,
      { depth: true, palette: 'emerald' },
      radarDoc.props.map((prop) => prop.name),
    );
    expect(result.props).not.toHaveProperty('depth');
    expect(result.props.palette).toBe('emerald');
    expect(exampleSource(result, 'Example')).not.toContain('\n      depth');
  });

  it('resolves every card in a row without mutating its defaults', () => {
    const row: DocExample = areaLinkedExample;
    const result = resolveDocExample(row, { surface: 'ghost' }, ['surface']);
    expect(isExampleRow(result)).toBe(true);
    if (!isExampleRow(result) || !isExampleRow(row)) throw new Error('Expected a row.');
    expect(result.row.every((card) => card.props.surface === 'ghost')).toBe(true);
    expect(row.row.every((card) => card.props.surface === undefined)).toBe(true);
  });

  it('keeps the finance entry point in AI copy', () => {
    const result = resolveSubject(
      { example: candlestickDoc.hero as CardExample, change: [] },
      'CandlesExample',
      { depth: true },
      ['depth'],
    );
    expect(result.prompt).toContain("from '@lilt-ui/charts/finance'");
    expect(result.prompt).toContain('CandlestickChartCard');
    expect(result.prompt).toContain(result.code);
  });

  it('lists the default card first on every stage, then each variant once', () => {
    for (const doc of [barDoc, areaDoc, radialDoc]) {
      const ids = stageExamples(doc).map((item) => item.example.id);
      expect(ids[0]).toBe(doc.hero.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(stageExamples(doc)[0]!.change).toEqual([]);
    }
  });
});

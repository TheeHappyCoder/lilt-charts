import { createRequire } from 'node:module';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { documentedCharts } from '../llms';
import { bookSets, datasets } from './data';
import {
  exampleSource,
  isBookSource,
  isExampleRow,
  isRangeSource,
  propSource,
  type CardExample,
} from './examples';
import { rangesOf } from './periods';
import { stageExamples } from './resolve-example';
import { HERO_LOOK, heroSource, heroWithLook, sceneProps } from '../home-hero';

const require = createRequire(import.meta.url);
type Element = { props: Record<string, unknown> & { children?: Element[] } };
const plain = (value: unknown) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/** Execute the copyable consumer file and inspect the props it actually passes to the card. */
function renderExample(source: string, name = 'Example'): Element {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports: Record<string, () => Element> = {};
  const load = (name: string) =>
    name.startsWith('@lilt-ui/charts')
      ? new Proxy({}, { get: (_target, key) => String(key) })
      : require(name);
  new Function('require', 'exports', output)(load, exports);
  return exports[name]();
}

describe('copyable data matches preview data', () => {
  it('copies the home page with its exact rows, formats, styles, and interaction props', () => {
    for (const scene of ['sync', 'compare', 'forecast'] as const) {
      for (const depth of [false, true]) {
        const look = { ...HERO_LOOK, depth };
        const preview = heroWithLook(look, sceneProps[scene].main);
        const { code, chosen } = heroSource(look, scene);
        const rendered = renderExample(code, 'Sales');
        expect(plain(rendered.props.data)).toEqual(
          plain(datasets[preview.source as keyof typeof datasets]),
        );
        for (const [key, value] of Object.entries(preview.props))
          expect(plain(rendered.props[key]), `${scene}.${key}`).toEqual(plain(value));
        for (const line of chosen) expect(code).toContain(line);
      }
    }
  });
  it.each(documentedCharts().map(({ doc }) => [doc.title, doc] as const))(
    '%s preserves every row and value',
    (_title, doc) => {
      const examples = [
        doc.hero,
        ...doc.examples,
        ...stageExamples(doc).map((stage) => stage.example),
      ];
      for (const example of examples) {
        const source = exampleSource(example, 'Example');
        expect(source.startsWith("'use client';")).toBe(true);
        const result = renderExample(source);
        const cards = isExampleRow(example) ? example.row : [example];
        const elements = isExampleRow(example) ? result.props.children! : [result];
        cards.forEach((card: CardExample, index) => {
          const props = elements[index].props;
          for (const [key, value] of Object.entries(card.props))
            expect(plain(props[key]), `${example.id}.${key}`).toEqual(plain(value));
          if (!card.source) return;
          if (isRangeSource(card.source))
            expect(plain(props.ranges), example.id).toEqual(plain(rangesOf(card.source)));
          else if (isBookSource(card.source)) {
            expect(plain(props.bids)).toEqual(plain(bookSets[card.source].bids));
            expect(plain(props.asks)).toEqual(plain(bookSets[card.source].asks));
          } else expect(plain(props.data), example.id).toEqual(plain(datasets[card.source]));
        });
      }
    },
  );

  it('preserves timestamps and safely prints quoted strings and object keys', () => {
    const value = {
      "owner's label": 'A "quoted" value\nnext line',
      from: new Date('2026-10-07T13:24:56.789Z'),
    };
    const printed = propSource('forecast', value);
    const expression = printed.slice('forecast={'.length, -1);
    expect(plain(new Function(`return (${expression})`)())).toEqual(plain(value));
  });
});

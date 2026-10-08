import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { apiTopics } from './api-topics';

/** Entry points a consumer can import from, as published. */
const ENTRIES = ['@lilt-ui/charts', '@lilt-ui/charts/data', '@lilt-ui/charts/finance'] as const;

const root = resolve(process.cwd());
const read = (file: string) => readFileSync(join(root, file), 'utf8');

/** Every name, value or type, that each entry exports from the built declarations. */
function publishedExports(): Map<string, Set<string>> {
  const probe = join(root, 'apps/showcase/__api-docs-probe__.ts');
  const text = ENTRIES.map((entry, index) => `export * as e${index} from '${entry}';`).join('\n');
  const options: ts.CompilerOptions = {
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
            '@lilt-ui/charts/data': [resolve(process.env.LILT_AUDIT_PACKAGE_DIR, 'dist/data.d.ts')],
          },
        }
      : {}),
  };
  const host = ts.createCompilerHost(options);
  const same = (file: string) => resolve(file).toLowerCase() === probe.toLowerCase();
  const getSourceFile = host.getSourceFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (file) => same(file) || fileExists(file);
  host.getSourceFile = (file, version, ...rest) =>
    same(file)
      ? ts.createSourceFile(file, text, version, true)
      : getSourceFile(file, version, ...rest);
  const program = ts.createProgram([probe], options, host);
  const checker = program.getTypeChecker();
  const source = program.getSourceFiles().find((file) => same(file.fileName))!;
  const result = new Map<string, Set<string>>();
  ENTRIES.forEach((entry, index) => {
    const namespace = checker
      .getExportsOfModule(checker.getSymbolAtLocation(source)!)
      .find((symbol) => symbol.name === `e${index}`)!;
    const module = checker.getAliasedSymbol(namespace);
    result.set(entry, new Set(checker.getExportsOfModule(module).map((symbol) => symbol.name)));
  });
  return result;
}

function filesUnder(dir: string, pattern: RegExp): string[] {
  return readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1));
}

/**
 * A name the docs present as importable: a component or type (`Chart`, `ChartSeries`), a hook
 * or factory (`useChartState`, `createChartController`), or a helper whose verb marks it as one
 * (`toChartCsv`, `summarizeRange`, `compareObservationValues`). Props and options are lower
 * case and are checked by the example typecheck instead.
 */
const EXPORT_NAME =
  /^(?:[A-Z][A-Za-z0-9]+|(?:use|create|to|summarize|serialize|compare|evaluate|track|explain|describe|rank)[A-Z]\w*)$/;

/** Names in code spans that are not Lilt exports: platform and language types. */
const NOT_LILT = new Set(['Date', 'Intl', 'ReactNode', 'SVG', 'CSS', 'HTML', 'CSV', 'JSX', 'ID']);

/** Code spans in docs pages: `<code>Name</code>` in TSX and `Name` in Markdown. */
function codeSpans(file: string, text: string): string[] {
  const spans = file.endsWith('.md')
    ? [...text.replace(/```[\s\S]*?```/g, '').matchAll(/`([^`\n]+)`/g)]
    : [...text.matchAll(/<code>([^<{]+)<\/code>/g)];
  return (
    spans
      .map((match) => match[1].trim())
      // Quoted messages, such as an error the chart shows, are prose rather than names.
      .filter((span) => !/["“]|&quot;/.test(span))
      .map((span) => span.replace(/^</, '').split(/[.\s(]/)[0])
  );
}

/** `import { A, type B } from '@lilt-ui/charts…'` statements in any docs text or example. */
function imports(text: string): { entry: string; names: string[] }[] {
  return [...text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](@lilt-ui\/charts[^'"]*)['"]/g)].map(
    (match) => ({
      entry: match[2],
      names: match[1]
        .split(',')
        .map(
          (name) =>
            name
              .trim()
              .replace(/^type\s+/, '')
              .split(/\s+as\s+/)[0],
        )
        .filter(Boolean),
    }),
  );
}

describe('API docs match the published exports', () => {
  const exported = publishedExports();
  const anywhere = new Set([...exported.values()].flatMap((names) => [...names]));

  const docs = [
    'apps/showcase/lib/api-topics.ts',
    ...filesUnder('apps/showcase/components/api', /\.tsx$/),
    ...filesUnder('apps/showcase/app/(browser)/guides', /\.tsx$/),
    ...filesUnder('apps/showcase/public/docs', /\.md$/),
    'packages/charts/README.md',
    'README.md',
  ];

  it('lists only real exports on each API topic', () => {
    const missing = apiTopics.flatMap((topic) =>
      topic.exports
        .filter((name) => EXPORT_NAME.test(name) && !anywhere.has(name))
        .map((name) => `${topic.slug}: ${name}`),
    );
    expect(missing).toEqual([]);
  });

  it('names only real exports in code spans', () => {
    const missing = docs.flatMap((file) =>
      codeSpans(file, read(file))
        .filter((name) => EXPORT_NAME.test(name) && !NOT_LILT.has(name) && !anywhere.has(name))
        .map((name) => `${file}: ${name}`),
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it('imports every name from the entry point that exports it', () => {
    const wrong = docs.flatMap((file) =>
      imports(read(file)).flatMap(({ entry, names }) =>
        names
          .filter((name) => !exported.get(entry)?.has(name))
          .map((name) => `${file}: ${name} from ${entry}`),
      ),
    );
    expect(wrong).toEqual([]);
  });

  it('keeps repository and npm README content aligned', () => {
    const npm = read('packages/charts/README.md').replaceAll(
      'https://cdn.jsdelivr.net/npm/@lilt-ui/charts/media/',
      'packages/charts/media/',
    );
    expect(npm).toBe(read('README.md'));
  });
}, 60_000);

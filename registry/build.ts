import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveItems, sourceOf, TARGET_ROOT, type ResolvedItem } from './items.ts';

/**
 * Writes the shadcn registry the docs site serves: `r/<item>.json` for every item, with its
 * files inlined, and `r/registry.json` listing them. Dependencies are full URLs, so the CLI can
 * fetch them from any project. `REGISTRY_URL` points them somewhere else, such as a local server
 * while testing an install; `--out <dir>` writes the registry somewhere else.
 *
 *   node registry/build.ts
 *   REGISTRY_URL=http://localhost:4321 node registry/build.ts --out /tmp/r
 */

const root = dirname(fileURLToPath(import.meta.url));
const base = (process.env.REGISTRY_URL ?? 'https://liltui.vercel.app').replace(/\/$/, '');
const outFlag = process.argv.indexOf('--out');
const out =
  outFlag > -1 ? resolve(process.argv[outFlag + 1]!) : join(root, '..', 'apps/showcase/public/r');

const SCHEMA = 'https://ui.shadcn.com/schema';

// Stylesheets are copied as they are; the CLI only rewrites imports in script files.
const fileEntry = (item: ResolvedItem, file: string, content?: string) => ({
  path: `registry/${file}`,
  type: file.endsWith('.css') ? 'registry:file' : item.type,
  target: `@${TARGET_ROOT}/${file}`,
  ...(content === undefined ? {} : { content }),
});

const header = (item: ResolvedItem) => ({
  name: item.name,
  type: item.type,
  title: item.title,
  description: item.description,
  author: 'Lilt UI',
  ...(item.dependencies.length ? { dependencies: item.dependencies } : {}),
  ...(item.registryDependencies.length
    ? { registryDependencies: item.registryDependencies.map((name) => `${base}/r/${name}.json`) }
    : {}),
});

const items = resolveItems(root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of items) {
  const json = {
    $schema: `${SCHEMA}/registry-item.json`,
    ...header(item),
    files: item.files.map((file) => fileEntry(item, file, sourceOf(root, file))),
  };
  writeFileSync(join(out, `${item.name}.json`), `${JSON.stringify(json, null, 2)}\n`);
}
writeFileSync(
  join(out, 'registry.json'),
  `${JSON.stringify(
    {
      $schema: `${SCHEMA}/registry.json`,
      name: 'lilt-ui',
      homepage: base,
      items: items.map((item) => ({
        ...header(item),
        files: item.files.map((file) => fileEntry(item, file)),
      })),
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${items.length} registry items to ${out}`);

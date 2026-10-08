import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
import { AreaChartCard } from '@lilt-ui/charts';
import { summarizeRange, toChartCsv } from '@lilt-ui/charts/data';
import { CandlestickChartCard } from '@lilt-ui/charts/finance';

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve('@lilt-ui/charts/package.json'));
const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const installedPath = realpathSync(packageRoot).split(sep).join('/');
assert(installedPath.includes('/node_modules/'), 'Install the tarball instead of linking source');
assert.equal(manifest.name, '@lilt-ui/charts');
assert.equal(manifest.license, 'MIT');
assert(AreaChartCard && CandlestickChartCard, 'Chart entry points must load');
assert.equal(typeof summarizeRange, 'function');
assert.equal(typeof toChartCsv, 'function');

for (const [entry, conditions] of Object.entries(manifest.exports)) {
  for (const target of typeof conditions === 'string' ? [conditions] : Object.values(conditions)) {
    assert(existsSync(join(packageRoot, target)), `Missing ${entry} target: ${target}`);
  }
}
for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md', 'CHANGELOG.md']) {
  assert(existsSync(join(packageRoot, file)), `Missing distribution file: ${file}`);
}
for (const entry of readdirSync(packageRoot, { recursive: true, withFileTypes: true })) {
  const path = relative(packageRoot, join(entry.parentPath, entry.name)).split(sep).join('/');
  assert(
    !/(^|\/)(?:\.env(?:\..*)?|\.git|\.vercel|\.claude|\.local-bundles|apps|src)(?:\/|$)/.test(path),
    `Unexpected private or source file: ${path}`,
  );
  assert(!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path), `Unexpected test file: ${path}`);
}
console.log(
  `Packed ${manifest.name}@${manifest.version}: entry points, types, CSS, and notices verified.`,
);

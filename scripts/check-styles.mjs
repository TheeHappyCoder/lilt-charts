import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import stylelint from 'stylelint';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = resolve(root, 'packages/charts/src/styles.css');
const directory = resolve(dirname(entry), 'styles');
const manifest = postcss.parse(await readFile(entry, 'utf8'), { from: entry });
const layer = postcss.atRule({ name: 'layer', params: 'lilt' });
const imported = new Set();

for (const node of manifest.nodes) {
  if (node.type === 'comment') continue;
  assert(node.type === 'atrule' && node.name === 'import', 'styles.css must only list CSS imports');
  const match = /^['"](\.\/styles\/[a-z0-9/-]+\.css)['"]$/.exec(node.params);
  assert(match, `Use a plain local CSS import in styles.css: ${node.params}`);
  const file = resolve(dirname(entry), match[1]);
  assert(!imported.has(file), `CSS module imported twice: ${relative(root, file)}`);
  imported.add(file);
  const module = postcss.parse(await readFile(file, 'utf8'), { from: file });
  module.walkAtRules('import', () => {
    assert.fail(`CSS imports belong in the public entry, not ${relative(root, file)}`);
  });
  for (const part of module.nodes) {
    if (part.type === 'comment') continue;
    assert(
      part.type === 'atrule' && part.name === 'layer' && part.params === 'lilt' && part.nodes,
      `${relative(root, file)} must keep all styles inside @layer lilt`,
    );
    layer.append(part.nodes.map((child) => child.clone()));
  }
}

async function cssFiles(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...(await cssFiles(file)));
    else if (entry.name.endsWith('.css')) files.push(file);
  }
  return files;
}

for (const file of await cssFiles(directory)) {
  assert(imported.has(file), `CSS module missing from styles.css: ${relative(root, file)}`);
}
assert(imported.size > 0, 'The public stylesheet must import its modules');
layer.walkAtRules('layer', () => {
  assert.fail('CSS modules must share the lilt layer, without nested layers');
});
layer.walkDecls((declaration) => {
  if (!declaration.prop.startsWith('--')) return;
  assert(
    declaration.prop.startsWith('--lilt-') || declaration.prop === '--number-flow-mask-height',
    `Package CSS must not define consumer theme variables: ${declaration.prop}`,
  );
});

// Check the combined layer as well as individual files: otherwise two modules can define the
// same selector and each pass lint alone. Reparse one source so the check spans every module.
const result = await stylelint.lint({
  code: layer.toString(),
  codeFilename: entry,
  configFile: resolve(root, 'stylelint.config.mjs'),
  formatter: 'string',
});
if (result.errored) {
  console.error(result.report);
  process.exitCode = 1;
} else {
  console.log(
    `CSS contract passed: ${imported.size} modules, one lilt layer, no duplicate selectors.`,
  );
}

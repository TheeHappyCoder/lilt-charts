import { build } from 'vite';
import { gzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const consumer = join(root, 'examples/consumers/react');
const output = join(root, '.local-bundles');
const budgets = { sparkline: 180_000, area: 195_000 };
const result = {};

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

for (const variant of Object.keys(budgets)) {
  const outDir = join(output, variant);
  await build({
    root: consumer,
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir,
      emptyOutDir: true,
      chunkSizeWarningLimit: 10_000,
      rolldownOptions: { input: join(consumer, `${variant}.html`) },
    },
  });
  const files = filesIn(outDir)
    .filter((file) => ['.js', '.css'].includes(extname(file)))
    .map((file) => {
      const buffer = readFileSync(file);
      return {
        file: file.slice(outDir.length + 1).replaceAll('\\', '/'),
        bytes: buffer.length,
        gzipBytes: gzipSync(buffer, { level: 9 }).length,
      };
    });
  const gzipBytes = files.reduce((sum, file) => sum + file.gzipBytes, 0);
  result[variant] = {
    files,
    gzipBytes,
    budgetBytes: budgets[variant],
    withinBudget: gzipBytes <= budgets[variant],
  };
  console.log(
    `${variant}: ${gzipBytes} gzip bytes of JavaScript and CSS, budget ${budgets[variant]}`,
  );
}

mkdirSync(output, { recursive: true });
writeFileSync(
  join(root, '.local-bundles/consumer-bundle-cost.json'),
  `${JSON.stringify(
    {
      method:
        'Vite 8 production builds of isolated plain React consumers using an installed local @lilt-ui/charts tarball; JavaScript and CSS include React, Motion, D3, chart source, and all transitive dependencies. HTML is excluded.',
      variants: result,
    },
    null,
    2,
  )}\n`,
);
if (Object.values(result).some((variant) => !variant.withinBudget)) process.exitCode = 1;

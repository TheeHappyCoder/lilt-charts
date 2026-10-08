import { cp, mkdir, realpath, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(new URL('../packages/charts/dist/', import.meta.url));
const destination = fileURLToPath(new URL('./.lilt/dist/', import.meta.url));
const dependencies = fileURLToPath(new URL('../packages/charts/node_modules/', import.meta.url));
const link = fileURLToPath(new URL('./.lilt/node_modules', import.meta.url));
if (!existsSync(new URL('../packages/charts/dist/index.js', import.meta.url))) {
  throw new Error('Build the library first: pnpm --filter @lilt-ui/charts build');
}
// Only replace this renderer's generated snapshot, never an external link or source directory.
if (relative(root, destination).replaceAll('\\', '/') !== 'video/.lilt/dist') {
  throw new Error('Unexpected snapshot destination');
}
if (existsSync(destination) && relative(destination, await realpath(destination)) !== '') {
  throw new Error('The snapshot directory must not be a link');
}
await mkdir(new URL('./.lilt/', import.meta.url), { recursive: true });
if (existsSync(link)) {
  if ((await realpath(link)) !== (await realpath(dependencies))) {
    throw new Error('The snapshot dependency link points to a different installation');
  }
} else {
  await symlink(dependencies, link, process.platform === 'win32' ? 'junction' : 'dir');
}
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
console.log('Refreshed video/.lilt/dist from the built library.');

export const CHARTS_PACKAGE = '@lilt-ui/charts';

/** How each manager adds a package, and how it runs a CLI such as shadcn without installing it. */
export const PACKAGE_MANAGERS = [
  { id: 'npm', install: 'npm install', run: 'npx' },
  { id: 'pnpm', install: 'pnpm add', run: 'pnpm dlx' },
  { id: 'yarn', install: 'yarn add', run: 'yarn dlx' },
  { id: 'bun', install: 'bun add', run: 'bunx --bun' },
] as const;

/** The shadcn command that adds a registry item, such as a Component or an ASCII scene. */
export const registryAdd = (run: string, url: string) => `${run} shadcn@latest add ${url}`;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]['id'];

export const PACKAGE_MANAGER_STORAGE_KEY = 'lilt-package-manager';

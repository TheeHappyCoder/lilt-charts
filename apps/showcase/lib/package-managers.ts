export const CHARTS_PACKAGE = '@lilt-ui/charts';

export const PACKAGE_MANAGERS = [
  { id: 'npm', install: 'npm install' },
  { id: 'pnpm', install: 'pnpm add' },
  { id: 'yarn', install: 'yarn add' },
  { id: 'bun', install: 'bun add' },
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]['id'];

export const PACKAGE_MANAGER_STORAGE_KEY = 'lilt-package-manager';

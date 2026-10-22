import {
  itemFor,
  registryRootFrom,
  resolveItems,
  sourceOf,
  TARGET_ROOT,
  type ResolvedItem,
} from '@lilt-ui/registry/items';
import { SITE_URL } from './llms';

/**
 * The registry as the docs read it: each Component and scene's item, its install URL, and every
 * file a reader would copy by hand. Read from the registry's source at build time, so the pages
 * and `/r/*.json` never disagree.
 */
const root = registryRootFrom(process.cwd());
let items: ResolvedItem[] | undefined;
const all = () => (items ??= resolveItems(root));

export interface RegistryInstall {
  url: string;
  importPath: string;
  /** The item's own files first, then each shared item's, as they land in a project. */
  files: { target: string; source: string; shared?: string }[];
}

export function registryInstall(name: string): RegistryInstall | null {
  const item = itemFor(all(), name);
  if (!item?.importPath) return null;
  const file = (path: string, shared?: string) => ({
    target: `${TARGET_ROOT}/${path}`,
    source: sourceOf(root, path),
    ...(shared ? { shared } : {}),
  });
  return {
    url: `${SITE_URL}/r/${item.name}.json`,
    importPath: item.importPath,
    files: [
      ...item.files.map((path) => file(path)),
      ...item.registryDependencies.flatMap((dependency) =>
        itemFor(all(), dependency)!.files.map((path) => file(path, dependency)),
      ),
    ],
  };
}

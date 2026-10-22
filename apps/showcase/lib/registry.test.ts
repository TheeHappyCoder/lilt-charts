import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveItems, sourceOf } from '@lilt-ui/registry/items';
import { asciiScenes } from './ascii-scenes';
import { componentDocs } from './component-docs';

const root = join(import.meta.dirname, '..', '..', '..', 'registry');
const items = resolveItems(root);

describe('registry', () => {
  it('has an ASCII item for every ASCII page', () => {
    for (const scene of asciiScenes) {
      const item = items.find((candidate) => candidate.name === scene.id);
      expect(item, scene.id).toBeDefined();
      expect(item!.component, scene.id).toBe(scene.component);
      expect(item!.section, scene.id).toBe('ascii');
    }
  });

  it('has a Components item for every Components page', () => {
    for (const doc of componentDocs) {
      const item = items.find((candidate) => candidate.name === doc.id);
      expect(item, doc.id).toBeDefined();
      expect(item!.component, doc.id).toBe(doc.component);
      expect(item!.section, doc.id).toBe('components');
    }
  });

  it('keeps Components free of ASCII: nothing drawn in type, nothing from the glyph engine', () => {
    for (const item of items.filter((candidate) => candidate.section === 'components')) {
      expect(
        item.files.every((file) => file.startsWith('ui/')),
        item.name,
      ).toBe(true);
      expect(item.registryDependencies, item.name).toEqual([]);
    }
  });

  it("exports each item's component from its entry file", () => {
    for (const item of items.filter((candidate) => candidate.component)) {
      expect(sourceOf(root, item.files[0]!), item.name).toMatch(
        new RegExp(`export (function|const) ${item.component}\\b`),
      );
    }
  });

  it('never copies the barrel or a demo, and depends only on items that exist', () => {
    const names = new Set(items.map((item) => item.name));
    for (const item of items) {
      expect(item.files, item.name).not.toContain('ascii/index.ts');
      expect(
        item.files.some((file) => file.includes('/demos/')),
        item.name,
      ).toBe(false);
      for (const dependency of item.registryDependencies) expect(names).toContain(dependency);
    }
  });
});

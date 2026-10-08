import { readField, readNumber } from './observations-card';

export interface Branch<Row> {
  id: string;
  label: string;
  depth: number;
  value: number;
  datum: Row | null;
  children: Branch<Row>[];
}
/** Leaf-only paths avoid ambiguous parent totals and reject ancestor/leaf collisions. */
export function hierarchy<Row>(
  data: readonly Row[],
  path: string,
  value: string,
): Branch<Row> | string {
  const root: Branch<Row> = { id: '', label: '', depth: 0, value: 0, datum: null, children: [] };
  const seen = new Set<string>();
  for (const row of data) {
    const raw = readField(row, path),
      v = readNumber(row, value);
    if (typeof raw !== 'string' || raw.split('/').some((p) => !p.trim()))
      return 'Paths need nonempty segments separated by /.';
    if (seen.has(raw)) return 'Hierarchy paths must be unique.';
    seen.add(raw);
    if (v !== null && v < 0) return 'Hierarchy values must be nonnegative.';
    const parts = raw.split('/');
    if (parts.length > 8) return 'A hierarchy can contain at most eight levels.';
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      if (node.datum !== null) return 'A path cannot be both a leaf and an ancestor.';
      const id = parts.slice(0, i + 1).join('/');
      let child = node.children.find((n) => n.id === id);
      if (!child) {
        child = { id, label: parts[i]!, depth: i + 1, value: 0, datum: null, children: [] };
        node.children.push(child);
      }
      node = child;
    }
    if (node.children.length) return 'A path cannot be both a leaf and an ancestor.';
    node.datum = row;
    node.value = v ?? 0;
  }
  const total = (node: Branch<Row>): number =>
    node.children.length
      ? (node.value = node.children.reduce((s, n) => s + total(n), 0))
      : node.value;
  total(root);
  if (!Number.isFinite(root.value)) return 'Hierarchy total exceeds the finite numeric range.';
  return root;
}

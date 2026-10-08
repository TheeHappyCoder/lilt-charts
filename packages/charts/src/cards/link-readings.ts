import { readField, readNumber } from './observations-card';
import { identity } from './sculpted-geometry';

export function linkReadings<Row>(
  data: readonly Row[],
  source: string,
  target: string,
  value: string,
) {
  const names: string[] = [];
  const seen = new Set<string>();
  const links: { id: string; source: string; target: string; value: number | null; datum: Row }[] =
    [];
  for (const datum of data) {
    const from = readField(datum, source);
    const to = readField(datum, target);
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to)
      return { names, links, error: 'Each link needs nonempty text source and target names.' };
    if (from === to) return { names, links, error: 'Source and target must differ.' };
    const id = identity(from, to);
    if (seen.has(id))
      return {
        names,
        links,
        error: 'Each directed pair needs one row; aggregate duplicates first.',
      };
    seen.add(id);
    const amount = readNumber(datum, value);
    if (amount !== null && amount < 0)
      return { names, links, error: 'Link values cannot be negative.' };
    for (const name of [from, to]) if (!names.includes(name)) names.push(name);
    links.push({ id, source: from, target: to, value: amount, datum });
  }
  return { names, links };
}

export const placeholderLinks = [
  { source: 'A', target: 'B', value: 32 },
  { source: 'A', target: 'C', value: 20 },
  { source: 'B', target: 'D', value: 27 },
  { source: 'C', target: 'D', value: 17 },
  { source: 'D', target: 'E', value: 24 },
  { source: 'E', target: 'A', value: 14 },
];

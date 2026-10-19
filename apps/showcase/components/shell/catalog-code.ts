import { groupsByTab } from './nav-model';

/** Two letters per job, so every chart family has a part number like TR-01. */
const JOB_CODES: Readonly<Record<string, string>> = {
  Trends: 'TR',
  Comparison: 'CO',
  'Part of a whole': 'PW',
  KPIs: 'KP',
  Patterns: 'PA',
  Cool: 'CL',
  Finance: 'FI',
};

/** A family's part number: its job's letters and its place in that job, or null off the list. */
export function catalogCode(href: string): string | null {
  for (const group of groupsByTab.charts) {
    const index = group.routes.findIndex((route) => route.href === href);
    if (index >= 0) {
      const letters = JOB_CODES[group.heading ?? ''] ?? 'LC';
      return `${letters}-${String(index + 1).padStart(2, '0')}`;
    }
  }
  return null;
}

import type { PropRow } from './content';
import { observationProps } from './observation-variants';

/** The legend rows an observation family keeps when its data has groups to name. */
export const legendProps: readonly PropRow[] = [
  {
    name: 'legend',
    type: "false | 'tiles' | 'inline' | 'list' | 'pills' | 'bars'",
    description: 'Group legend layout. Off by default, since the tiles carry their own color.',
  },
  {
    name: 'legendSwatch',
    type: "'square' | 'dot' | 'line'",
    description: 'Legend marker; square by default.',
  },
];

/** An observation family's props: its own first, then the shared rows it accepts. */
export function observationPropsFor(
  own: readonly PropRow[],
  { omit = [], extra = [] }: { omit?: readonly string[]; extra?: readonly PropRow[] } = {},
): readonly PropRow[] {
  return [...own, ...observationProps.filter((row) => !omit.includes(row.name)), ...extra];
}

/** Money with cents, for prices. */
export const usd = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

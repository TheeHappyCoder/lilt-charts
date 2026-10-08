'use client';

import { StatCard, type ChartPalette } from '@lilt-ui/charts';
import '@lilt-ui/charts/styles.css';

type Day = { day: number; active: number };
const rows: Day[] = [812, 840, 828, 873, 891, 885, 917, 942, 930, 968, 1002, 984, 1035, 1068].map(
  (active, index) => ({ day: index + 1, active }),
);
export { rows as compactMetricRows };
const count = new Intl.NumberFormat('en-US');

export function CompactMetric({
  palette = 'emerald',
  layout = 'roomy',
}: {
  palette?: ChartPalette;
  layout?: 'roomy' | 'compact';
} = {}) {
  return (
    <StatCard
      title="Active accounts"
      aria-label="Active accounts over the last 14 days"
      data={rows}
      x="day"
      value="active"
      aggregate="last"
      delta={rows.at(-1)!.active / rows[0]!.active - 1}
      caption="since day 1"
      chart="area"
      height={layout === 'compact' ? 80 : 104}
      palette={palette}
      formatValue={count.format}
      formatX={(value) => `Day ${value}`}
      style={{ maxWidth: 460 }}
    />
  );
}

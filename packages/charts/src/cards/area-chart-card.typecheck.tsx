import { AreaChartCard, BarChartCard, LineChartCard } from '../index';

const rows = [
  { month: 'Jan', organic: 2400, referral: 1200 as number | null, note: 'launch' },
  { month: 'Feb', organic: 2800, referral: 1400 as number | null, note: '' },
];

export const valid = (
  <AreaChartCard
    title="Visitors"
    data={rows}
    x="month"
    series={[{ key: 'organic' }, { key: 'referral', label: 'Referral' }]}
    stack
    delta={0.082}
  />
);

export const wrongKey = (
  // @ts-expect-error Series keys must be numeric fields of the row.
  <AreaChartCard title="V" data={rows} x="month" series={[{ key: 'organc' }]} />
);

export const textSeries = (
  // @ts-expect-error A text field cannot be plotted as a series.
  <AreaChartCard title="V" data={rows} x="month" series={[{ key: 'note' }]} />
);

export const wrongX = (
  // @ts-expect-error The x field must exist on the row.
  <AreaChartCard title="V" data={rows} x="mnth" series={[{ key: 'organic' }]} />
);

export const ranged = (
  <AreaChartCard
    title="Visitors"
    x="month"
    series={[{ key: 'organic' }]}
    ranges={[
      { id: 'year', label: 'This year', data: rows, delta: 0.08 },
      { id: 'prev', label: 'Last year', data: rows },
    ]}
  />
);

export const lineCard = (
  <LineChartCard
    title="V"
    data={rows}
    x="month"
    series={[{ key: 'organic' }]}
    curve="step"
    points
  />
);

export const lineTypo = (
  // @ts-expect-error Line series keys are checked against the row too.
  <LineChartCard title="V" data={rows} x="month" series={[{ key: 'organc' }]} />
);

export const barCard = (
  <BarChartCard title="V" data={rows} x="month" series={[{ key: 'organic' }]} stack />
);

export const barTypo = (
  // @ts-expect-error Bar variants are a closed set.
  <BarChartCard title="V" data={rows} x="month" series={[{ key: 'organic' }]} variant="overlap" />
);

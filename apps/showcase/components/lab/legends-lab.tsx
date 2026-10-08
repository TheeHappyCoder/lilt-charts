'use client';

import {
  AreaChartCard,
  BarChartCard,
  FunnelChartCard,
  LineChartCard,
  RadialChartCard,
  type CardLegend,
  type ChartLegendSwatch,
} from '@lilt-ui/charts';
import {
  channelRevenue,
  dailySessions,
  orders,
  signupFunnel,
  visitors,
} from '@/lib/card-docs/data';
import { LabStudio, type LabOption } from './lab-studio';
import { Tile } from './lab-scenes';

const layouts: readonly LabOption<CardLegend>[] = [
  { value: 'tiles', label: 'Tiles', note: 'A value tile per series. The default.' },
  { value: 'inline', label: 'Inline', note: 'A quiet key: mark and name.' },
  { value: 'list', label: 'List', note: 'Rows with each value aligned right.' },
  { value: 'pills', label: 'Pills', note: 'Chips tinted with their own color.' },
  { value: 'bars', label: 'Bars', note: 'Each value with a bar against the largest.' },
];

const swatches: readonly LabOption<ChartLegendSwatch>[] = [
  { value: 'square', label: 'Square', note: 'A rounded square. The default.' },
  { value: 'dot', label: 'Dot', note: 'A round mark, for points and slices.' },
  { value: 'line', label: 'Line', note: 'A short stroke, for line charts.' },
];

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const visitorSeries = [
  { key: 'organic', label: 'Organic' },
  { key: 'referral', label: 'Referral' },
  { key: 'paid', label: 'Paid' },
] as const;
const platformSeries = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
] as const;
const channelSeries = [
  { key: 'online', label: 'Online' },
  { key: 'retail', label: 'Retail' },
] as const;
const recentOrders = orders.slice(-6);

/** The same cards with every legend in one layout and one mark. */
function Scene({ legend, swatch }: { legend: CardLegend; swatch?: ChartLegendSwatch }) {
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        <AreaChartCard
          title="Visitors"
          data={visitors}
          x="month"
          series={visitorSeries}
          stack
          delta={0.184}
          legend={legend}
          legendSwatch={swatch}
        />
      </Tile>
      <Tile span="third">
        <RadialChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          legend={legend}
          legendSwatch={swatch}
        />
      </Tile>
      <Tile span="half">
        <LineChartCard
          title="Active users"
          data={dailySessions}
          x="date"
          series={platformSeries}
          delta={0.126}
          legend={legend}
          legendSwatch={swatch}
        />
      </Tile>
      <Tile span="half">
        <BarChartCard
          title="Orders"
          data={recentOrders}
          x="month"
          series={channelSeries}
          delta={0.143}
          legend={legend}
          legendSwatch={swatch}
        />
      </Tile>
      <Tile span="wide">
        <FunnelChartCard
          title="Sign-up funnel"
          data={signupFunnel}
          category="stage"
          value="people"
          delta={0.052}
          legend={legend}
          legendSwatch={swatch}
        />
      </Tile>
    </div>
  );
}

export function LegendsLab() {
  return (
    <>
      <LabStudio
        label="Legend"
        prop="legend"
        options={layouts}
        defaultValue="tiles"
        scene={(legend) => <Scene legend={legend} />}
        compare={(legend) => (
          <BarChartCard
            title="Orders"
            data={recentOrders}
            x="month"
            series={channelSeries}
            legend={legend}
            height={160}
          />
        )}
      />
      <LabStudio
        label="Legend swatch"
        prop="legendSwatch"
        options={swatches}
        defaultValue="square"
        scene={(swatch) => <Scene legend="pills" swatch={swatch} />}
        compare={(swatch) => (
          <LineChartCard
            title="Active users"
            data={dailySessions}
            x="date"
            series={platformSeries}
            legend="list"
            legendSwatch={swatch}
            height={160}
          />
        )}
      />
    </>
  );
}

'use client';

import { AreaChartCard } from '@lilt-ui/charts';
import {
  AsciiArea,
  AsciiBars,
  AsciiClock,
  AsciiHeatmap,
  AsciiSparklineDemo,
} from '@lilt-ui/registry';
import { HomeTile } from './home-tile';

/** A year of visitors: one set of numbers for both voices. */
const visitors = [
  { month: 'Jan', visitors: 18400 },
  { month: 'Feb', visitors: 21200 },
  { month: 'Mar', visitors: 19800 },
  { month: 'Apr', visitors: 26100 },
  { month: 'May', visitors: 24300 },
  { month: 'Jun', visitors: 31800 },
  { month: 'Jul', visitors: 29500 },
  { month: 'Aug', visitors: 36200 },
  { month: 'Sep', visitors: 41900 },
  { month: 'Oct', visitors: 39400 },
  { month: 'Nov', visitors: 47800 },
  { month: 'Dec', visitors: 53600 },
];

/**
 * Data in both voices: the same year as a chart card and set in type, side by side, then the
 * rest of the charts that are drawn in type.
 */
export function HomeData() {
  return (
    <div className="lilt-bento" data-layout="data">
      <HomeTile
        area="card"
        href="/charts/area"
        name="Area chart"
        hint="@lilt-ui/charts · the year as a card"
        tone="room"
        floor
        live
      >
        <AreaChartCard
          title="Visitors"
          data={visitors}
          x="month"
          series={[{ key: 'visitors', label: 'Visitors' }]}
          surface="ghost"
          tiles={false}
          height={300}
        />
      </HomeTile>
      <HomeTile
        area="type"
        href="/ascii/area"
        name="ASCII area"
        hint="ASCII · the same year in type, as source you own"
        floor
        live
      >
        <AsciiArea
          data={visitors.map((row) => row.visitors)}
          labels={visitors.map((row) => row.month)}
          color="#a58bff"
          cellSize={13}
          label="Visitors by month, set in type: from 18,400 in January to 53,600 in December"
        />
      </HomeTile>
      <HomeTile area="bars" href="/ascii/bars" name="Bars" hint="Hover a month" floor live>
        <AsciiBars color="#e5489c" cellSize={12} />
      </HomeTile>
      <HomeTile
        area="heatmap"
        href="/ascii/heatmap"
        name="Calendar heatmap"
        hint="A year of days, one glyph each"
        floor
        live
      >
        <AsciiHeatmap color="#3cc9a8" cellSize={11} />
      </HomeTile>
      <HomeTile
        area="spark"
        href="/ascii/sparkline"
        name="Sparkline"
        hint="A chart the size of a word"
        center
        live
      >
        <AsciiSparklineDemo />
      </HomeTile>
      <HomeTile area="clock" href="/ascii/clock" name="Clock" hint="Only changed cells scramble">
        <AsciiClock cellSize={8} />
      </HomeTile>
    </div>
  );
}

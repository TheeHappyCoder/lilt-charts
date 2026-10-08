'use client';

import { AreaChartCard, BarChartCard, LineChartCard } from '@lilt-ui/charts';
import { LabStudio } from '@/components/lab/lab-studio';
import { Tile } from '@/components/lab/lab-scenes';
import {
  dailyKpis,
  dailyRevenue,
  dailySessions,
  latency,
  revenueForecast,
} from '@/lib/card-docs/data';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const percent = { style: 'percent', maximumFractionDigits: 1 } as const;
const ms = (value: number) => `${Math.round(value)} ms`;

/** Four families on one name: hovering any of them moves them all. */
function KpiCards({ sync }: { sync: string }) {
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        <AreaChartCard
          sync={sync}
          title="Revenue"
          data={dailyKpis}
          x="date"
          series={[{ key: 'revenue', label: 'Revenue' }]}
          valueFormat={usd}
        />
      </Tile>
      <Tile span="third">
        <LineChartCard
          sync={sync}
          title="Active users"
          data={dailyKpis}
          x="date"
          series={[{ key: 'activeUsers', label: 'Active users' }]}
          aggregate="mean"
          tiles={false}
        />
      </Tile>
      <Tile span="half">
        <BarChartCard
          sync={sync}
          title="Orders"
          data={dailyKpis}
          x="date"
          series={[{ key: 'orders', label: 'Orders' }]}
          tiles={false}
        />
      </Tile>
      <Tile span="half">
        <LineChartCard
          sync={sync}
          title="Conversion"
          data={dailyKpis}
          x="date"
          series={[{ key: 'conversion', label: 'Conversion' }]}
          aggregate="mean"
          valueFormat={percent}
          tiles={false}
        />
      </Tile>
    </div>
  );
}

export function SyncLab() {
  return (
    <LabStudio
      label="Sync hover"
      prop="sync"
      options={[
        { value: 'kpis', label: 'Linked', note: 'Hover one card; every card reads that day.' },
      ]}
      defaultValue="kpis"
      scene={(sync) => <KpiCards sync={sync} />}
    />
  );
}

export function PinLab() {
  return (
    <LabStudio
      label="Pin"
      prop="pin"
      options={[
        {
          value: 'pin',
          label: 'Pin',
          note: 'Click pins every linked chart. Alt-click pins just one.',
        },
      ]}
      defaultValue="pin"
      code={() => null}
      scene={() => <KpiCards sync="pin" />}
    />
  );
}

function RevenueCard({ compare }: { compare: 'headline' | 'badge' }) {
  return (
    <AreaChartCard
      compare={compare}
      title="Revenue"
      data={dailyRevenue}
      x="date"
      series={[{ key: 'revenue', label: 'Revenue' }]}
      valueFormat={usd}
    />
  );
}

export function CompareLab() {
  return (
    <LabStudio
      label="Compare"
      prop="compare"
      options={[
        {
          value: 'headline',
          label: 'Headline',
          note: 'Drag across a chart; the headline reads the change.',
        },
        {
          value: 'badge',
          label: 'Badge',
          note: 'The change reads in the tab; the headline stays put.',
        },
      ]}
      defaultValue="headline"
      scene={(compare) => (
        <div className="lilt-studio__bento">
          <Tile span="wide">
            <RevenueCard compare={compare} />
          </Tile>
          <Tile span="third">
            <LineChartCard
              compare={compare}
              title="Daily users"
              data={dailySessions}
              x="date"
              series={[
                { key: 'desktop', label: 'Desktop' },
                { key: 'mobile', label: 'Mobile' },
              ]}
              tiles={false}
            />
          </Tile>
        </div>
      )}
      compare={(compare) => <RevenueCard compare={compare} />}
    />
  );
}

type Goal = 'target' | 'forecast';

function GoalCard({ goal }: { goal: Goal }) {
  return goal === 'target' ? (
    <BarChartCard
      title="Orders"
      data={dailyKpis}
      x="date"
      series={[{ key: 'orders', label: 'Orders' }]}
      target={{ value: 100, label: 'Goal' }}
      tiles={false}
    />
  ) : (
    <LineChartCard
      title="Revenue"
      data={revenueForecast}
      x="date"
      series={[{ key: 'revenue', label: 'Revenue' }]}
      valueFormat={usd}
      forecast={{ from: new Date('2026-09-22'), lower: 'low', upper: 'high' }}
      tiles={false}
    />
  );
}

export function TargetsLab() {
  return (
    <LabStudio
      label="Targets and forecasts"
      prop="target"
      options={[
        {
          value: 'target',
          label: 'Target',
          note: 'A goal line, and a count of days that reach it.',
        },
        {
          value: 'forecast',
          label: 'Forecast',
          note: 'Projected days, dotted, inside their range.',
        },
      ]}
      defaultValue="target"
      code={(goal: Goal) =>
        goal === 'target' ? 'target={100}' : 'forecast={{ from, lower, upper }}'
      }
      scene={(goal) => (
        <div className="lilt-studio__bento">
          <Tile span="wide">
            <GoalCard goal={goal} />
          </Tile>
          <Tile span="third">
            {goal === 'target' ? (
              <LineChartCard
                title="p95 latency"
                data={latency}
                x="hour"
                series={[{ key: 'p95', label: 'p95' }]}
                aggregate="mean"
                formatValue={ms}
                target={{ value: 350, label: 'Budget' }}
                deltaTone="inverse"
                tiles={false}
              />
            ) : (
              <AreaChartCard
                title="Revenue"
                data={revenueForecast}
                x="date"
                series={[{ key: 'revenue', label: 'Revenue' }]}
                valueFormat={usd}
                forecast={{ from: new Date('2026-09-22') }}
                tiles={false}
              />
            )}
          </Tile>
        </div>
      )}
      compare={(goal) => <GoalCard goal={goal} />}
    />
  );
}

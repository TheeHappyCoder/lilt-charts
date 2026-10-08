'use client';

import Link from 'next/link';
import {
  ActivityRingCard,
  BarChartCard,
  BoxPlotCard,
  FunnelChartCard,
  HeatmapChartCard,
  HorizontalBarChartCard,
  LineChartCard,
  ProgressCard,
  RadialChartCard,
  RangeChartCard,
  SankeyChartCard,
  ScatterChartCard,
  SlopeChartCard,
  StatCard,
} from '@lilt-ui/charts';
import {
  CandlestickChartCard,
  DepthChartCard,
  OrderBook,
  PriceChartCard,
} from '@lilt-ui/charts/finance';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { isometricBarExample } from '@/lib/card-docs/bar';
import {
  campaignResults,
  channelRevenue,
  cityTemperature,
  dailyKpis,
  dailySessions,
  orders,
  regionLatency,
  regionRevenue,
  requestRhythm,
  signupFunnel,
  solBook,
  solQuarter,
  tokenPrices,
  visitorFlow,
  weeklyActivity,
} from '@/lib/card-docs/data';
import { LabStudio, type LabOption } from './lab-studio';
import { Tile } from './lab-scenes';

type Look = 'flat' | 'depth';

const options: readonly LabOption<Look>[] = [
  { value: 'flat', label: 'Flat', note: 'The familiar charts, in the same cards.' },
  { value: 'depth', label: '3D', note: 'Blocks, tubes, spheres, and tiles. The same data.' },
];

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const celsius = { style: 'unit', unit: 'celsius', maximumFractionDigits: 1 } as const;
const ms = { style: 'unit', unit: 'millisecond', maximumFractionDigits: 0 } as const;
const channelSeries = [
  { key: 'online', label: 'Online' },
  { key: 'retail', label: 'Retail' },
] as const;
const platformSeries = [
  { key: 'desktop', label: 'Desktop' },
  { key: 'mobile', label: 'Mobile' },
] as const;
const recentOrders = orders.slice(-6);
const recentKpis = dailyKpis.slice(-12);
const recentCandles = solQuarter.slice(-32);

function Hero({ depth }: { depth: boolean }) {
  return (
    <CardExamplePreview
      example={{
        ...isometricBarExample,
        props: { ...isometricBarExample.props, depth },
      }}
    />
  );
}

/** Every family that can carry depth, on one stage, switched by one prop. */
function Scene({ depth }: { depth: boolean }) {
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        <Hero depth={depth} />
      </Tile>
      <Tile span="third">
        <StatCard
          title="Orders"
          data={recentKpis}
          value="orders"
          x="date"
          chart="bars"
          depth={depth}
          delta={0.153}
          caption="vs last month"
          height={180}
        />
      </Tile>

      <Tile span="third">
        <RadialChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          legend="inline"
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <RadialChartCard
          title="Channel reach"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          variant="rings"
          legend="inline"
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <ProgressCard
          title="Visitors"
          value={1260}
          target={2000}
          range="Last 7 days"
          variant="thick"
          depth={depth}
        />
      </Tile>

      <Tile span="half">
        <FunnelChartCard
          title="Sign-up funnel"
          data={signupFunnel}
          category="stage"
          value="people"
          delta={0.052}
          depth={depth}
        />
      </Tile>
      <Tile span="half">
        <HorizontalBarChartCard
          title="Revenue by channel"
          data={channelRevenue}
          category="channel"
          value="revenue"
          valueFormat={usd}
          depth={depth}
        />
      </Tile>

      <Tile span="third">
        <RangeChartCard
          title="Temperature by month"
          data={cityTemperature}
          x="month"
          low="low"
          high="high"
          value="mean"
          label="Mean"
          valueFormat={celsius}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <BoxPlotCard
          title="Response time by region"
          data={regionLatency}
          x="region"
          samples="samples"
          valueFormat={ms}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <div className="lilt-studio__stack">
          <StatCard
            title="Revenue"
            data={recentKpis}
            value="revenue"
            x="date"
            chart="meter"
            target={120000}
            valueFormat={usd}
            depth={depth}
          />
          <StatCard
            title="Orders"
            data={recentKpis}
            value="orders"
            x="date"
            chart="ring"
            target={2400}
            delta={0.153}
            depth={depth}
          />
        </div>
      </Tile>

      <Tile span="wide">
        <CandlestickChartCard
          title="SOL · USDC"
          data={recentCandles}
          x="date"
          open="open"
          high="high"
          low="low"
          close="close"
          valueFormat={usd}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <ActivityRingCard
          title="Request rhythm"
          data={requestRhythm}
          hour="hour"
          value="requests"
          bucketMinutes={40}
          height={240}
          depth={depth}
        />
      </Tile>

      <Tile span="wide">
        <LineChartCard
          title="Active users"
          data={dailySessions}
          x="date"
          series={platformSeries}
          delta={0.126}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <StatCard
          title="Revenue"
          data={recentKpis}
          value="revenue"
          x="date"
          chart="area"
          valueFormat={usd}
          delta={0.124}
          caption="vs last month"
          depth={depth}
        />
      </Tile>

      <Tile span="half">
        <ScatterChartCard
          title="Campaign results"
          data={campaignResults}
          x="spend"
          y="signups"
          size="reach"
          sizeLabel="Reach"
          group="channel"
          label="campaign"
          xLabel="Spend"
          yLabel="Sign-ups"
          xFormat={usd}
          depth={depth}
        />
      </Tile>
      <Tile span="half">
        <SlopeChartCard
          title="Revenue by region"
          data={regionRevenue}
          category="region"
          from="lastYear"
          to="thisYear"
          fromLabel="Before"
          toLabel="After"
          valueFormat={usd}
          depth={depth}
        />
      </Tile>

      <Tile span="half">
        <HeatmapChartCard
          title="Audience activity"
          data={weeklyActivity}
          x="hour"
          y="day"
          value="sessions"
          depth={depth}
        />
      </Tile>
      <Tile span="half">
        <SankeyChartCard
          title="Visitor flow"
          data={visitorFlow}
          source="from"
          target="to"
          value="visitors"
          depth={depth}
        />
      </Tile>

      <Tile span="third">
        <SlopeChartCard
          title="Revenue by region"
          data={regionRevenue}
          category="region"
          from="lastYear"
          to="thisYear"
          fromLabel="Before"
          toLabel="After"
          valueFormat={usd}
          variant="dumbbell"
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <OrderBook
          title="SOL order book"
          bids={solBook.bids}
          asks={solBook.asks}
          levels={6}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <DepthChartCard
          title="SOL · USDC"
          bids={solBook.bids}
          asks={solBook.asks}
          valueFormat={usd}
          depth={depth}
        />
      </Tile>

      <Tile span="wide">
        <PriceChartCard
          title="Solana price"
          symbol="SOL"
          name="Solana"
          data={tokenPrices}
          x="date"
          price="sol"
          valueFormat={usd}
          depth={depth}
        />
      </Tile>
      <Tile span="third">
        <StatCard
          title="Orders"
          data={recentKpis}
          value="orders"
          x="date"
          chart="line"
          delta={0.153}
          caption="vs last month"
          depth={depth}
        />
      </Tile>

      <Tile span="half">
        <BarChartCard
          title="Orders"
          data={recentOrders}
          x="month"
          series={channelSeries}
          stack
          depth={depth}
          delta={0.143}
          height={220}
        />
      </Tile>
      <Tile span="half">
        <BarChartCard
          title="Orders by channel"
          data={recentOrders}
          x="month"
          series={channelSeries}
          depth={depth}
          delta={0.143}
          height={220}
        />
      </Tile>
    </div>
  );
}

export function ThreeDLab() {
  return (
    <>
      <LabStudio
        label="Depth"
        prop="depth"
        options={options}
        defaultValue="depth"
        code={(look) => (look === 'depth' ? 'depth' : null)}
        scene={(look) => <Scene depth={look === 'depth'} />}
        compare={(look) => <Hero depth={look === 'depth'} />}
      />
      <p className="lilt-studio__note">
        Hover to inspect. Click to pin. Blocks keep their measured front; rings keep their exact
        angle. <Link href="/charts/bar#isometric">Get the Bar chart code →</Link>
      </p>
    </>
  );
}

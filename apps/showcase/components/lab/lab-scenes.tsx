'use client';

import {
  AreaChartCard,
  BarChartCard,
  ComboChartCard,
  FunnelChartCard,
  LineChartCard,
  RadialChartCard,
  StatCard,
  type ChartAxis,
  type ChartAxisStyle,
  type ChartBackground,
  type ChartPalette,
  type ChartHoverReadout,
  type ChartHoverStyle,
  type ChartSurface,
  type ChartTooltipIndicator,
} from '@lilt-ui/charts';
import type { ReactNode } from 'react';
import {
  channelRevenue,
  dailyKpis,
  dailyRevenue,
  dailySessions,
  finance,
  latency,
  orders,
  signupFunnel,
  visitors,
} from '@/lib/card-docs/data';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const visitorSeries = [
  { key: 'organic', label: 'Organic' },
  { key: 'referral', label: 'Referral' },
  { key: 'paid', label: 'Paid' },
] as const;
const channelSeries = [
  { key: 'online', label: 'Online' },
  { key: 'retail', label: 'Retail' },
] as const;

/** A stand-in for the reader's own card, so a frameless `ghost` chart has something to sit in. */
export function HostFrame({ children }: { children: ReactNode }) {
  return (
    <div className="lilt-studio__host">
      <div className="lilt-studio__host-bar">
        <span>Your card</span>
        <span className="lilt-studio__host-dot" />
      </div>
      {children}
    </div>
  );
}

export function Tile({ span, children }: { span: 'wide' | 'third' | 'half'; children: ReactNode }) {
  return (
    <div className="lilt-studio__tile" data-span={span}>
      {children}
    </div>
  );
}

/** Mixed card families for settings every card shares: palette and surface. */
export function EnsembleScene({
  palette,
  surface = 'elevated',
}: {
  palette?: ChartPalette;
  surface?: ChartSurface;
}) {
  const shared = { palette, surface };
  const wrap = (card: ReactNode) => (surface === 'ghost' ? <HostFrame>{card}</HostFrame> : card);
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        {wrap(
          <AreaChartCard
            {...shared}
            title="Visitors"
            data={visitors}
            x="month"
            series={visitorSeries}
            stack
            delta={0.184}
            range="This year"
            height={320}
          />,
        )}
      </Tile>
      <Tile span="third">
        {wrap(
          <RadialChartCard
            {...shared}
            title="Revenue by channel"
            data={channelRevenue}
            category="channel"
            value="revenue"
            valueFormat={usd}
            legend="inline"
          />,
        )}
      </Tile>
      <Tile span="third">
        {wrap(
          <StatCard
            {...shared}
            title="Revenue"
            data={dailyKpis}
            value="revenue"
            x="date"
            valueFormat={usd}
            delta={0.124}
            caption="vs last month"
            height={210}
          />,
        )}
      </Tile>
      <Tile span="third">
        {wrap(
          <BarChartCard
            {...shared}
            title="Orders"
            data={orders}
            x="month"
            series={channelSeries}
            tiles={false}
            height={236}
            delta={0.143}
          />,
        )}
      </Tile>
      <Tile span="third">
        {wrap(
          <FunnelChartCard
            {...shared}
            title="Sign-up funnel"
            data={signupFunnel}
            category="stage"
            value="people"
            height={110}
          />,
        )}
      </Tile>
    </div>
  );
}

/**
 * Cartesian cards for plot settings: axes, backgrounds, and hover. A `mixed` hover gives half the
 * cards a tooltip and half pills, so one style can be judged on both.
 */
export function CartesianScene({
  axis,
  background,
  hover,
  hoverStyle,
  tooltipIndicator,
}: {
  axis?: ChartAxisStyle;
  background?: ChartBackground;
  hover?: ChartHoverReadout | 'mixed';
  hoverStyle?: ChartHoverStyle;
  tooltipIndicator?: ChartTooltipIndicator;
}) {
  const shared = { axis, background, hoverStyle, tooltipIndicator };
  const readout = (mixed: ChartHoverReadout) => (hover === 'mixed' ? mixed : hover);
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        <AreaChartCard
          {...shared}
          hover={readout('tooltip')}
          title="Visitors"
          data={visitors}
          x="month"
          series={visitorSeries}
          stack
          delta={0.184}
          range="This year"
        />
      </Tile>
      <Tile span="third">
        <LineChartCard
          {...shared}
          hover={readout('pills')}
          title="Daily users"
          data={dailySessions}
          x="date"
          series={[
            { key: 'desktop', label: 'Desktop' },
            { key: 'mobile', label: 'Mobile' },
          ]}
          tiles={false}
          height={336}
        />
      </Tile>
      <Tile span="half">
        <BarChartCard
          {...shared}
          hover={readout('pills')}
          title="Orders"
          data={orders}
          x="month"
          series={channelSeries}
          stack
          tiles={false}
          height={170}
          delta={0.143}
        />
      </Tile>
      <Tile span="half">
        <ComboChartCard
          {...shared}
          hover={readout('tooltip')}
          title="Revenue against budget"
          data={finance}
          x="month"
          valueFormat={usd}
          bars={[{ key: 'revenue', label: 'Revenue' }]}
          lines={[{ key: 'budget', label: 'Budget', dashed: true }]}
          tiles={false}
          height={170}
        />
      </Tile>
    </div>
  );
}

const ms = (value: number) => `${Math.round(value)} ms`;

/** Latency on a segmented y axis, where a color scale reads as a range from good to bad. */
export function ScaleScene({ axis }: { axis: ChartAxis }) {
  return (
    <div className="lilt-studio__bento">
      <Tile span="wide">
        <LineChartCard
          axis={axis}
          title="p95 latency"
          data={latency}
          x="hour"
          series={[{ key: 'p95', label: 'p95' }]}
          aggregate="mean"
          formatValue={ms}
          deltaTone="inverse"
        />
      </Tile>
      <Tile span="third">
        <LineChartCard
          axis={axis}
          title="p50 latency"
          data={latency}
          x="hour"
          series={[{ key: 'p50', label: 'p50' }]}
          aggregate="mean"
          formatValue={ms}
          deltaTone="inverse"
          tiles={false}
        />
      </Tile>
    </div>
  );
}

/** One latency card for the side-by-side comparison of axis scales. */
export function ScaleCard({ axis }: { axis: ChartAxis }) {
  return (
    <LineChartCard
      axis={axis}
      title="p95 latency"
      data={latency}
      x="hour"
      series={[{ key: 'p95', label: 'p95' }]}
      aggregate="mean"
      formatValue={ms}
      tiles={false}
      height={190}
    />
  );
}

/** One compact card for a side-by-side comparison cell. */
export function CompareCard({
  palette,
  surface,
  axis,
  background,
  hover,
  hoverStyle,
  tooltipIndicator,
}: {
  palette?: ChartPalette;
  surface?: ChartSurface;
  axis?: ChartAxisStyle;
  background?: ChartBackground;
  hover?: ChartHoverReadout;
  hoverStyle?: ChartHoverStyle;
  tooltipIndicator?: ChartTooltipIndicator;
}) {
  // Palettes and hover need several series to show; the rest read best on one clean line.
  const card = hover ? (
    <AreaChartCard
      hover={hover}
      hoverStyle={hoverStyle}
      tooltipIndicator={tooltipIndicator}
      title="Visitors"
      data={visitors}
      x="month"
      series={visitorSeries}
      tiles={false}
      height={190}
    />
  ) : palette ? (
    <AreaChartCard
      palette={palette}
      title="Visitors"
      data={visitors}
      x="month"
      series={visitorSeries}
      stack
      height={150}
    />
  ) : (
    <AreaChartCard
      surface={surface}
      axis={axis}
      background={background}
      title="Revenue"
      data={dailyRevenue}
      x="date"
      series={[{ key: 'revenue', label: 'Revenue' }]}
      valueFormat={usd}
      tiles={false}
      height={150}
    />
  );
  return surface === 'ghost' ? <HostFrame>{card}</HostFrame> : card;
}

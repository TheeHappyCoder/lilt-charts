'use client';

import { HugeiconsIcon as Icon, type IconSvgElement } from '@hugeicons/react';
import RefreshIcon from '@hugeicons/core-free-icons/RefreshIcon';
import RotateClockwiseIcon from '@hugeicons/core-free-icons/RotateClockwiseIcon';
import { AreaChartCard, BarChartCard, LineChartCard, type ChartMotion } from '@lilt-ui/charts';
import { useReducedMotion } from 'motion/react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useChartSettings } from '@/components/docs/chart-settings';
import { Switch } from '@/components/ui/segmented';
import {
  dailyRevenue,
  lastYearOrders,
  orders,
  visitors,
  type OrderMonth,
} from '@/lib/card-docs/data';

const usd = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;
const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const formatDay = (value: string | number | Date) => dayFormat.format(new Date(value));

/** The page's own reduced-motion preview, so a reader can see every demo settle without the OS. */
const PreviewContext = createContext<{ reduced: boolean; setReduced: (next: boolean) => void }>({
  reduced: false,
  setReduced: () => {},
});

export function MotionPreview({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(false);
  return (
    <PreviewContext.Provider value={{ reduced, setReduced }}>{children}</PreviewContext.Provider>
  );
}

/** What every demo card shares: the site-wide settings, and motion as the page preview sets it. */
function useDemoProps() {
  const { settings } = useChartSettings();
  const { reduced } = useContext(PreviewContext);
  const motion: ChartMotion = reduced ? 'none' : 'auto';
  return {
    palette: settings.palette,
    surface: settings.surface,
    background: settings.background,
    axis: settings.axis,
    numberStyle: settings.numberStyle,
    loadingStyle: settings.loadingStyle,
    motion,
  };
}

function DemoAction({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="lilt-behavior__action" onClick={onClick} disabled={disabled}>
      <Icon icon={icon} aria-hidden="true" size={14} />
      {label}
    </button>
  );
}

export function EntranceDemo() {
  const props = useDemoProps();
  const [run, setRun] = useState(0);
  return (
    <>
      <DemoAction icon={RotateClockwiseIcon} label="Replay" onClick={() => setRun(run + 1)} />
      <AreaChartCard
        key={run}
        {...props}
        title="Visitors"
        data={visitors}
        x="month"
        series={[
          { key: 'organic', label: 'Organic' },
          { key: 'referral', label: 'Referral' },
        ]}
        height={150}
        tiles={false}
      />
    </>
  );
}

/** How long the demo pretends the request takes; long enough to pass the 120ms threshold. */
const SLOW_LOAD = 1800;

export function LoadingDemo() {
  const props = useDemoProps();
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <>
      <DemoAction
        icon={RefreshIcon}
        label={loading ? 'Loading…' : 'Load slowly'}
        disabled={loading}
        onClick={() => {
          setLoading(true);
          timer.current = window.setTimeout(() => setLoading(false), SLOW_LOAD);
        }}
      />
      <BarChartCard
        {...props}
        title="Orders"
        data={orders}
        x="month"
        series={[{ key: 'online', label: 'Online' }]}
        height={150}
        tiles={false}
        loading={loading}
      />
    </>
  );
}

const years: Record<'this' | 'last', OrderMonth[]> = { this: orders, last: lastYearOrders };

export function UpdateDemo() {
  const props = useDemoProps();
  const [year, setYear] = useState<'this' | 'last'>('this');
  return (
    <>
      <DemoAction
        icon={RefreshIcon}
        label={year === 'this' ? 'Show last year' : 'Show this year'}
        onClick={() => setYear(year === 'this' ? 'last' : 'this')}
      />
      <AreaChartCard
        {...props}
        title={year === 'this' ? 'Orders this year' : 'Orders last year'}
        data={years[year]}
        x="month"
        series={[
          { key: 'online', label: 'Online' },
          { key: 'retail', label: 'Retail' },
        ]}
        stack
        height={150}
        tiles={false}
      />
    </>
  );
}

export function ReducedMotionDemo() {
  const { reduced, setReduced } = useContext(PreviewContext);
  const system = Boolean(useReducedMotion());
  return (
    <div className="lilt-behavior__toggle">
      <label className="lilt-behavior__switch">
        <Switch label="Preview reduced motion" checked={reduced} onChange={setReduced} />
        <span>Preview reduced motion</span>
      </label>
      <p>
        {reduced
          ? 'Every demo on this page now settles immediately. Replay, load and update them to compare.'
          : 'Turn it on, then replay, load and update the demos on this page.'}
      </p>
      <span className="lilt-behavior__system">
        Your system preference: {system ? 'reduce motion' : 'no preference'}
      </span>
    </div>
  );
}

export function HoverDemo() {
  const props = useDemoProps();
  return (
    <LineChartCard
      {...props}
      title="Revenue"
      data={dailyRevenue}
      x="date"
      series={[
        { key: 'revenue', label: 'This month' },
        { key: 'previous', label: 'Last month', dashed: true },
      ]}
      valueFormat={usd}
      formatX={formatDay}
      height={150}
    />
  );
}

const KEYS = [
  { key: 'ArrowLeft', label: '←', name: 'Left' },
  { key: 'ArrowRight', label: '→', name: 'Right' },
  { key: 'ArrowUp', label: '↑', name: 'Up' },
  { key: 'ArrowDown', label: '↓', name: 'Down' },
  { key: 'Enter', label: 'Enter', name: 'Enter' },
  { key: 'Escape', label: 'Esc', name: 'Escape' },
] as const;

export function KeyboardDemo() {
  const props = useDemoProps();
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div
      className="lilt-behavior__keyboard"
      onKeyDownCapture={(event) => {
        if (!KEYS.some((item) => item.key === event.key)) return;
        window.clearTimeout(timer.current);
        setPressed(event.key);
        timer.current = window.setTimeout(() => setPressed(null), 320);
      }}
    >
      <LineChartCard
        {...props}
        title="Revenue"
        data={dailyRevenue}
        x="date"
        series={[{ key: 'revenue', label: 'Revenue' }]}
        valueFormat={usd}
        formatX={formatDay}
        height={150}
        tiles={false}
      />
      <ul className="lilt-keycaps" aria-label="Keys this chart answers to">
        {KEYS.map((item) => (
          <li key={item.key}>
            <kbd aria-label={item.name} data-pressed={pressed === item.key || undefined}>
              {item.label}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplorationDemo() {
  const props = useDemoProps();
  return (
    <AreaChartCard
      {...props}
      title="Revenue"
      data={dailyRevenue}
      x="date"
      series={[{ key: 'revenue', label: 'Revenue' }]}
      valueFormat={usd}
      formatX={formatDay}
      height={150}
      tiles={false}
      compare
    />
  );
}

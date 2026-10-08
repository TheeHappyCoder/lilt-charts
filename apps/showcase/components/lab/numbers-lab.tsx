'use client';

import {
  AnimatedNumber,
  AreaChartCard,
  RadialChartCard,
  StatCard,
  type AnimatedNumberVariant,
} from '@lilt-ui/charts';
import { useEffect, useState } from 'react';
import { channelRanges, dailyKpis, visitorRanges } from '@/lib/card-docs/data';
import { LabStudio, type LabOption } from './lab-studio';

const variants: readonly LabOption<AnimatedNumberVariant>[] = [
  { value: 'count', label: 'Count', note: 'The value counts to its new total. The default.' },
  { value: 'pop', label: 'Pop', note: 'The value lifts away; the new one pops in.' },
  { value: 'slide', label: 'Slide', note: 'Changed digits travel with the change.' },
  { value: 'roll', label: 'Roll', note: 'An odometer that carries through 9 to 0.' },
  { value: 'flow', label: 'Flow', note: 'NumberFlow: digits spin and the width morphs.' },
  { value: 'scramble', label: 'Scramble', note: 'Figures cycle, then land.' },
];

// Fixed sequences, so every panel on the page moves in step and the comparison is fair. They rise
// and fall, cross 99,999 → 100,000 to show a place opening, and carry through 9 → 0.
const revenue = [
  48_210, 51_980, 50_640, 56_320, 61_085, 59_470, 64_990, 99_870, 104_260, 98_730, 71_400, 52_960,
];
const conversion = [3.42, 3.57, 3.51, 3.88, 4.02, 3.96, 4.31, 4.18, 4.29, 3.99, 3.74, 3.55];
const users = [1_284, 1_302, 1_297, 1_340, 1_415, 1_398, 1_460, 1_502, 1_489, 1_633, 1_470, 1_322];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const whole = new Intl.NumberFormat('en-US');
const change = new Intl.NumberFormat('en-US', {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** A shared beat: every ticker on the page reads the same step of its sequence. */
function useStep(every = 2200): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => current + 1), every);
    return () => window.clearInterval(timer);
  }, [every]);
  return step;
}

const at = (sequence: readonly number[], step: number) => sequence[step % sequence.length]!;

/** A live panel of numbers that update on their own, so each style can be watched hands-free. */
function Ticker({
  variant,
  compact = false,
}: {
  variant: AnimatedNumberVariant;
  compact?: boolean;
}) {
  const step = useStep();
  const now = at(revenue, step);
  const before = at(revenue, step + revenue.length - 1);
  const delta = now / before - 1;
  return (
    <div className="lilt-ticker" data-compact={compact || undefined}>
      <div className="lilt-ticker__head">
        <span className="lilt-ticker__label">Revenue today</span>
        <span className="lilt-ticker__live">
          <span aria-hidden="true" />
          Live
        </span>
      </div>
      <div className="lilt-ticker__headline">
        <span className="lilt-ticker__value">
          <AnimatedNumber value={now} format={usd} variant={variant} />
        </span>
        <span className="lilt-ticker__delta" data-tone={delta >= 0 ? 'up' : 'down'}>
          <AnimatedNumber value={delta} format={change} variant={variant} />
        </span>
      </div>
      {compact ? null : (
        <div className="lilt-ticker__stats">
          <div className="lilt-ticker__stat">
            <span className="lilt-ticker__label">Conversion</span>
            <strong>
              <AnimatedNumber
                value={at(conversion, step) / 100}
                format={percent}
                variant={variant}
              />
            </strong>
          </div>
          <div className="lilt-ticker__stat">
            <span className="lilt-ticker__label">Active users</span>
            <strong>
              <AnimatedNumber value={at(users, step)} format={whole} variant={variant} />
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

const usdCard = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/** The live ticker beside real cards: switch a period or hover a plot to see headline motion. */
function NumbersScene({ variant }: { variant: AnimatedNumberVariant }) {
  return (
    <div className="lilt-studio__bento">
      <div className="lilt-studio__tile" data-span="wide">
        <Ticker variant={variant} />
      </div>
      <div className="lilt-studio__tile" data-span="third">
        <StatCard
          numberStyle={variant}
          title="Revenue"
          data={dailyKpis}
          value="revenue"
          x="date"
          valueFormat={usdCard}
          delta={0.124}
          caption="vs last month"
          height={210}
        />
      </div>
      <div className="lilt-studio__tile" data-span="half">
        <AreaChartCard
          numberStyle={variant}
          title="Visitors"
          x="month"
          ranges={visitorRanges}
          series={[
            { key: 'organic', label: 'Organic' },
            { key: 'referral', label: 'Referral' },
            { key: 'paid', label: 'Paid' },
          ]}
          stack
          tiles={false}
          height={170}
        />
      </div>
      <div className="lilt-studio__tile" data-span="half">
        <RadialChartCard
          numberStyle={variant}
          title="Revenue by channel"
          ranges={channelRanges}
          category="channel"
          value="revenue"
          valueFormat={usdCard}
          legend="inline"
        />
      </div>
    </div>
  );
}

export function NumbersLab() {
  return (
    <LabStudio
      label="Number style"
      prop="numberStyle"
      options={variants}
      defaultValue="count"
      scene={(variant) => <NumbersScene variant={variant} />}
      compare={(variant) => <Ticker variant={variant} compact />}
    />
  );
}

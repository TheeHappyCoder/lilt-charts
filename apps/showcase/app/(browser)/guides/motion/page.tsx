import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/docs/page-header';
import {
  EntranceDemo,
  ExplorationDemo,
  HoverDemo,
  KeyboardDemo,
  LoadingDemo,
  MotionPreview,
  ReducedMotionDemo,
  UpdateDemo,
} from '@/components/guides/motion-demos';

export const metadata: Metadata = { title: 'Motion & accessibility' };

const timings = [
  { value: '720ms', label: 'Standard entrance' },
  { value: '520ms', label: 'Sparkline entrance' },
  { value: '420ms', label: 'Data update' },
  { value: '120ms', label: 'Before a skeleton shows' },
] as const;

/** One behavior: the live demo on a soft stage, then what it does. */
function Behavior({
  title,
  demo,
  children,
}: {
  title: string;
  demo: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="lilt-behavior">
      <div className="lilt-behavior__stage">{demo}</div>
      <div className="lilt-behavior__copy">
        <h3>{title}</h3>
        {children}
      </div>
    </article>
  );
}

function BehaviorGroup({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section className="lilt-behaviors" aria-labelledby={id}>
      <header className="lilt-behaviors__head">
        <h2 id={id}>{title}</h2>
        <p>{lede}</p>
      </header>
      <div className="lilt-behaviors__grid">{children}</div>
    </section>
  );
}

export default function MotionGuidePage() {
  return (
    <article className="lilt-main lilt-docs lilt-learn lilt-motion-guide">
      <PageHeader
        title="Motion & accessibility"
        lede="Marks, axes and text move together. Each transition keeps the data legible and follows your motion preferences."
      />
      <dl className="lilt-timings" aria-label="Timings">
        {timings.map((timing) => (
          <div key={timing.label} className="lilt-timings__item">
            <dt>{timing.label}</dt>
            <dd>{timing.value}</dd>
          </div>
        ))}
      </dl>
      <MotionPreview>
        <BehaviorGroup
          id="motion"
          title="Motion"
          lede="How charts arrive, wait for data, change and settle."
        >
          <Behavior title="Entrances" demo={<EntranceDemo />}>
            <p>
              Lines and areas arrive through a soft-edged sweep, with the fill following the stroke.
              Bars grow from their baseline with a short, bounded stagger. Grid and axis labels
              share the same entrance clock. The standard entrance lasts 720ms; sparklines use
              520ms.
            </p>
            <p>
              Set <code>animateIn={'{false}'}</code> to skip the entrance while keeping interactive
              and data-update motion. Use <code>motion=&quot;none&quot;</code> to settle all chart
              movement.
            </p>
          </Behavior>
          <Behavior title="Loading" demo={<LoadingDemo />}>
            <p>
              Fast data skips the placeholder. When loading lasts longer than 120ms, the chart
              reserves its final space and shows a skeleton shaped for its chart: contours, bars or
              stacked layers, with a shared sheen. The real layer begins under the skeleton when
              data arrives.
            </p>
          </Behavior>
          <Behavior title="Updates" demo={<UpdateDemo />}>
            <p>
              Matched dates and gaps interpolate together over 420ms. A changed gap topology uses a
              shorter two-layer crossfade. Summary and inspection text use bounded outgoing/incoming
              slots: values do not count through fabricated measurements or queue a stack of old
              glyphs.
            </p>
          </Behavior>
          <Behavior title="Reduced motion" demo={<ReducedMotionDemo />}>
            <p>
              The system preference is live. Springs, reveals, sheen and bounded text settle
              immediately while unknown data remains a steady skeleton. Theme changes preserve the
              chart identity and selected sample.
            </p>
          </Behavior>
        </BehaviorGroup>

        <BehaviorGroup
          id="interaction"
          title="Interaction & access"
          lede="Reading a chart by pointer, by keyboard, and across a range."
        >
          <Behavior title="Hover and pinning" demo={<HoverDemo />}>
            <p>
              Move over an interactive plot to inspect a point, category, or time period. The chart
              highlights what you are reading and updates its readout. Click to pin a selection so
              it stays visible when the pointer leaves; press Escape to release it.
            </p>
            <p>
              Use the info button on each chart&apos;s main preview for its specific behavior. The
              Props table documents its readout options, and the{' '}
              <Link href="/customize/hover">Hover</Link> page lets you try the available styles.
            </p>
          </Behavior>
          <Behavior title="Keyboard inspection" demo={<KeyboardDemo />}>
            <p>
              Tab to an interactive chart and use the arrow keys to explore its observations. On
              Cartesian charts, Left and Right move through periods; Up and Down select a series
              where supported. Other charts step through their rows, cells, spokes, or flows. Enter
              pins a selection and Escape releases it. The preview&apos;s info button explains any
              chart-specific controls and is also available by keyboard.
            </p>
          </Behavior>
          <Behavior title="Exploration sequence" demo={<ExplorationDemo />}>
            <p>
              Drag between two real observations to see values and change as the interval moves.
              Refine either endpoint after release, focus the interval, and use Full range to return
              with the answer intact. A chart controller can carry the same normalized x selection
              to related charts and preserve it when a host expands a chart. Series visibility, live
              following, annotations, reference bands and snapshot comparison are all opt-in.
            </p>
            <p>
              <Link href="/charts">Try the chart preview →</Link>
            </p>
          </Behavior>
        </BehaviorGroup>
      </MotionPreview>
    </article>
  );
}

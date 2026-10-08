'use client';

import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon';
import Loading03Icon from '@hugeicons/core-free-icons/Loading03Icon';
import ReplayIcon from '@hugeicons/core-free-icons/ReplayIcon';
import SlidersHorizontalIcon from '@hugeicons/core-free-icons/SlidersHorizontalIcon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { animate, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { controls, useChartSettings } from '@/components/docs/chart-settings';
import { DocsExample } from '@/components/docs/docs-example';
import { StageCopyMenu } from '@/components/docs/stage-copy-menu';
import { NotchPortal, useNotchSlotAvailable } from '@/components/shell/notch-slot';
import { CardCarousel } from '@/components/ui/card-carousel';
import {
  PopoverClose,
  PopoverContent,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Segmented, Switch } from '@/components/ui/segmented';
import { TooltipHint } from '@/components/ui/tooltip';
import {
  cardComponents,
  cardModule,
  isExampleRow,
  stageSize,
  type DocExample,
} from '@/lib/card-docs/examples';
import { resolveStage, withoutData } from '@/lib/card-docs/resolve-example';
import type { TuneControl } from '@/lib/card-docs/tune';

/**
 * One situation the chart handles, in the look chosen for it: the default card first, then its
 * variants. `change` names the appearance props it sets for itself.
 */
export interface StageItem {
  id: string;
  title: string;
  description: string;
  example: DocExample;
  change: readonly string[];
  supportedProps?: readonly string[];
  tune?: readonly TuneControl[];
}

const SIMULATED_LOAD = 2600;
const optionLabel = (value: string | number | boolean) =>
  typeof value === 'boolean' ? (value ? 'On' : 'Off') : String(value);
const firstCard = (value: DocExample) => (isExampleRow(value) ? value.row[0]! : value);
/** The chart style's settings by prop, to name the ones a variant sets for itself. */
const styleLabels = new Map<string, string>(
  controls.map((control) => [control.key, control.label]),
);

function useStageState({
  items,
  name,
  supportedProps,
}: {
  items: readonly StageItem[];
  name: string;
  supportedProps: readonly string[];
}) {
  const { settings } = useChartSettings();
  const [selectedId, setSelectedId] = useState(items[0]!.id);
  const [tuned, setTuned] = useState<Readonly<Record<string, unknown>>>({});
  const [loading, setLoading] = useState(false);
  // Empty shows whichever variant is on stage with no data; it stays on across variants.
  const [emptied, setEmptied] = useState(false);
  // Entering loading remounts the card; leaving it preserves the skeleton-to-data handover.
  const [mount, setMount] = useState(0);
  // Counts arrivals in focus, so a card returning to focus plays its entrance again.
  const [visit, setVisit] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), []);
  const setLoadingNow = (next: boolean) => {
    window.clearTimeout(timer.current ?? undefined);
    timer.current = null;
    if (next && !loading) setMount((count) => count + 1);
    setLoading(next);
  };
  const simulate = () => {
    setLoadingNow(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setLoading(false);
    }, SIMULATED_LOAD);
  };

  // A link such as `#forecast` opens the page on that variant.
  useEffect(() => {
    const open = () => {
      const hash = location.hash.slice(1);
      if (items.some((item) => item.id === hash)) {
        setSelectedId(hash);
        setVisit((count) => count + 1);
        setTuned({});
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [items]);
  const select = (id: string) => {
    if (id !== selectedId) setVisit((count) => count + 1);
    setTuned({});
    setSelectedId(id);
    const url = id === items[0]!.id ? location.pathname + location.search : `#${id}`;
    history.replaceState(null, '', url);
  };
  const item = items.find((candidate) => candidate.id === selectedId) ?? items[0]!;
  const resolved = resolveStage(
    emptied ? withoutData(item.example) : item.example,
    item.change,
    name,
    settings,
    item.supportedProps ?? supportedProps,
    {
      ...(item.supportedProps
        ? Object.fromEntries(
            Object.entries(tuned).filter(([key]) => item.supportedProps!.includes(key)),
          )
        : tuned),
      ...(loading ? { loading: true } : {}),
    },
  );
  // A neighbour shows as it will once picked: site settings, minus what it sets for itself.
  const thumbnail = (candidate: StageItem) =>
    resolveStage(
      candidate.example,
      candidate.change,
      name,
      settings,
      candidate.supportedProps ?? supportedProps,
    ).example;
  return {
    items,
    item,
    selectedId,
    select,
    tuned,
    setTuned,
    loading,
    setLoadingNow,
    simulate,
    emptied,
    setEmptied,
    mount,
    visit,
    resolved,
    thumbnail,
  };
}

type StageState = ReturnType<typeof useStageState>;
const StageContext = createContext<StageState | null>(null);
function useStage() {
  const stage = useContext(StageContext);
  if (!stage) throw new Error('The chart stage needs ChartStageProvider.');
  return stage;
}

/** Keeps the carousel, code, and props on the same selection. */
export function ChartStageProvider({
  items,
  name,
  supportedProps,
  children,
}: {
  items: readonly StageItem[];
  /** The component name the printed file declares. */
  name: string;
  supportedProps: readonly string[];
  children: ReactNode;
}) {
  const stage = useStageState({ items, name, supportedProps });
  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
}

/**
 * The chart's stage: its situations in one carousel, under one tab of Preview and Code, Props,
 * the preview's own replay and loading, and Copy. How every chart looks is the chart style's job.
 */
export function ChartStage({
  filename,
  label,
  importLine,
  tune = [],
}: {
  filename: string;
  /** What the stage shows, for its Preview and Code names. */
  label: string;
  importLine: string;
  tune?: readonly TuneControl[];
}) {
  const stage = useStage();
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [replay, setReplay] = useState(0);
  const { items, item, resolved, loading } = stage;
  const { example, code, prompt } = resolved;
  const pathname = usePathname();
  const inNotch = useNotchSlotAvailable();
  const sized = items.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    size: stageSize(candidate.example),
  }));
  const active = Math.max(
    0,
    items.findIndex((candidate) => candidate.id === item.id),
  );
  // An elevated card wears the tab; an outline or ghost card has no body to tuck it behind, and a
  // card with its own badge already wears a tab there, so the stage's stands apart as a toolbar.
  const {
    surface = 'elevated',
    compare,
    badge,
  } = firstCard(example).props as {
    surface?: string;
    compare?: unknown;
    badge?: unknown;
  };
  const toolbar =
    surface === 'outline' || surface === 'ghost' || compare === 'badge' || badge != null;
  const root = useRef<HTMLDivElement>(null);
  const reduced = Boolean(useReducedMotion());
  const previous = useRef(active);
  // The tab belongs to the card in focus, so it rides in with the next one rather than hanging
  // over the stage while the cards trade places.
  useEffect(() => {
    const from = previous.current;
    previous.current = active;
    if (from === active || reduced || toolbar || view !== 'preview') return;
    const head = root.current?.querySelector<HTMLElement>('.lilt-docs-example__head');
    const card = root.current?.querySelector<HTMLElement>('.lilt-card-carousel__card[data-active]');
    if (!head || !card) return;
    let step = (active - from + items.length) % items.length;
    if (step > items.length / 2) step -= items.length;
    const width =
      parseFloat(getComputedStyle(head).getPropertyValue('--lilt-stage-card-width')) ||
      card.offsetWidth;
    const motion = animate(
      head,
      { x: [Math.sign(step) * width * 0.63, 0], y: [12, 0], scale: [0.9, 1], opacity: [0, 1] },
      {
        type: 'spring',
        duration: 0.55,
        bounce: 0.08,
        opacity: { duration: 0.22, ease: 'easeOut' },
      },
    );
    return () => motion.stop();
  }, [active, items.length, reduced, toolbar, view]);
  // A card leaving focus keeps its mount as a neighbour; only the card arriving plays its entrance.
  const keys = useRef(new Map<string, string>());
  const activeKey = `${item.id}-${stage.mount}-${replay}-${stage.visit}`;
  keys.current.set(item.id, activeKey);
  // A click plays a load, from skeleton to data; Alt-click holds the skeleton; a click while
  // loading ends it.
  const toggleLoad = (event: { altKey: boolean }) => {
    if (loading) stage.setLoadingNow(false);
    else if (event.altKey) stage.setLoadingNow(true);
    else stage.simulate();
  };
  const loadHint = loading ? 'End loading' : 'Play a load · Alt-click to hold it';
  const emptyHint = stage.emptied ? 'Show the data' : 'Show it with no data';
  const tools = (className: string) => (
    <>
      <TooltipHint content="Replay animation" side="bottom">
        <button
          type="button"
          className={className}
          aria-label="Replay animation"
          disabled={view === 'code'}
          onClick={() => setReplay((count) => count + 1)}
        >
          <Icon icon={ReplayIcon} size={16} aria-hidden="true" />
        </button>
      </TooltipHint>
      <TooltipHint content={loadHint} side="bottom">
        <button
          type="button"
          className={className}
          aria-label="Simulate a load"
          aria-pressed={loading}
          disabled={view === 'code'}
          onClick={toggleLoad}
        >
          <Icon
            icon={Loading03Icon}
            className="lilt-notch__loading-icon"
            size={16}
            aria-hidden="true"
          />
        </button>
      </TooltipHint>
      <TooltipHint content={emptyHint} side="bottom">
        <button
          type="button"
          className={className}
          aria-label="Show with no data"
          aria-pressed={stage.emptied}
          onClick={() => stage.setEmptied(!stage.emptied)}
        >
          <Icon icon={InboxIcon} size={16} aria-hidden="true" />
        </button>
      </TooltipHint>
    </>
  );
  const head = (
    <div className="lilt-stage__tools">
      <StageProps tune={tune} />
      {inNotch ? null : (
        <div className="lilt-stage__preview-tools" role="group" aria-label="Preview actions">
          {tools('lilt-notch__tool')}
        </div>
      )}
      <StageCopyMenu
        code={code}
        importLine={
          firstCard(example).kind === firstCard(items[0]!.example).kind
            ? importLine
            : `import { ${cardComponents[firstCard(example).kind]} } from '${cardModule(firstCard(example).kind)}';`
        }
        prompt={prompt}
        title={label.toLowerCase()}
        pathname={pathname}
      />
    </div>
  );

  return (
    <div ref={root} className="lilt-stage" data-head={toolbar ? 'toolbar' : 'tab'}>
      <span id="variants" className="lilt-stage__anchor" aria-hidden="true" />
      <NotchPortal>
        <span className="lilt-notch__divider" aria-hidden="true" />
        {tools('lilt-notch__tool')}
      </NotchPortal>
      <DocsExample
        label={label}
        code={code}
        filename={filename}
        size="wide"
        view={view}
        onViewChange={setView}
        head={head}
        badgeHead
        codeNote={item.title}
      >
        {/* Replay re-runs only the card in focus; its neighbours keep still. */}
        <CardCarousel
          items={sized}
          active={active}
          fitViewport
          onSelect={(index) => stage.select(items[index]!.id)}
          label="Variants"
          renderItem={(index, selected) => (
            <CardExamplePreview
              key={
                selected
                  ? activeKey
                  : (keys.current.get(items[index]!.id) ?? `${items[index]!.id}-neighbor`)
              }
              example={selected ? example : stage.thumbnail(items[index]!)}
            />
          )}
        />
      </DocsExample>
    </div>
  );
}

/**
 * Props: this component's own props, flipped on the card in focus and printed in its code. The
 * forms one prop makes (stacked, step, needles, pie) live here, not in the carousel. How every
 * chart looks is the chart style's, and the foot says so with a way there.
 */
function StageProps({ tune = [] }: { tune?: readonly TuneControl[] }) {
  const stage = useStage();
  const { setOpen: openStyle } = useChartSettings();
  const [open, setOpen] = useState(false);
  tune = stage.item.tune ?? tune;
  const { tuned, resolved } = stage;
  if (!tune.length) return null;
  const card = firstCard(resolved.example);
  const base = firstCard(stage.item.example);
  const changedCount = tune.filter(
    (control) =>
      control.prop in tuned &&
      tuned[control.prop] !== (base.props[control.prop] ?? control.defaultValue),
  ).length;
  // Site-wide styles this variant sets for itself, so the chart style does not apply to them.
  const ownStyles = stage.item.change.flatMap((prop) => styleLabels.get(prop) ?? []);
  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="lilt-stage__tune-trigger"
        aria-label={changedCount ? `Props, ${changedCount} changed` : 'Props'}
      >
        <Icon icon={SlidersHorizontalIcon} size={16} strokeWidth={1.7} aria-hidden="true" />
        <span className="lilt-stage__tune-label">Props</span>
        {/* A changed prop is a quiet dot, like an unsaved mark; the number is read out. */}
        {changedCount ? <span className="lilt-stage__tune-dot" aria-hidden="true" /> : null}
      </PopoverTrigger>
      <PopoverContent
        data-carousel-ignore=""
        className="lilt-stage__tune-popup"
        positionerProps={{ side: 'bottom', align: 'end' }}
      >
        <div className="lilt-stage__tune-heading">
          <div className="lilt-stage__tune-title">
            <span className="lilt-notch__label">Props</span>
            <PopoverTitle>{stage.item.title}</PopoverTitle>
          </div>
          <button
            type="button"
            className="lilt-notch__reset"
            disabled={!Object.keys(tuned).length}
            onClick={() => stage.setTuned({})}
          >
            {changedCount ? `Reset ${changedCount}` : 'Reset'}
          </button>
          <PopoverClose aria-label="Close props" className="lilt-notch__close">
            <Icon icon={Cancel01Icon} size={14} aria-hidden="true" />
          </PopoverClose>
        </div>
        <ScrollArea scrollFade className="lilt-stage__tune-scroll">
          <div className="lilt-stage__tune">
            {tune.map((control) => {
              const current =
                tuned[control.prop] ?? card.props[control.prop] ?? control.defaultValue;
              const changed =
                control.prop in tuned &&
                tuned[control.prop] !== (base.props[control.prop] ?? control.defaultValue);
              const onOff =
                control.options.length === 2 &&
                control.options.every((option) => typeof option === 'boolean');
              const set = (value: unknown) =>
                stage.setTuned((previous) => ({ ...previous, [control.prop]: value }));
              return (
                <div key={control.prop} className="lilt-stage__tune-field">
                  <code className="lilt-tune__prop">
                    {control.prop}
                    {changed ? <span className="lilt-tune__dot" aria-hidden="true" /> : null}
                  </code>
                  {onOff ? (
                    <Switch label={control.prop} checked={current === true} onChange={set} />
                  ) : (
                    <Segmented
                      label={control.prop}
                      value={String(current)}
                      options={control.options.map((value) => ({
                        value: String(value),
                        label: optionLabel(value),
                      }))}
                      onChange={(next) =>
                        set(control.options.find((option) => String(option) === next))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="lilt-stage__props-foot">
          <p>
            {ownStyles.length
              ? `This variant sets its own ${ownStyles.map((name) => name.toLowerCase()).join(', ')}. Everything else that styles a chart is set once, for every chart.`
              : 'Palette, depth, axis and the rest are set once, for every chart.'}
          </p>
          <button
            type="button"
            className="lilt-notch__reset"
            onClick={() => {
              setOpen(false);
              openStyle(true);
            }}
          >
            Chart style
          </button>
        </div>
      </PopoverContent>
    </PopoverRoot>
  );
}

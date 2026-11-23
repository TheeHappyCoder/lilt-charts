'use client';

import RotateLeft01Icon from '@hugeicons/core-free-icons/RotateLeft01Icon';
import { HugeiconsIcon } from '@hugeicons/react';
import * as ascii from '@lilt-ui/registry';
import * as ui from '@lilt-ui/registry/ui';
import * as visuals from '@lilt-ui/registry/visuals';
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Count, Label } from '@/components/craft/label';
import { ArrowSwap, Roll } from '@/components/craft/roll';
import { GuideCode } from '@/components/docs/guide-code';
import { DetailBar, type AdjacentLink } from '@/components/showroom/detail-bar';
import { DetailPager } from '@/components/showroom/detail-next';
import {
  ChoiceField,
  ColorField,
  ColorsField,
  FieldGrid,
  RangeField,
  SwitchField,
  TextField,
} from '@/components/ui/field';
import {
  asciiScene,
  canvasControls,
  defaultsOf,
  literal,
  type AsciiControl,
  type AsciiSceneId,
  type AsciiValue,
} from '@/lib/ascii-scenes';
import { componentDoc } from '@/lib/component-docs';
import { visualDoc } from '@/lib/visual-docs';

// Every component is found by its name in the registry. They take loosely typed props here
// because the panel builds them from data.
type Registry = Record<string, ComponentType<Record<string, unknown>>>;
const lines = {
  ascii: ascii as unknown as Registry,
  components: ui as unknown as Registry,
  visuals: visuals as unknown as Registry,
};

// `theme` takes its colours from the stage's CSS variables, which follow the site's theme, so the
// stage matches the page without waiting for the client to know which theme is on.
const backdrops = {
  theme: {
    background: 'var(--lilt-stage-paper)',
    color: 'var(--lilt-stage-ink)',
    colorScheme: undefined,
  },
  night: { background: '#07070a', color: '#e8e8ee', colorScheme: 'dark' },
  paper: { background: '#f5f3ee', color: '#1d1c1a', colorScheme: 'light' },
} as const;

type Backdrop = keyof typeof backdrops;

const backdropOptions = [
  { value: 'theme', label: 'Theme' },
  { value: 'night', label: 'Night' },
  { value: 'paper', label: 'Paper' },
] as const;

const same = (a: AsciiValue, b: AsciiValue) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Split studio workbench for every Components and ASCII page (modeled on marksteyn.dev's `.w-view`):
 * - Sticky sub-bar with All / Previous / Next / Index / Inspector toggle
 * - Side-by-side plinth stage (with floating dark-glass backdrop & hint bar) + collapsible Inspector
 * - Editorial 2-column bands below for live generated code, installation files, usage and props
 */
export function AsciiPlayground({
  id,
  from,
  line = 'ascii',
  prev = null,
  next = null,
  installSlot,
  filesCount = 0,
  usageSlot,
  propsSlot,
  propsCount = 0,
}: {
  id: AsciiSceneId;
  from: string;
  line?: keyof typeof lines;
  prev?: AdjacentLink | null;
  next?: AdjacentLink | null;
  installSlot?: ReactNode;
  filesCount?: number;
  usageSlot?: ReactNode;
  propsSlot?: ReactNode;
  propsCount?: number;
}) {
  // Components and Visuals are real DOM, centred on the stage; ASCII scenes say for themselves.
  const scene = useMemo(
    () =>
      line === 'ascii'
        ? { ...asciiScene(id)!, surfaceProp: undefined }
        : line === 'visuals'
          ? {
              ...visualDoc(id)!,
              kind: 'dom' as const,
              layout: 'center' as const,
              surfaceProp: undefined,
            }
          : { ...componentDoc(id)!, kind: 'dom' as const, layout: 'center' as const },
    [id, line],
  );
  const canvas = scene.kind !== 'dom';
  const controls = useMemo(
    () => [...scene.controls, ...(canvas ? canvasControls : [])],
    [scene, canvas],
  );
  const defaults = useMemo(() => defaultsOf(controls), [controls]);
  const [values, setValues] = useState(defaults);
  const startBackdrop: Backdrop = scene.backdrop ?? 'theme';
  const [backdrop, setBackdrop] = useState<Backdrop>(startBackdrop);
  const [panelOpen, setPanelOpen] = useState(true);
  const Scene = lines[line][scene.demo ?? scene.component]!;
  const colours = backdrops[backdrop];

  const changed = controls.filter((control) => !same(values[control.name]!, control.defaultValue));
  const dirty = changed.length > 0 || backdrop !== startBackdrop;
  const set = (name: string, value: AsciiValue) =>
    setValues((current) => ({ ...current, [name]: value }));

  const props = changed
    .filter((control) => !scene.demoOnly?.includes(control.name))
    .map((control) => {
      const value = values[control.name]!;
      return typeof value === 'string' || Array.isArray(value)
        ? ` ${control.name}={${literal(value)}}`
        : value === true
          ? ` ${control.name}`
          : ` ${control.name}={${value}}`;
    });
  const element =
    props.join('').length > 60
      ? `<${scene.component}\n${props.map((p) => `        ${p.trim()}`).join('\n')}\n      />`
      : `<${scene.component}${props.join('')} />`;
  const filled = scene.code
    ?.replace('{element}', element)
    .replace('{props}', props.join(''))
    .replace('{from}', from);
  const code = filled
    ? filled.startsWith('import')
      ? filled
      : `import { ${scene.component} } from '${from}';

${filled}`
    : !canvas
      ? `import { ${scene.component} } from '${from}';

export function Example() {
  return ${element};
}`
      : `import { ${scene.component} } from '${from}';

export function Hero() {
  return (
    <section style={{ height: 560${
      backdrop === 'theme' ? '' : `, background: '${colours.background}', color: '${colours.color}'`
    } }}>
      ${element}
    </section>
  );
}`;

  const noun = line === 'components' ? 'component' : line === 'visuals' ? 'visual' : 'scene';
  const frameToneClass =
    backdrop === 'night' ? 'dark' : backdrop === 'paper' ? 'lilt-studio__frame--light' : '';

  return (
    <div className="lilt-showroom">
      <DetailBar
        tab={line}
        title={scene.title}
        chip={scene.shelf}
        prev={prev}
        next={next}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />

      <section className="lilt-studio" aria-label={`${scene.title} studio`}>
        <div className="lilt-studio__stage">
          <div
            className={['lilt-studio__frame', frameToneClass].filter(Boolean).join(' ')}
            data-theme={backdrop === 'night' ? 'dark' : backdrop === 'paper' ? 'light' : undefined}
            style={{ background: colours.background }}
          >
            <div
              className={[
                'lilt-studio__canvas',
                scene.layout === 'center' ? 'lilt-studio__canvas--center' : '',
                line !== 'ascii' ? 'lilt-studio__canvas--piece' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ ...scene.stage, color: colours.color, colorScheme: colours.colorScheme }}
            >
              {line === 'visuals' ? (
                <div className="lilt-studio__visual-wrap">
                  <Scene {...values} />
                </div>
              ) : (
                <Scene
                  {...values}
                  {...(scene.surfaceProp ? { [scene.surfaceProp]: colours.background } : {})}
                  style={{ color: colours.color }}
                />
              )}
            </div>

            <div className="lilt-studio__controls">
              <p className="lilt-studio__touch">{scene.touch}</p>
              <div className="lilt-studio__backdrops" role="group" aria-label="Stage backdrop">
                {backdropOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={backdrop === option.value}
                    onClick={() => setBackdrop(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="lilt-studio__panel" data-collapsed={!panelOpen || undefined}>
          <div className="lilt-studio__head">
            <div className="lilt-studio__title-row">
              <h1>{scene.title}</h1>
              <span className="lilt-chip">{scene.shelf}</span>
            </div>
            <p className="lilt-studio__lede">{scene.lede}</p>
          </div>

          {controls.length > 0 ? (
            <section className="lilt-studio__inspector" aria-labelledby={`${id}-customize`}>
              <header className="lilt-studio__inspector-head">
                <h2 id={`${id}-customize`}>
                  Customize <Count n={controls.length} />
                </h2>
                <button
                  type="button"
                  className="lilt-ascii-panel__reset"
                  disabled={!dirty}
                  onClick={() => {
                    setValues(defaults);
                    setBackdrop(startBackdrop);
                  }}
                >
                  <HugeiconsIcon icon={RotateLeft01Icon} size={14} strokeWidth={1.8} />
                  Reset
                </button>
              </header>
              <FieldGrid>
                {controls.map((control) => (
                  <Control
                    key={control.name}
                    control={control}
                    value={values[control.name]!}
                    onChange={(value) => set(control.name, value)}
                  />
                ))}
              </FieldGrid>
            </section>
          ) : null}

          <div className="lilt-studio__actions">
            <a href="#installation" className="lilt-btn" data-tone="ink" data-size="lg">
              <Roll>Install & copy source</Roll>
              <ArrowSwap />
            </a>
            <a href="#props" className="lilt-btn" data-size="lg">
              <Roll>See props</Roll>
              {propsCount > 0 ? <Count n={propsCount} /> : null}
            </a>
          </div>
        </aside>
      </section>

      <div className="lilt-detail-body">
        <section className="lilt-detail-band" id="code" aria-labelledby="code-title">
          <div className="lilt-detail-band__head">
            <Label reveal={false}>Live code</Label>
            <h2 id="code-title">As tuned above.</h2>
            <p>
              Every control in the inspector updates this snippet directly. Defaults are omitted to
              keep your markup minimal.
            </p>
          </div>
          <div className="lilt-detail-band__content">
            <GuideCode code={code} title={canvas ? 'hero.tsx' : 'example.tsx'} />
          </div>
        </section>

        {installSlot ? (
          <section
            className="lilt-detail-band"
            id="installation"
            aria-labelledby="installation-title"
          >
            <div className="lilt-detail-band__head">
              <Label count={filesCount || undefined} reveal={false}>
                Installation
              </Label>
              <h2 id="installation-title">Source you own.</h2>
              <p>
                {line === 'components'
                  ? 'This is source, not a package: the shadcn CLI copies it into your project and it is yours to change. Take it whole, or lift the one detail you like.'
                  : line === 'visuals'
                    ? 'One self-contained file with zero dependencies beyond React 19: the shadcn CLI drops it straight into your project, ready to customize or drop into a feature card.'
                    : 'This is source, not a package: the shadcn CLI copies it into your project with the shared pieces it needs. Its only dependency is React.'}
              </p>
            </div>
            <div className="lilt-detail-band__content">{installSlot}</div>
          </section>
        ) : null}

        {usageSlot ? (
          <section className="lilt-detail-band" id="usage" aria-labelledby="usage-title">
            <div className="lilt-detail-band__head">
              <Label reveal={false}>Usage</Label>
              <h2 id="usage-title">How it behaves.</h2>
            </div>
            <div className="lilt-detail-band__content">
              <div className="lilt-detail-prose-card">{usageSlot}</div>
            </div>
          </section>
        ) : null}

        {propsSlot ? (
          <section className="lilt-detail-band" id="props" aria-labelledby="props-title">
            <div className="lilt-detail-band__head">
              <Label count={propsCount || undefined} reveal={false}>
                Props
              </Label>
              <h2 id="props-title">Every option.</h2>
              <p>
                Pass these directly to <code>{scene.component}</code>.
              </p>
            </div>
            <div className="lilt-detail-band__content">{propsSlot}</div>
          </section>
        ) : null}
      </div>

      <DetailPager prev={prev} next={next} noun={noun} />
    </div>
  );
}

function Control({
  control,
  value,
  onChange,
}: {
  control: AsciiControl;
  value: AsciiValue;
  onChange: (value: AsciiValue) => void;
}) {
  switch (control.kind) {
    case 'range': {
      const decimals = String(control.step).split('.')[1]?.length ?? 0;
      return (
        <RangeField
          label={control.label}
          value={value as number}
          min={control.min}
          max={control.max}
          step={control.step}
          onChange={onChange}
          format={(v) => (control.name === 'cellSize' ? `${v}px` : v.toFixed(decimals))}
        />
      );
    }
    case 'toggle':
      return <SwitchField label={control.label} checked={value as boolean} onChange={onChange} />;
    case 'choice':
      return (
        <ChoiceField
          label={control.label}
          value={value as string}
          options={control.options}
          onChange={onChange}
        />
      );
    case 'text':
      return <TextField label={control.label} value={value as string} onChange={onChange} />;
    case 'color':
      return <ColorField label={control.label} value={value as string} onChange={onChange} />;
    case 'colors':
      return (
        <ColorsField
          label={control.label}
          value={value as readonly string[]}
          min={control.min}
          max={control.max}
          onChange={onChange}
        />
      );
  }
}

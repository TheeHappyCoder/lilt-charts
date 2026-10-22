'use client';

import RotateLeft01Icon from '@hugeicons/core-free-icons/RotateLeft01Icon';
import { HugeiconsIcon } from '@hugeicons/react';
import * as ascii from '@lilt-ui/registry';
import { useMemo, useState, type ComponentType } from 'react';
import { GuideCode } from '@/components/docs/guide-code';
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

// Every component is found by its name in the registry. They take loosely typed props here
// because the panel builds them from data.
const components = ascii as unknown as Record<string, ComponentType<Record<string, unknown>>>;

const backdrops = {
  night: { background: '#07070a', color: '#e8e8ee' },
  paper: { background: '#f5f3ee', color: '#1d1c1a' },
} as const;

type Backdrop = keyof typeof backdrops;

const same = (a: AsciiValue, b: AsciiValue) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A scene on its stage, the Customize panel beneath it, and the source for what you see. Every
 * control is a prop; the code lists the ones you changed, imported from where the shadcn CLI puts
 * the component (`from`).
 */
export function AsciiPlayground({ id, from }: { id: AsciiSceneId; from: string }) {
  const scene = asciiScene(id)!;
  const controls = useMemo(
    () => [...scene.controls, ...(scene.kind === 'dom' ? [] : canvasControls)],
    [scene],
  );
  const defaults = useMemo(() => defaultsOf(controls), [controls]);
  const [values, setValues] = useState(defaults);
  const [backdrop, setBackdrop] = useState<Backdrop>('night');
  const Scene = components[scene.demo ?? scene.component]!;
  const colours = backdrops[backdrop];

  const changed = controls.filter((control) => !same(values[control.name]!, control.defaultValue));
  const dirty = changed.length > 0 || backdrop !== 'night';
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
    : `import { ${scene.component} } from '${from}';

export function Hero() {
  return (
    <section style={{ height: 560, background: '${colours.background}', color: '${colours.color}' }}>
      ${element}
    </section>
  );
}`;

  return (
    <div className="lilt-ascii-playground">
      <figure className="lilt-ascii-stage" style={{ background: colours.background }}>
        <div
          className={
            scene.layout === 'center'
              ? 'lilt-ascii-stage__canvas lilt-ascii-stage__canvas--center'
              : 'lilt-ascii-stage__canvas'
          }
          style={{ ...scene.stage, color: colours.color }}
        >
          <Scene {...values} style={{ color: colours.color }} />
        </div>
        <figcaption
          className="lilt-ascii-stage__touch"
          style={{ color: `color-mix(in srgb, ${colours.color} 60%, transparent)` }}
        >
          {scene.touch}
        </figcaption>
      </figure>

      <section className="lilt-ascii-panel" aria-labelledby={`${id}-customize`}>
        <header className="lilt-ascii-panel__head">
          <h2 id={`${id}-customize`}>Customize</h2>
          <button
            type="button"
            className="lilt-ascii-panel__reset"
            disabled={!dirty}
            onClick={() => {
              setValues(defaults);
              setBackdrop('night');
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
          <SwitchField
            label="Paper"
            checked={backdrop === 'paper'}
            onChange={(on) => setBackdrop(on ? 'paper' : 'night')}
          />
        </FieldGrid>
      </section>

      <GuideCode code={code} title="hero.tsx" />
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

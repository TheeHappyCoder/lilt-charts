'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import CubeIcon from '@hugeicons/core-free-icons/CubeIcon';
import SquareIcon from '@hugeicons/core-free-icons/SquareIcon';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { AUTO, controls, useChartSettings, type Control } from '@/components/docs/chart-settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipHint } from '@/components/ui/tooltip';
import type { ChartDocSettings } from '@/lib/card-docs/resolve-example';

const controlFor = (key: keyof ChartDocSettings) =>
  controls.find((control) => control.key === key)!;
const paletteControl = controlFor('palette');
const groups = [
  { label: 'Appearance', keys: ['surface', 'background'] },
  {
    label: 'Reading & motion',
    keys: ['axis', 'hover', 'legend', 'numberStyle', 'loadingStyle', 'empty'],
  },
] as const;
const paletteNames: Record<string, string> = {
  [AUTO]: 'Auto',
  spectrum: 'Spectrum',
  iris: 'Iris',
  cobalt: 'Cobalt',
  emerald: 'Emerald',
};
const textOf = (label: unknown, value: string) =>
  typeof label === 'string' ? label : (paletteNames[value] ?? value);
const PANEL_ID = 'lilt-style-menu';

function valueOf(control: Control<keyof ChartDocSettings>, settings: ChartDocSettings) {
  const current = settings[control.key];
  return control.format ? control.format(current) : ((current as string | undefined) ?? AUTO);
}

/** Actual palette colours, rather than a ring for an unordered setting. */
function PaletteMark({ palette }: { palette: string }) {
  return (
    <span
      className="lilt-style-menu__colors"
      data-lilt-chart=""
      data-lilt-palette={palette === AUTO ? 'spectrum' : palette}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * The chart style's way in from the header: the palette as three dots, flat or depth as one
 * toggle, and the whole panel behind the label. A dot marks a style changed from the defaults.
 */
export function StyleMenuTrigger() {
  const { settings, setSetting, open, setOpen } = useChartSettings();
  const palette = (settings.palette as string | undefined) ?? AUTO;
  const changed = Object.values(settings).filter((value) => value !== undefined).length;
  const depth = settings.depth === true;
  return (
    <div className="lilt-style-trigger" role="group" aria-label="Chart style">
      <TooltipHint content={depth ? 'Depth · on' : 'Depth · off'} side="bottom">
        <button
          type="button"
          className="lilt-style-trigger__depth"
          aria-label={depth ? 'Turn depth off' : 'Turn depth on'}
          aria-pressed={depth}
          onClick={() => setSetting('depth', depth ? undefined : true)}
        >
          <Icon icon={depth ? CubeIcon : SquareIcon} size={15} strokeWidth={1.7} aria-hidden />
        </button>
      </TooltipHint>
      <button
        type="button"
        className="lilt-style-trigger__open"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        data-style-trigger=""
        onClick={() => setOpen(!open)}
      >
        <PaletteMark palette={palette} />
        <span className="lilt-style-trigger__label">Style</span>
        {changed ? <span className="lilt-style-trigger__dot" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}

/**
 * Everything that styles every chart, in one panel that slides in beside the page and leaves the
 * chart in view. Chart pages never repeat these controls.
 */
export function StyleMenu() {
  const { settings, setSetting, reset, open, setOpen } = useChartSettings();
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const palette = (settings.palette as string | undefined) ?? AUTO;
  const changed = Object.values(settings).filter((value) => value !== undefined).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A select's first Escape belongs to its own popup.
      if (document.querySelector('.lilt-style-menu__select-popup:not([data-closed])')) return;
      setOpen(false);
      document.querySelector<HTMLButtonElement>('[data-style-trigger]')?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        rootRef.current?.contains(target) ||
        target?.closest('.lilt-style-menu__select-popup, [data-style-trigger]')
      )
        return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open, setOpen]);

  const row = (key: keyof ChartDocSettings) => {
    const control = controlFor(key);
    const value = valueOf(control, settings);
    return (
      <div key={key} className="lilt-style-menu__row">
        <Link
          href={control.href}
          className="lilt-style-menu__row-label"
          onClick={() => setOpen(false)}
        >
          {control.label}
        </Link>
        <Select
          items={control.options.map((option) => ({
            value: option.value,
            label: textOf(option.label, option.value),
          }))}
          value={value}
          onValueChange={(next) => {
            if (next === null) return;
            setSetting(
              key,
              next === AUTO ? undefined : control.parse ? control.parse(next) : (next as never),
            );
          }}
        >
          <SelectTrigger
            className="lilt-style-menu__select"
            aria-label={control.label}
            data-changed={value !== AUTO || undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="lilt-style-menu__select-popup" align="end">
            {control.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {textOf(option.label, option.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          ref={rootRef}
          id={PANEL_ID}
          className="lilt-style-menu"
          aria-labelledby={titleId}
          initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, y: -4, scale: 0.985, filter: 'blur(2px)' }
          }
          transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="lilt-style-menu__head">
            <div>
              <h2 id={titleId}>Chart style</h2>
              <p>Applies to every chart on the site.</p>
            </div>
            <button
              type="button"
              className="lilt-style-menu__close"
              aria-label="Close chart style"
              onClick={() => setOpen(false)}
            >
              <Icon icon={Cancel01Icon} size={15} aria-hidden="true" />
            </button>
          </header>
          <div className="lilt-style-menu__scroll">
            <section className="lilt-style-menu__section" aria-label="Palette">
              <h3>Palette</h3>
              <div className="lilt-style-menu__palettes">
                {paletteControl.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="lilt-style-menu__palette"
                    aria-pressed={palette === option.value}
                    onClick={() =>
                      setSetting(
                        'palette',
                        option.value === AUTO ? undefined : (option.value as never),
                      )
                    }
                  >
                    <PaletteMark palette={option.value} />
                    <span>{paletteNames[option.value]}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="lilt-style-menu__section" aria-label="Depth">
              <h3>Depth</h3>
              <div className="lilt-style-menu__seg" role="group" aria-label="Depth">
                {(
                  [
                    [false, 'Flat', SquareIcon],
                    [true, '3D', CubeIcon],
                  ] as const
                ).map(([value, label, icon]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={(settings.depth === true) === value}
                    onClick={() => setSetting('depth', value ? true : undefined)}
                  >
                    <Icon icon={icon} size={14} strokeWidth={1.7} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </section>
            {groups.map((group) => (
              <section
                key={group.label}
                className="lilt-style-menu__section"
                aria-label={group.label}
              >
                <h3>{group.label}</h3>
                {group.keys.map(row)}
              </section>
            ))}
          </div>
          <footer className="lilt-style-menu__foot">
            <span>
              {changed
                ? `${changed} custom ${changed === 1 ? 'setting' : 'settings'}`
                : 'Using chart defaults'}
            </span>
            <button
              type="button"
              className="lilt-style-menu__reset"
              disabled={!changed}
              onClick={reset}
            >
              Reset
            </button>
          </footer>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

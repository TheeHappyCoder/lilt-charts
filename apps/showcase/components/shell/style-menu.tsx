'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import CubeIcon from '@hugeicons/core-free-icons/CubeIcon';
import SquareIcon from '@hugeicons/core-free-icons/SquareIcon';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
const THUMB_SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const;

function valueOf(control: Control<keyof ChartDocSettings>, settings: ChartDocSettings) {
  const current = settings[control.key];
  return control.format ? control.format(current) : ((current as string | undefined) ?? AUTO);
}

/** Actual palette colours as three crisp vertical bars. */
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
 * The chart style's way in from the header: flat or 3D as one quick toggle, separated by a
 * hairline from the palette swatch, Style label, active override count, and chevron.
 */
export function StyleMenuTrigger() {
  const { settings, setSetting, open, setOpen } = useChartSettings();
  const palette = (settings.palette as string | undefined) ?? AUTO;
  const changed = Object.values(settings).filter((value) => value !== undefined).length;
  const depth = settings.depth === true;
  return (
    <div className="lilt-style-trigger" role="group" aria-label="Chart style">
      <TooltipHint content={depth ? '3D depth · on' : '3D depth · off'} side="bottom">
        <button
          type="button"
          className="lilt-style-trigger__depth"
          aria-label={depth ? 'Turn depth off' : 'Turn depth on'}
          aria-pressed={depth}
          onClick={() => setSetting('depth', depth ? undefined : true)}
        >
          <Icon icon={depth ? CubeIcon : SquareIcon} size={14} strokeWidth={1.8} aria-hidden />
        </button>
      </TooltipHint>
      <span className="lilt-style-trigger__sep" aria-hidden="true" />
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
        {changed ? (
          <span className="lilt-style-trigger__count" aria-label={`${changed} custom settings`}>
            {changed}
          </span>
        ) : null}
        <Icon
          icon={ArrowDown01Icon}
          size={12}
          strokeWidth={1.9}
          className="lilt-style-trigger__chev"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

/**
 * Everything that styles every chart, in one nested warm-stone / dusk inspector beside the page.
 * Chart pages never repeat these controls.
 */
export function StyleMenu() {
  const { settings, setSetting, reset, open, setOpen } = useChartSettings();
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const depthThumbId = useId();
  const [anchor, setAnchor] = useState<{ top: number; left: number; originX: number } | null>(null);
  const palette = (settings.palette as string | undefined) ?? AUTO;
  const changed = Object.values(settings).filter((value) => value !== undefined).length;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = document.querySelector<HTMLElement>('[data-style-trigger]');
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const center = rect.left + rect.width / 2;
      const left = Math.round(
        Math.min(Math.max(center - width / 2, 12), window.innerWidth - width - 12),
      );
      const top = Math.round(rect.bottom + 8);
      setAnchor({ top, left, originX: Math.round(center - left) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

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
    const modified = value !== AUTO;
    return (
      <div key={key} className="lilt-style-menu__row">
        <Link
          href={control.href}
          className="lilt-style-menu__row-label"
          data-changed={modified || undefined}
          onClick={() => setOpen(false)}
        >
          <span>{control.label}</span>
          {modified ? <span className="lilt-style-menu__dot" aria-hidden="true" /> : null}
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
            data-changed={modified || undefined}
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
          style={
            anchor
              ? {
                  top: anchor.top,
                  left: anchor.left,
                  right: 'auto',
                  transformOrigin: `${anchor.originX}px 0`,
                }
              : undefined
          }
          initial={reduced ? false : { opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, y: -4, scale: 0.985 }
          }
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="lilt-style-menu__head">
            <div>
              <h2 id={titleId}>Chart style</h2>
              <p>Applies across every chart</p>
            </div>
            <button
              type="button"
              className="lilt-style-menu__close"
              aria-label="Close chart style"
              onClick={() => setOpen(false)}
            >
              <Icon icon={Cancel01Icon} size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </header>

          <div className="lilt-style-menu__scroll">
            <div className="lilt-style-menu__card">
              <section className="lilt-style-menu__block" aria-label="Palette">
                <div className="lilt-style-menu__block-head">
                  <h3>Palette</h3>
                  <span className="lilt-style-menu__block-val">{paletteNames[palette]}</span>
                </div>
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

              <section className="lilt-style-menu__block lilt-style-menu__depth" aria-label="Depth">
                <h3>Depth</h3>
                <div className="lilt-style-menu__seg" role="group" aria-label="Depth">
                  {(
                    [
                      [false, 'Flat', SquareIcon],
                      [true, '3D', CubeIcon],
                    ] as const
                  ).map(([value, label, icon]) => {
                    const active = (settings.depth === true) === value;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSetting('depth', value ? true : undefined)}
                      >
                        {active ? (
                          <motion.span
                            layoutId={depthThumbId}
                            className="lilt-style-menu__seg-thumb"
                            transition={reduced ? { duration: 0 } : THUMB_SPRING}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="lilt-style-menu__seg-label">
                          <Icon icon={icon} size={13} strokeWidth={1.8} aria-hidden="true" />
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {groups.map((group) => (
              <section
                key={group.label}
                className="lilt-style-menu__card lilt-style-menu__group"
                aria-label={group.label}
              >
                <h3>{group.label}</h3>
                <div className="lilt-style-menu__rows">{group.keys.map(row)}</div>
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

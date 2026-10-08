'use client';

import { HugeiconsIcon as Icon, type IconSvgElement } from '@hugeicons/react';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import CubeIcon from '@hugeicons/core-free-icons/CubeIcon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon';
import SquareIcon from '@hugeicons/core-free-icons/SquareIcon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AUTO, controls, useChartSettings, type Control } from '@/components/docs/chart-settings';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipHint } from '@/components/ui/tooltip';
import { swellTo } from './swell';
import { useHairline, useSheetEdge } from './use-hairline';
import type { ChartDocSettings } from '@/lib/card-docs/resolve-example';

// The contour stays still while the controls open beside it. Depth runs in from the right edge.
// The frame's edge swells out of the strip in one long curve, holds the controls at full depth,
// and eases back: a swell, like the rail's, rather than a tab with corners.
const STRIP = 8;
const REST = 48;
// The swell's run along the edge. Both tangents lie along the edge, so the shape leaves the strip
// and arrives at full depth without a corner.
const TAPER = 64;
// The panel lines up with the top of the notch's shape.
const JOIN = 14;
// Three quick controls start just before full depth, then a hairline and the gear; the gear ends as
// far into the lower taper as the first control starts before the upper one ends.
const QUICK_TOP = TAPER - 4;
const GEAR_TOP = QUICK_TOP + 3 * 32 + 10;
const BODY = GEAR_TOP + 32 + 4;

/**
 * The notch's contour. It leaves and rejoins the sheet on its border's measured centre line
 * (`edge`, its depth from the frame's edge), so the outline continues the border without a step,
 * and its curves ease out of the border with no bend (see `swellTo`).
 */
function notchPath(reach: number, body: number, closed: boolean, edge: number) {
  const end = body + TAPER;
  return [
    closed ? `M 0 0 H ${edge}` : `M ${edge} 0`,
    swellTo([edge, 0], [reach, TAPER], 'y'),
    `V ${body}`,
    swellTo([reach, body], [edge, end], 'y'),
    closed ? `H 0 Z` : '',
  ].join(' ');
}

const controlFor = (key: keyof ChartDocSettings) =>
  controls.find((control) => control.key === key)!;
const paletteControl = controlFor('palette');
const depthControl = controlFor('depth');
const groups = [
  { label: 'Appearance', keys: ['depth', 'surface', 'background'] },
  {
    label: 'Reading & motion',
    keys: ['axis', 'hover', 'legend', 'numberStyle', 'loadingStyle', 'empty'],
  },
] as const;
const paletteNames: Record<string, string> = {
  [AUTO]: 'Auto',
  iris: 'Iris',
  cobalt: 'Cobalt',
  emerald: 'Emerald',
};
const textOf = (label: unknown, value: string) =>
  typeof label === 'string' ? label : (paletteNames[value] ?? value);

type ThemeMode = 'system' | 'light' | 'dark';
const themeModes: readonly ThemeMode[] = ['system', 'light', 'dark'];
const themeNames: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const themeIcons: Record<ThemeMode, IconSvgElement> = {
  system: ComputerIcon,
  light: Sun03Icon,
  dark: Moon02Icon,
};

function valueOf(control: Control<keyof ChartDocSettings>, settings: ChartDocSettings) {
  const current = settings[control.key];
  return control.format ? control.format(current) : ((current as string | undefined) ?? AUTO);
}

/** Actual palette colours, rather than a progress ring for an unordered setting. */
function PaletteMark({ palette }: { palette: string }) {
  return (
    <span
      className="lilt-style-notch__colors"
      data-lilt-chart=""
      data-lilt-palette={palette === AUTO ? 'iris' : palette}
      data-auto={palette === AUTO || undefined}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
    </span>
  );
}

function QuickControl({
  label,
  hint,
  active,
  onTurn,
  children,
}: {
  label: string;
  hint: string;
  active?: boolean;
  onTurn: (backwards: boolean) => void;
  children: ReactNode;
}) {
  return (
    <TooltipHint content={hint} side="left">
      <button
        type="button"
        className="lilt-style-notch__quick"
        aria-label={label}
        data-active={active || undefined}
        onClick={(event) => onTurn(event.shiftKey)}
      >
        {children}
      </button>
    </TooltipHint>
  );
}

/** Compact edge controls and a theme-aware settings panel that leaves the chart in place. */
export function StyleNotch() {
  const { settings, setSetting, reset, open, setOpen } = useChartSettings();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const reduced = Boolean(useReducedMotion());
  const hairline = useHairline();
  const shapeRef = useRef<SVGSVGElement>(null);
  const sheet = useSheetEdge(shapeRef, 'right', {
    centre: STRIP + hairline / 2,
    inner: STRIP + hairline,
  });
  const [mounted, setMounted] = useState(false);
  const [room, setRoom] = useState<number>();
  const rootRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const palette = (settings.palette as string | undefined) ?? AUTO;
  const changed = Object.values(settings).filter((value) => value !== undefined).length;
  const mode: ThemeMode = mounted && (theme === 'light' || theme === 'dark') ? theme : 'system';
  const quickTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const nextTheme = quickTheme === 'dark' ? 'light' : 'dark';
  const quickPalette = palette === AUTO ? 'iris' : palette;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const measure = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      const frameBottom = rootRef.current?.closest('.lilt-shell')?.getBoundingClientRect().bottom;
      setRoom(
        Math.max(
          0,
          Math.min(window.innerHeight, frameBottom ?? window.innerHeight) - top - JOIN - 16,
        ),
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const close = () => {
    if (rootRef.current?.contains(document.activeElement)) gearRef.current?.focus();
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // A select's first Escape belongs to its own popup.
      if (document.querySelector('.lilt-style-notch__menu:not([data-closed])')) return;
      if (rootRef.current?.contains(document.activeElement)) gearRef.current?.focus();
      setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (rootRef.current?.contains(target) || target?.closest('.lilt-style-notch__menu')) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open, setOpen]);

  const turn = (control: Control<keyof ChartDocSettings>, backwards: boolean) => {
    const values = control.options.map((option) => option.value).filter((value) => value !== AUTO);
    const index = Math.max(0, values.indexOf(valueOf(control, settings)));
    const next = values[(index + (backwards ? values.length - 1 : 1)) % values.length]!;
    setSetting(
      control.key,
      next === AUTO ? undefined : control.parse ? control.parse(next) : (next as never),
    );
  };
  const nextOf = (control: Control<keyof ChartDocSettings>) => {
    const values = control.options.map((option) => option.value).filter((value) => value !== AUTO);
    const index = Math.max(0, values.indexOf(valueOf(control, settings)));
    const next = values[(index + 1) % values.length]!;
    return textOf(control.options.find((option) => option.value === next)?.label, next);
  };
  const depth = settings.depth ? '3d' : 'flat';
  const depthName = textOf(
    depthControl.options.find((option) => option.value === depth)?.label,
    depth,
  );

  const row = (key: keyof ChartDocSettings) => {
    const control = controlFor(key);
    const value = valueOf(control, settings);
    return (
      <div key={key} className="lilt-style-notch__row">
        <Link
          href={control.href}
          className="lilt-style-notch__row-label"
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
            className="lilt-style-notch__select"
            aria-label={control.label}
            data-changed={value !== AUTO || undefined}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectPopup className="lilt-style-notch__menu" align="end">
            {control.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {textOf(option.label, option.value)}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </div>
    );
  };

  return (
    <div ref={rootRef} className="lilt-style-notch" data-open={open || undefined}>
      <svg
        ref={shapeRef}
        className="lilt-style-notch__shape"
        width={REST}
        height={BODY + TAPER}
        aria-hidden="true"
        focusable="false"
      >
        <g transform={`translate(${REST} 0) scale(-1 1)`}>
          <path className="lilt-style-notch__fill" d={notchPath(REST, BODY, true, sheet.centre)} />
          {/* Covers the sheet's own border along the notch, so its outline is the only line. */}
          <rect
            className="lilt-style-notch__fill"
            x={0}
            y={0}
            width={sheet.inner}
            height={BODY + TAPER}
          />
          <path
            className="lilt-style-notch__stroke"
            d={notchPath(REST, BODY, false, sheet.centre)}
            style={{ strokeWidth: hairline }}
          />
        </g>
      </svg>
      <div
        className="lilt-style-notch__quick-controls"
        role="group"
        aria-label="Quick chart style"
        style={{ top: QUICK_TOP }}
      >
        <QuickControl
          label={`Palette: ${paletteNames[quickPalette] ?? quickPalette}. Change to ${nextOf(paletteControl)}`}
          hint={`Palette · ${paletteNames[quickPalette] ?? quickPalette}`}
          onTurn={(backwards) => turn(paletteControl, backwards)}
        >
          <PaletteMark palette={palette} />
        </QuickControl>
        <QuickControl
          label={`Depth: ${depthName}. Change to ${nextOf(depthControl)}`}
          hint={`Depth · ${depthName}`}
          active={settings.depth === true}
          onTurn={(backwards) => turn(depthControl, backwards)}
        >
          <Icon
            icon={settings.depth ? CubeIcon : SquareIcon}
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </QuickControl>
        <QuickControl
          label={`Theme: ${themeNames[quickTheme]}. Change to ${themeNames[nextTheme]}`}
          hint={`Theme · ${themeNames[quickTheme]}`}
          onTurn={() => setTheme(nextTheme)}
        >
          <Icon icon={themeIcons[quickTheme]} size={18} strokeWidth={1.6} aria-hidden="true" />
        </QuickControl>
      </div>
      <div className="lilt-style-notch__gear-slot" style={{ top: GEAR_TOP }}>
        <TooltipHint content={open ? 'Close chart style' : 'Chart style'} side="left">
          <button
            ref={gearRef}
            type="button"
            className="lilt-style-notch__gear"
            aria-label="Chart style"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <Icon icon={Settings02Icon} size={18} strokeWidth={1.6} aria-hidden="true" />
            {changed ? <span className="lilt-style-notch__changed" aria-hidden="true" /> : null}
          </button>
        </TooltipHint>
      </div>
      <motion.section
        id={`${id}-panel`}
        className="lilt-style-notch__panel"
        aria-label="Chart style settings"
        aria-hidden={!open}
        inert={!open || undefined}
        style={{ top: JOIN, maxHeight: room }}
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          x: open ? 0 : 10,
          scale: open ? 1 : 0.985,
          filter: open ? 'blur(0px)' : 'blur(2px)',
        }}
        transition={{ duration: reduced ? 0 : open ? 0.32 : 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="lilt-style-notch__head">
          <div>
            <h2>Chart style</h2>
            <p>Applies to every chart.</p>
          </div>
          <button
            type="button"
            className="lilt-style-notch__close"
            aria-label="Close chart style"
            onClick={close}
          >
            <Icon icon={Cancel01Icon} size={17} aria-hidden="true" />
          </button>
        </header>
        <div className="lilt-style-notch__scroll">
          <section className="lilt-style-notch__section" aria-label="Palette">
            <h3>Palette</h3>
            <div className="lilt-style-notch__palettes">
              {paletteControl.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="lilt-style-notch__palette"
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
          <section className="lilt-style-notch__section" aria-label="Theme">
            <h3>Theme</h3>
            <div className="lilt-style-notch__themes" role="group" aria-label="Theme">
              {themeModes.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setTheme(value)}
                >
                  <Icon icon={themeIcons[value]} size={15} aria-hidden="true" />
                  <span>{themeNames[value]}</span>
                </button>
              ))}
            </div>
          </section>
          {groups.map((group) => (
            <section
              key={group.label}
              className="lilt-style-notch__section"
              aria-label={group.label}
            >
              <h3>{group.label}</h3>
              {group.keys.map(row)}
            </section>
          ))}
        </div>
        <footer className="lilt-style-notch__foot">
          <span>
            {changed
              ? `${changed} custom ${changed === 1 ? 'setting' : 'settings'}`
              : 'Using chart defaults'}
          </span>
          <button
            type="button"
            className="lilt-style-notch__reset"
            disabled={!changed}
            onClick={reset}
          >
            Reset styles
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

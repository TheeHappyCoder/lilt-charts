'use client';

import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'motion/react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AUTO, controls, useChartSettings, type Control } from '@/components/docs/chart-settings';
import { Segmented } from '@/components/ui/segmented';
import type { ChartDocSettings } from '@/lib/card-docs/resolve-example';
import { useNotchSlotRef } from './notch-slot';

const controlFor = (key: keyof ChartDocSettings) =>
  controls.find((control) => control.key === key)!;
const paletteControl = controlFor('palette');
const depthControl = controlFor('depth');
const surfaceControl = controlFor('surface');
const quickKeys = new Set<string>(['palette', 'depth', 'surface']);
const moreControls = controls.filter((control) => !quickKeys.has(control.key));
const paletteNames: Record<string, string> = {
  [AUTO]: 'Auto',
  iris: 'Iris',
  cobalt: 'Cobalt',
  emerald: 'Emerald',
};
const themes = [
  {
    value: 'system',
    label: (
      <>
        <Icon icon={ComputerIcon} size={14} aria-hidden="true" />
        System
      </>
    ),
  },
  {
    value: 'light',
    label: (
      <>
        <Icon icon={Sun03Icon} size={14} aria-hidden="true" />
        Light
      </>
    ),
  },
  {
    value: 'dark',
    label: (
      <>
        <Icon icon={Moon02Icon} size={14} aria-hidden="true" />
        Dark
      </>
    ),
  },
];

/** Centre line of the sheet's 1px top border; the notch stroke continues it exactly. */
const EDGE = 8.5;
/** The concave join where the sheet's edge turns down into the notch. */
const FILLET = 14;
const RADIUS = 20;
const REST_HEIGHT = 50;
const OPEN_WIDTH = 640;
/** The frame's corner radius: the notch's joins must land on the straight edge beyond it. */
const FRAME_CORNER = 20;
/** A little straight edge kept between the frame's corner and the notch's join. */
const CORNER_CLEARANCE = 6;
/** Handle length a little past a circular arc, so straight edges flow into curves without a kink. */
const SMOOTH = 0.62;

/** The notch outline in its own coordinates: fillet, side, rounded foot, side, fillet. */
function notchPath(width: number, height: number, closed: boolean) {
  const f = FILLET;
  const left = f;
  const right = f + width;
  const end = width + 2 * f;
  const foot = height - 0.5;
  const r = Math.max(0, Math.min(RADIUS, foot - EDGE - f));
  return [
    closed ? `M 0 0 V ${EDGE}` : `M 0 ${EDGE}`,
    `C ${SMOOTH * f} ${EDGE} ${left} ${EDGE + f - SMOOTH * f} ${left} ${EDGE + f}`,
    `V ${foot - r}`,
    `C ${left} ${foot - r + SMOOTH * r} ${left + r - SMOOTH * r} ${foot} ${left + r} ${foot}`,
    `H ${right - r}`,
    `C ${right - r + SMOOTH * r} ${foot} ${right} ${foot - r + SMOOTH * r} ${right} ${foot - r}`,
    `V ${EDGE + f}`,
    `C ${right} ${EDGE + f - SMOOTH * f} ${end - SMOOTH * f} ${EDGE} ${end} ${EDGE}`,
    closed ? 'V 0 Z' : '',
  ].join(' ');
}

/** Only the rounded foot of the notch, where the palette light leaks out. */
function footPath(width: number, height: number) {
  const left = FILLET;
  const right = FILLET + width;
  const foot = height - 0.5;
  const r = Math.max(0, Math.min(RADIUS, foot - EDGE - FILLET));
  return [
    `M ${left} ${foot - r}`,
    `C ${left} ${foot - r + SMOOTH * r} ${left + r - SMOOTH * r} ${foot} ${left + r} ${foot}`,
    `H ${right - r}`,
    `C ${right - r + SMOOTH * r} ${foot} ${right} ${foot - r + SMOOTH * r} ${right} ${foot - r}`,
  ].join(' ');
}

const body: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: -8, filter: 'blur(4px)' },
  shown: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', bounce: 0, duration: 0.45 },
  },
};
const still: Variants = { hidden: { opacity: 0 }, shown: { opacity: 1 } };

interface Measures {
  rest: number;
  room: number;
  content: number;
}

/**
 * The notch hanging from the top of the sheet. At rest it holds search, the site's chart
 * style, and the theme; opened, the same outline grows down into every style setting.
 */
export function ChartIsland({ leading, trailing }: { leading?: ReactNode; trailing?: ReactNode }) {
  const { settings, setSetting, reset, open, setOpen } = useChartSettings();
  const setSlot = useNotchSlotRef();
  const { theme, setTheme } = useTheme();
  const reduced = Boolean(useReducedMotion());
  const [mounted, setMounted] = useState(false);
  const [more, setMore] = useState(false);
  const [measures, setMeasures] = useState<Measures | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const lightId = 'lilt-notch-light' + panelId.replace(/[^a-zA-Z0-9]/g, '');
  const palette = settings.palette ?? 'iris';
  const expanded = open;
  const settingCount = Object.values(settings).filter((value) => value !== undefined).length;

  const width = useMotionValue(0);
  const height = useMotionValue(REST_HEIGHT);
  const outerWidth = useTransform(width, (value) => value + 2 * FILLET);
  const shape = useTransform(() => notchPath(width.get(), height.get(), true));
  const stroke = useTransform(() => notchPath(width.get(), height.get(), false));
  const foot = useTransform(() => footPath(width.get(), height.get()));
  const lift = useTransform(height, [REST_HEIGHT, REST_HEIGHT + 120], [0, 1]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const rest = restRef.current;
    const inner = innerRef.current;
    if (!anchor || !rest || !inner) return;
    const update = () => {
      const next = {
        rest: rest.offsetWidth,
        room: anchor.offsetWidth,
        content: inner.offsetHeight,
      };
      setMeasures((current) =>
        current &&
        current.rest === next.rest &&
        current.room === next.room &&
        current.content === next.content
          ? current
          : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    observer.observe(rest);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [expanded]);

  const openWidth = measures
    ? Math.max(
        measures.rest,
        Math.min(
          OPEN_WIDTH,
          // Joins and corners both fit: the panel never reaches the frame's rounded corners.
          measures.room - 2 * (FILLET + FRAME_CORNER + CORNER_CLEARANCE),
        ),
      )
    : 0;
  const targetWidth = measures ? (expanded ? openWidth : measures.rest) : 0;
  const targetHeight = expanded && measures ? measures.content : REST_HEIGHT;
  const settled = useRef(false);

  useEffect(() => {
    if (!targetWidth) return;
    // The first measure, and reduced motion, land in place; after that the outline is sprung.
    if (!settled.current || reduced) {
      width.jump(targetWidth);
      height.jump(targetHeight);
      settled.current = true;
      return;
    }
    // Opening leads with width, like a notch spreading before it drops; closing lifts first.
    const growing = targetHeight > height.get();
    const across = animate(width, targetWidth, {
      type: 'spring',
      bounce: 0.16,
      duration: 0.5,
      delay: growing ? 0 : 0.05,
    });
    const down = animate(height, targetHeight, {
      type: 'spring',
      bounce: growing ? 0.2 : 0.06,
      duration: growing ? 0.55 : 0.4,
      delay: growing ? 0.04 : 0,
    });
    return () => {
      across.stop();
      down.stop();
    };
  }, [targetWidth, targetHeight, reduced, width, height]);

  const close = () => {
    setOpen(false);
  };

  useEffect(() => {
    // A copy of the page the router keeps hidden must not treat clicks on the visible one as outside.
    if (!expanded || !rootRef.current?.getClientRects().length) return;
    const dismiss = () => {
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const inside = rootRef.current?.contains(document.activeElement);
      dismiss();
      if (inside) triggerRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) dismiss();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [expanded, setOpen]);

  const motionItem = reduced ? still : item;

  const glide = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 520, damping: 42 } as const);

  const field = (control: Control<keyof ChartDocSettings>) => {
    const current = settings[control.key];
    const value = control.format
      ? control.format(current)
      : ((current as string | undefined) ?? AUTO);
    return (
      <div key={control.key} className="lilt-notch__field">
        <Link href={control.href} className="lilt-notch__label" onClick={close}>
          {control.label}
        </Link>
        <Segmented
          label={control.label}
          value={value}
          options={control.options}
          onChange={(next) =>
            setSetting(
              control.key,
              next === AUTO ? undefined : control.parse ? control.parse(next) : (next as never),
            )
          }
        />
      </div>
    );
  };

  // The palettes as tiles, each a tiny chart in its own colours, the chosen one ringed.
  const palettes = (
    <div className="lilt-palettes" role="group" aria-label="Palette">
      {paletteControl.options.map((option) => {
        const selected = (settings.palette ?? AUTO) === option.value;
        const auto = option.value === AUTO;
        return (
          <button
            key={option.value}
            type="button"
            className="lilt-palette"
            aria-pressed={selected}
            onClick={() => setSetting('palette', auto ? undefined : (option.value as never))}
          >
            {selected ? (
              <motion.span
                aria-hidden="true"
                className="lilt-palette__ring"
                layoutId={`${panelId}-palette`}
                initial={false}
                transition={glide}
              />
            ) : null}
            <span
              className="lilt-palette__swatch"
              data-lilt-chart=""
              data-lilt-palette={auto ? undefined : option.value}
              data-auto={auto || undefined}
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
            <span className="lilt-palette__name">{paletteNames[option.value] ?? option.value}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="lilt-notch-anchor" ref={anchorRef}>
      <motion.div
        ref={rootRef}
        className="lilt-notch"
        data-open={expanded || undefined}
        data-ready={measures ? '' : undefined}
        style={{ width: outerWidth, height }}
        onBlur={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
        }}
      >
        <motion.svg
          className="lilt-notch__lift"
          style={{ opacity: lift }}
          aria-hidden="true"
          focusable="false"
        >
          <motion.path d={shape} />
        </motion.svg>
        <svg
          className="lilt-notch__shape"
          data-lilt-chart=""
          data-lilt-palette={palette}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id={lightId}>
              <stop offset="0" className="lilt-notch__light-1" stopOpacity="0" />
              <stop offset="0.22" className="lilt-notch__light-1" />
              <stop offset="0.5" className="lilt-notch__light-2" />
              <stop offset="0.78" className="lilt-notch__light-3" />
              <stop offset="1" className="lilt-notch__light-3" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path className="lilt-notch__fill" d={shape} />
          <motion.path className="lilt-notch__stroke" d={stroke} />
          <motion.path className="lilt-notch__light" d={foot} stroke={`url(#${lightId})`} />
        </svg>
        <motion.div className="lilt-notch__clip" style={{ width, height }}>
          <div
            ref={innerRef}
            className="lilt-notch__inner"
            style={openWidth ? { width: openWidth } : undefined}
          >
            <div ref={restRef} className="lilt-notch__rest">
              {leading}
              <span className="lilt-notch__divider" aria-hidden="true" />
              <button
                ref={triggerRef}
                className="lilt-notch__trigger"
                type="button"
                aria-label={settingCount ? `Chart style, ${settingCount} changed` : 'Chart style'}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => (open ? close() : setOpen(true))}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setOpen(true);
                  }
                }}
              >
                <span
                  className="lilt-notch__dots"
                  data-lilt-chart=""
                  data-lilt-palette={palette}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                </span>
                <Icon
                  icon={ArrowDown01Icon}
                  size={14}
                  aria-hidden="true"
                  className="lilt-notch__chevron"
                />
                {/* How many settings differ from Auto, so a style chosen weeks ago is never a mystery. */}
                {settingCount ? (
                  <span className="lilt-notch__count" aria-hidden="true">
                    {settingCount}
                  </span>
                ) : null}
              </button>
              {trailing}
              {/* A chart page hands its stage's controls in here. */}
              <span ref={setSlot} className="lilt-notch__slot" />
            </div>
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="settings"
                  id={panelId}
                  className="lilt-notch__body"
                  role="region"
                  aria-label="Chart style settings"
                  variants={body}
                  initial="hidden"
                  animate="shown"
                  exit="exit"
                >
                  <motion.div className="lilt-notch__section" variants={motionItem}>
                    <Link href={paletteControl.href} className="lilt-notch__label" onClick={close}>
                      Palette
                    </Link>
                    {palettes}
                  </motion.div>
                  {/* Wide screens set the theme with the notch's own button, so Theme shows here
                      only on phones, where that button gives way. */}
                  <motion.div className="lilt-notch__pair" variants={motionItem}>
                    {field(depthControl)}
                    <div className="lilt-notch__field lilt-notch__theme">
                      <span className="lilt-notch__label">Theme</span>
                      <Segmented
                        label="Theme"
                        value={mounted ? theme : undefined}
                        options={themes}
                        onChange={setTheme}
                      />
                    </div>
                    {field(surfaceControl)}
                  </motion.div>
                  <motion.div className="lilt-notch__more" variants={motionItem}>
                    <button
                      type="button"
                      className="lilt-notch__more-toggle"
                      aria-expanded={more}
                      onClick={() => setMore((open) => !open)}
                    >
                      <span>More settings</span>
                      <span className="lilt-notch__more-count">{moreControls.length}</span>
                      <Icon
                        icon={ArrowDown01Icon}
                        size={14}
                        aria-hidden="true"
                        className="lilt-notch__more-chevron"
                      />
                    </button>
                    {more ? (
                      <div className="lilt-notch__rows">{moreControls.map(field)}</div>
                    ) : null}
                  </motion.div>
                  <motion.div className="lilt-notch__foot" variants={motionItem}>
                    <span>
                      {settingCount
                        ? settingCount + ' set for every chart'
                        : 'As every chart ships'}
                    </span>
                    <button
                      type="button"
                      className="lilt-notch__reset"
                      disabled={!settingCount}
                      onClick={reset}
                    >
                      Reset all
                    </button>
                    <button
                      type="button"
                      className="lilt-notch__close"
                      aria-label="Close chart style"
                      onClick={() => {
                        close();
                        triggerRef.current?.focus();
                      }}
                    >
                      <Icon icon={Cancel01Icon} size={14} aria-hidden="true" />
                    </button>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

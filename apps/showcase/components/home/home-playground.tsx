'use client';

import type { ChartBarAppearance, ChartPalette, ChartSurface } from '@lilt-ui/charts';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import ChartColumnIcon from '@hugeicons/core-free-icons/ChartColumnIcon';
import CodeIcon from '@hugeicons/core-free-icons/CodeIcon';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import ReplayIcon from '@hugeicons/core-free-icons/ReplayIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CodeBlock } from '@/components/code-block';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { IconSwap } from '@/components/ui/icon-swap';
import { TooltipHint } from '@/components/ui/tooltip';
import { HERO_LOOK, heroSource, heroWithLook, type HeroLook } from '@/lib/home-hero';

const palettes: readonly { value: ChartPalette; label: string; colors: [string, string] }[] = [
  { value: 'spectrum', label: 'Spectrum', colors: ['#7c5cff', '#1d9bf0'] },
  { value: 'iris', label: 'Iris', colors: ['#7c5cff', '#e5489c'] },
  { value: 'cobalt', label: 'Cobalt', colors: ['#2f6fed', '#0fb3d3'] },
  { value: 'emerald', label: 'Emerald', colors: ['#0e9a77', '#84cc16'] },
];
const barStyles: readonly { value: ChartBarAppearance; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'segmented', label: 'Cells' },
  { value: 'gradient', label: 'Fade' },
  { value: 'outline', label: 'Line' },
];
const surfaces: readonly { value: ChartSurface; label: string }[] = [
  { value: 'elevated', label: 'Raised' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
];
const SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;

/** A pill track with a raised thumb that glides to the choice, as the inspector's controls. */
function Pills<Value extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  const reduced = Boolean(useReducedMotion());
  return (
    <div className="lilt-play__row">
      <span className="lilt-play__label">{label}</span>
      <div className="lilt-play__pills" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.value === value ? (
              <motion.span
                aria-hidden="true"
                className="lilt-play__thumb"
                layoutId={`lilt-play-${id}`}
                transition={reduced ? { duration: 0 } : SPRING}
              />
            ) : null}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The home page's centrepiece: one live card on a stage and an inspector beside it. Every choice
 * restyles the card with one prop, and Code shows the source for exactly what is on stage.
 */
export function HomePlayground() {
  const [look, setLook] = useState<HeroLook>(HERO_LOOK);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [replay, setReplay] = useState(0);
  const [copied, setCopied] = useState(false);
  const { code } = heroSource(look);
  const choose = <Key extends keyof HeroLook>(key: Key, value: HeroLook[Key]) =>
    setLook((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="lilt-play">
      <div className="lilt-play__stage">
        <div className="lilt-play__stage-bar">
          <div className="lilt-play__views" role="group" aria-label="View">
            {(
              [
                ['preview', ChartColumnIcon, 'Preview'],
                ['code', CodeIcon, 'Code'],
              ] as const
            ).map(([value, icon, label]) => (
              <TooltipHint key={value} content={label} side="bottom">
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                >
                  <Icon icon={icon} size={15} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </TooltipHint>
            ))}
          </div>
          <TooltipHint content="Replay animation" side="bottom">
            <button
              type="button"
              className="lilt-play__ghost"
              aria-label="Replay animation"
              disabled={view === 'code'}
              onClick={() => setReplay((count) => count + 1)}
            >
              <Icon icon={ReplayIcon} size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </TooltipHint>
        </div>
        {view === 'preview' ? (
          <div className="lilt-play__card" key={`${replay}-${look.depth}`}>
            <CardExamplePreview example={heroWithLook(look)} />
          </div>
        ) : (
          <div className="lilt-play__code">
            <CodeBlock code={code} />
          </div>
        )}
      </div>

      <aside className="lilt-play__inspector" aria-label="Restyle the chart">
        <div className="lilt-play__head">
          <h2>Daily sales</h2>
          <p>A stacked bar card. Every control below is one prop.</p>
        </div>
        <div className="lilt-play__controls">
          <div className="lilt-play__row">
            <span className="lilt-play__label">Palette</span>
            <div className="lilt-play__swatches" role="radiogroup" aria-label="Palette">
              {palettes.map((palette) => (
                <TooltipHint key={palette.value} content={palette.label} side="top">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={look.palette === palette.value}
                    aria-label={palette.label}
                    onClick={() => choose('palette', palette.value)}
                    style={{
                      background: `linear-gradient(135deg, ${palette.colors[0]} 50%, ${palette.colors[1]} 50%)`,
                    }}
                  />
                </TooltipHint>
              ))}
            </div>
          </div>
          <Pills
            id="bar"
            label="Bars"
            value={look.depth ? '3d' : look.barStyle}
            options={[...barStyles, { value: '3d', label: '3D' }]}
            onChange={(value) =>
              setLook((current) =>
                value === '3d'
                  ? { ...current, depth: true }
                  : { ...current, depth: false, barStyle: value as ChartBarAppearance },
              )
            }
          />
          <Pills
            id="surface"
            label="Surface"
            value={look.surface}
            options={surfaces}
            onChange={(value) => choose('surface', value)}
          />
        </div>
        <div className="lilt-play__actions">
          <button
            type="button"
            className="lilt-play__primary"
            onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true))}
          >
            <IconSwap
              active={copied}
              initial={<Icon icon={Copy01Icon} size={14} aria-hidden="true" />}
              alternate={<Icon icon={Tick02Icon} size={14} aria-hidden="true" />}
            />
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <Link href="/charts/bar" className="lilt-play__secondary">
            Bar chart docs
            <Icon icon={ArrowRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </div>
  );
}

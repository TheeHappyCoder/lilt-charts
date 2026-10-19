'use client';

import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon as Icon, type IconSvgElement } from '@hugeicons/react';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { TooltipHint } from '@/components/ui/tooltip';

type ThemeMode = 'system' | 'light' | 'dark';

const modes: readonly (readonly [ThemeMode, IconSvgElement, string])[] = [
  ['light', Sun03Icon, 'Light'],
  ['dark', Moon02Icon, 'Dark'],
  ['system', ComputerIcon, 'System'],
];

const origins: Record<string, string> = {
  'bottom-left': '0% 100%',
  'top-right': '100% 0%',
  'bottom-right': '100% 100%',
  top: '50% 0%',
};

/** The current mode once mounted, and a change that reveals the new theme from a corner. */
function useThemeMode(start: string) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => setMounted(true), []);
  const mode: ThemeMode | null = mounted
    ? theme === 'light' || theme === 'dark'
      ? theme
      : 'system'
    : null;

  const change = (next: ThemeMode) => {
    if (!mounted || next === theme) return;
    const root = document.documentElement;
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    if (reduced || !transitionDocument.startViewTransition) {
      setTheme(next);
      return;
    }
    root.dataset.themeTransition = 'circle-blur';
    root.style.setProperty('--theme-transition-origin', origins[start] ?? '50% 100%');
    const transition = transitionDocument.startViewTransition(() => setTheme(next));
    void transition.finished.finally(() => {
      delete root.dataset.themeTransition;
      root.style.removeProperty('--theme-transition-origin');
    });
  };
  return { mode, change, reduced };
}

/** Light, dark and system as three icons on one track, for the header. */
export function ThemeSegmented() {
  const { mode, change, reduced } = useThemeMode('top-right');
  return (
    <div className="lilt-theme-seg" role="group" aria-label="Theme">
      {modes.map(([value, icon, label]) => (
        <TooltipHint key={value} content={label} side="bottom">
          <button
            type="button"
            className="lilt-theme-seg__button"
            aria-label={`${label} theme`}
            aria-pressed={mode === value}
            onClick={() => change(value)}
          >
            {mode === value ? (
              <motion.span
                aria-hidden="true"
                className="lilt-theme-seg__thumb"
                layoutId="lilt-theme-seg"
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }
                }
              />
            ) : null}
            <Icon icon={icon} size={15} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </TooltipHint>
      ))}
    </div>
  );
}

/** A labelled theme row, for footers and templates. */
export function ThemeModeSwitcher({ start = 'bottom-left' }: { start?: string }) {
  const { mode, change, reduced } = useThemeMode(start);
  return (
    <div className="lilt-theme-mode">
      <span>Theme</span>
      <div className="lilt-theme-mode__buttons" aria-label="Theme">
        {modes.map(([value, icon, label]) => (
          <TooltipHint key={value} content={`Use ${label.toLowerCase()} theme`} side="top">
            <button
              aria-label={`Use ${label.toLowerCase()} theme`}
              className="lilt-theme-mode__button"
              data-active={mode === value}
              onClick={() => change(value)}
              type="button"
            >
              {mode === value ? (
                <motion.span
                  className="lilt-theme-mode__thumb"
                  layoutId="lilt-theme-indicator"
                  transition={
                    reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }
                  }
                />
              ) : null}
              <Icon icon={icon} aria-hidden="true" size={14} strokeWidth={1.5} />
            </button>
          </TooltipHint>
        ))}
      </div>
    </div>
  );
}

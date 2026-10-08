'use client';

import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { TooltipHint } from '@/components/ui/tooltip';

type ThemeMode = 'system' | 'light' | 'dark';

export function ThemeModeSwitcher({
  start = 'bottom-left',
  compact = false,
}: {
  start?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => setMounted(true), []);

  const changeTheme = (next: ThemeMode) => {
    if (!mounted || next === theme) return;
    const root = document.documentElement;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };
    if (reduced || !viewTransitionDocument.startViewTransition) {
      setTheme(next);
      return;
    }
    root.dataset.themeTransition = 'circle-blur';
    root.style.setProperty(
      '--theme-transition-origin',
      start === 'bottom-left'
        ? '0% 100%'
        : start === 'top-right'
          ? '100% 0%'
          : start === 'bottom-right'
            ? '100% 100%'
            : start === 'top'
              ? '50% 0%'
              : '50% 100%',
    );
    const transition = viewTransitionDocument.startViewTransition(() => setTheme(next));
    void transition.finished.finally(() => {
      delete root.dataset.themeTransition;
      root.style.removeProperty('--theme-transition-origin');
    });
  };

  if (compact) {
    const mode: ThemeMode = mounted && (theme === 'light' || theme === 'dark') ? theme : 'system';
    const next: ThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    const label = `Theme: ${mode}. Switch to ${next}`;
    return (
      <TooltipHint content={label} side="bottom">
        <button
          className="lilt-shell__theme"
          type="button"
          aria-label={label}
          onClick={() => changeTheme(next)}
        >
          <Icon
            icon={mode === 'light' ? Sun03Icon : mode === 'dark' ? Moon02Icon : ComputerIcon}
            aria-hidden="true"
            size={18}
            strokeWidth={1.6}
          />
        </button>
      </TooltipHint>
    );
  }

  return (
    <div className="lilt-theme-mode">
      <span>Theme</span>
      <div className="lilt-theme-mode__buttons" aria-label="Theme">
        {(
          [
            ['system', ComputerIcon],
            ['light', Sun03Icon],
            ['dark', Moon02Icon],
          ] as const
        ).map(([mode, icon]) => (
          <TooltipHint key={mode} content={`Use ${mode} theme`} side="top">
            <button
              aria-label={`Use ${mode} theme`}
              className="lilt-theme-mode__button"
              data-active={mounted && theme === mode}
              onClick={() => changeTheme(mode)}
              type="button"
            >
              {mounted && theme === mode ? (
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

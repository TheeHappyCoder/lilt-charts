'use client';

import { TooltipHint } from '@/components/ui/tooltip';
import { IconSwap } from '@/components/ui/icon-swap';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import PauseIcon from '@hugeicons/core-free-icons/PauseIcon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { useInView, useReducedMotion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CHARTS_PACKAGE,
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_STORAGE_KEY,
} from '@/lib/package-managers';

/** A copyable install command for the hero card's badge tab. */
export function HomeInstallBadge() {
  const root = useRef<HTMLDivElement>(null);
  const prefix = useRef<HTMLSpanElement>(null);
  const inView = useInView(root);
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const manager = PACKAGE_MANAGERS[index];
  const command = `${manager.install} ${CHARTS_PACKAGE}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY);
      const savedIndex = PACKAGE_MANAGERS.findIndex((item) => item.id === saved);
      if (savedIndex !== -1) setIndex(savedIndex);
    } catch {
      // npm remains available when storage is blocked.
    }
    const onVisibility = () => setVisible(!document.hidden);
    onVisibility();
    setReady(true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Commit the new text below the slot before letting the transition bring it into place.
  useLayoutEffect(() => {
    const element = prefix.current;
    if (!element?.classList.contains('is-enter-start')) return;
    void element.offsetHeight;
    element.classList.remove('is-enter-start');
  }, [index]);

  const frozen =
    !ready ||
    reducedMotion ||
    paused ||
    hovered ||
    focused ||
    !visible ||
    !inView ||
    copyState !== 'idle';

  useEffect(() => {
    const element = prefix.current;
    if (!element || frozen) return;
    let swap: number | undefined;
    const hold = window.setTimeout(() => {
      const duration = Number.parseFloat(
        getComputedStyle(element).getPropertyValue('--lilt-install-swap-duration'),
      );
      element.classList.add('is-exit');
      swap = window.setTimeout(() => {
        element.classList.add('is-enter-start');
        element.classList.remove('is-exit');
        setIndex((current) => (current + 1) % PACKAGE_MANAGERS.length);
      }, duration);
    }, 3400);
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(swap);
      element.classList.remove('is-exit', 'is-enter-start');
    };
  }, [frozen, index]);

  useEffect(() => {
    if (copyState !== 'copied' && copyState !== 'error') return;
    const timeout = window.setTimeout(
      () => setCopyState('idle'),
      copyState === 'error' ? 4000 : 1600,
    );
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const copy = async () => {
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(command);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  return (
    <div
      ref={root}
      className="lilt-home-install"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <code className="lilt-home-install__command">
        <span className="lilt-home-install__prompt" aria-hidden="true">
          $
        </span>
        <span className="lilt-home-install__prefix">
          <span ref={prefix} className="t-text-swap">
            {manager.install}
          </span>
        </span>{' '}
        <span>{CHARTS_PACKAGE}</span>
      </code>
      <div className="lilt-home-install__actions">
        <TooltipHint content={paused ? 'Resume command rotation' : 'Pause command rotation'}>
          <button
            type="button"
            className="lilt-home-install__action lilt-home-install__pause"
            aria-label={paused ? 'Resume command rotation' : 'Pause command rotation'}
            onClick={() => setPaused((current) => !current)}
          >
            <Icon icon={paused ? PlayIcon : PauseIcon} aria-hidden="true" size={14} />
          </button>
        </TooltipHint>
        <TooltipHint content={copyState === 'copied' ? 'Copied!' : 'Copy install command'}>
          <button
            type="button"
            className="lilt-home-install__action"
            aria-label={copyState === 'copied' ? 'Copied install command' : `Copy ${command}`}
            data-copied={copyState === 'copied' || undefined}
            disabled={copyState === 'copying'}
            onClick={() => void copy()}
          >
            <IconSwap
              active={copyState === 'copied'}
              initial={<Icon icon={Copy01Icon} aria-hidden="true" size={15} />}
              alternate={<Icon icon={Tick02Icon} aria-hidden="true" size={15} />}
            />
          </button>
        </TooltipHint>
      </div>
      <span
        role="status"
        className={copyState === 'error' ? 'lilt-home-install__error' : 'sr-only'}
      >
        {copyState === 'copied'
          ? 'Install command copied.'
          : copyState === 'error'
            ? 'Couldn’t copy. Select the command to copy it.'
            : ''}
      </span>
    </div>
  );
}

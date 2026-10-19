'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { useEffect, useState } from 'react';
import { IconSwap } from '@/components/ui/icon-swap';

/** One line to paste into a coding agent: the whole row copies it. */
export function HomeAgentPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  return (
    <button
      type="button"
      className="lilt-agent"
      data-copied={copied || undefined}
      aria-label={copied ? 'Copied the prompt' : `Copy the prompt: ${prompt}`}
      onClick={() => {
        void navigator.clipboard?.writeText(prompt).then(() => setCopied(true));
      }}
    >
      <span className="lilt-agent__label">Or ask your agent</span>
      <span className="lilt-agent__line">
        <span className="lilt-agent__caret" aria-hidden="true">
          ›
        </span>
        <span className="lilt-agent__text">{prompt}</span>
        <IconSwap
          active={copied}
          initial={<Icon icon={Copy01Icon} size={14} aria-hidden="true" />}
          alternate={<Icon icon={Tick02Icon} size={14} aria-hidden="true" />}
        />
      </span>
    </button>
  );
}

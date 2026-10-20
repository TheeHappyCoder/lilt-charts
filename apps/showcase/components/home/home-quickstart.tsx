'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { IconSwap } from '@/components/ui/icon-swap';
import {
  CHARTS_PACKAGE,
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_STORAGE_KEY,
  type PackageManager,
} from '@/lib/package-managers';

function useCopied() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => setCopied(true));
  };
  return [copied, copy] as const;
}

function CopyMark({ copied }: { copied: boolean }) {
  return (
    <span className="lilt-quickstart__copy" aria-hidden="true">
      <IconSwap
        active={copied}
        initial={<Icon icon={Copy01Icon} size={15} />}
        alternate={<Icon icon={Tick02Icon} size={15} />}
      />
    </span>
  );
}

/** The two ways in, as one card: install the package, or hand the prompt to a coding agent. */
export function HomeQuickstart({ task, docsUrl }: { task: string; docsUrl: string }) {
  const [manager, setManager] = useState<PackageManager>('npm');
  const [commandCopied, copyCommand] = useCopied();
  const [promptCopied, copyPrompt] = useCopied();
  const thumbId = `lilt-quickstart-thumb-${useId()}`;
  const reducedMotion = useReducedMotion();

  // Read after mounting so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY);
      if (PACKAGE_MANAGERS.some((item) => item.id === saved)) setManager(saved as PackageManager);
    } catch {
      // Storage can be unavailable in private windows; npm stays the default.
    }
  }, []);

  const choose = (next: PackageManager) => {
    setManager(next);
    try {
      window.localStorage.setItem(PACKAGE_MANAGER_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  };
  const command = `${PACKAGE_MANAGERS.find((item) => item.id === manager)!.install} ${CHARTS_PACKAGE}`;
  const prompt = `${task} Docs: ${docsUrl}`;

  return (
    <div className="lilt-quickstart">
      <div className="lilt-quickstart__row">
        <div className="lilt-quickstart__head">
          <span className="lilt-quickstart__label">Install</span>
          <div className="lilt-quickstart__managers" role="radiogroup" aria-label="Package manager">
            {PACKAGE_MANAGERS.map(({ id }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={manager === id}
                className="lilt-quickstart__manager"
                onClick={() => choose(id)}
              >
                {manager === id ? (
                  <motion.span
                    className="lilt-quickstart__thumb"
                    layoutId={thumbId}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 520, damping: 40 }
                    }
                  />
                ) : null}
                <span className="lilt-quickstart__manager-text">{id}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="lilt-quickstart__line"
          data-copied={commandCopied || undefined}
          aria-label={commandCopied ? 'Copied the command' : `Copy the command: ${command}`}
          onClick={() => copyCommand(command)}
        >
          <code className="lilt-quickstart__code">
            <span className="lilt-quickstart__sigil" aria-hidden="true">
              $
            </span>
            {command}
          </code>
          <CopyMark copied={commandCopied} />
        </button>
      </div>

      <div className="lilt-quickstart__row">
        <div className="lilt-quickstart__head">
          <span className="lilt-quickstart__label">Or ask your agent</span>
          <a className="lilt-quickstart__llms" href="/llms.txt">
            llms.txt
          </a>
        </div>
        <button
          type="button"
          className="lilt-quickstart__line"
          data-copied={promptCopied || undefined}
          aria-label={promptCopied ? 'Copied the prompt' : `Copy the prompt: ${prompt}`}
          onClick={() => copyPrompt(prompt)}
        >
          <span className="lilt-quickstart__code" data-wrap>
            <span className="lilt-quickstart__sigil" data-agent aria-hidden="true">
              ›
            </span>
            <span>
              {task} <span className="lilt-quickstart__muted">Docs: {docsUrl}</span>
            </span>
          </span>
          <CopyMark copied={promptCopied} />
        </button>
      </div>
    </div>
  );
}

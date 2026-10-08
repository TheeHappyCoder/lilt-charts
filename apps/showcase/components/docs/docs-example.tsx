'use client';

import { CardBadge } from '@lilt-ui/charts';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import FileScriptIcon from '@hugeicons/core-free-icons/FileScriptIcon';
import ReplayIcon from '@hugeicons/core-free-icons/ReplayIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { CodeBlock } from '@/components/code-block';
import { DocsInfo } from '@/components/docs/docs-info';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { TooltipHint } from '@/components/ui/tooltip';
import { IconSwap } from '@/components/ui/icon-swap';

export function CopyButton({
  text,
  label = 'Copy',
  compact = false,
}: {
  text: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  const button = (
    <button
      type="button"
      className="lilt-docs-copy"
      data-compact={compact || undefined}
      data-copied={copied || undefined}
      aria-label={copied ? 'Copied' : label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      <IconSwap
        active={copied}
        initial={<Icon icon={Copy01Icon} aria-hidden="true" size={14} />}
        alternate={<Icon icon={Tick02Icon} aria-hidden="true" size={14} />}
      />
      {compact ? null : <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
  return compact ? <TooltipHint content={copied ? 'Copied' : label}>{button}</TooltipHint> : button;
}

/** A lit stage for one example, with Preview and Code as a segmented control. */
export function DocsExample({
  children,
  code,
  label,
  filename = 'Example.tsx',
  size,
  info,
  head,
  badgeHead = false,
  codeNote,
  view: controlledView,
  onViewChange,
  replayKey,
}: {
  children: ReactNode;
  code: string;
  label: string;
  filename?: string;
  /** Stage width for the subject: `narrow` for a single tile, `wide` for a row of cards. */
  size?: 'narrow' | 'wide';
  info?: ReactNode;
  /**
   * A toolbar row above the subject, after Preview and Code. It replaces the floating toolbar, so
   * the caller places the actions and drives `view` and `replayKey`.
   */
  head?: ReactNode;
  /** Use the package glass tab to attach the toolbar to the chart stage. */
  badgeHead?: boolean;
  /** What the code shows, quietly beside its file name. */
  codeNote?: string;
  /** Preview or Code, when the caller owns the switch. */
  view?: 'preview' | 'code';
  onViewChange?: (view: 'preview' | 'code') => void;
  /** Bump to play the subject's entrance again, when the caller owns replay. */
  replayKey?: number;
}) {
  const [ownView, setOwnView] = useState<'preview' | 'code'>('preview');
  const [ownReplay, setReplay] = useState(0);
  const view = controlledView ?? ownView;
  const setView = (next: 'preview' | 'code') => {
    setOwnView(next);
    onViewChange?.(next);
  };
  const replay = replayKey ?? ownReplay;
  const thumbId = `lilt-docs-thumb-${useId()}`;
  const reducedMotion = useReducedMotion();
  const tab = (value: 'preview' | 'code', text: string) => (
    <TabsTab className="lilt-docs-segmented__tab" value={value}>
      {view === value ? (
        <motion.span
          aria-hidden="true"
          className="lilt-docs-segmented__thumb"
          layoutId={thumbId}
          transition={
            reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }
          }
        />
      ) : null}
      <span className="lilt-docs-segmented__text">{text}</span>
    </TabsTab>
  );
  return (
    <Tabs
      className="lilt-docs-example"
      data-badge-head={badgeHead || undefined}
      value={view}
      onValueChange={(next) => setView(next as 'preview' | 'code')}
    >
      {head ? (
        badgeHead ? (
          <CardBadge className="lilt-docs-example__head">
            <div className="lilt-stage__badge-controls">
              <TabsList className="lilt-docs-segmented" aria-label={`${label} view`}>
                {tab('preview', 'Preview')}
                {tab('code', 'Code')}
              </TabsList>
              {head}
            </div>
          </CardBadge>
        ) : (
          <div className="lilt-docs-example__head">
            <TabsList className="lilt-docs-segmented" aria-label={`${label} view`}>
              {tab('preview', 'Preview')}
              {tab('code', 'Code')}
            </TabsList>
            {head}
          </div>
        )
      ) : (
        <div className="lilt-docs-example__toolbar">
          <TabsList className="lilt-docs-segmented" aria-label={`${label} view`}>
            {tab('preview', 'Preview')}
            {tab('code', 'Code')}
          </TabsList>
          <div className="lilt-docs-example__actions">
            {info ? (
              <DocsInfo
                title={`${label} interactions`}
                footer={<Link href="/guides/motion">Interaction & accessibility guide →</Link>}
              >
                {info}
              </DocsInfo>
            ) : null}
            {view === 'preview' ? (
              <TooltipHint content="Replay animation">
                <button
                  type="button"
                  className="lilt-docs-copy"
                  data-compact
                  aria-label="Replay animation"
                  onClick={() => setReplay((count) => count + 1)}
                >
                  <Icon icon={ReplayIcon} aria-hidden="true" size={14} />
                </button>
              </TooltipHint>
            ) : null}
            <CopyButton text={code} label="Copy code" compact={view === 'preview'} />
          </div>
        </div>
      )}
      <div className="lilt-docs-example__body">
        <div className="lilt-docs-example__panels">
          <TabsPanel value="preview" className="lilt-docs-example__preview">
            <div className="lilt-docs-example__subject" data-size={size} key={replay}>
              {children}
            </div>
          </TabsPanel>
          <TabsPanel value="code" className="lilt-docs-example__code">
            <div className="lilt-docs-example__file">
              <Icon
                icon={FileScriptIcon}
                className="lilt-docs-example__file-icon"
                aria-hidden="true"
                size={15}
                strokeWidth={1.6}
              />
              <span className="lilt-docs-example__file-name">{filename}</span>
              {codeNote ? <span className="lilt-docs-example__file-note">{codeNote}</span> : null}
            </div>
            <div className="lilt-docs-example__source">
              <CodeBlock code={code} />
            </div>
          </TabsPanel>
        </div>
      </div>
    </Tabs>
  );
}

/** A short snippet with a copy button, e.g. a command or usage line. */
export function DocsSnippet({ code }: { code: string }) {
  return (
    <div className="lilt-docs-snippet">
      <pre>
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

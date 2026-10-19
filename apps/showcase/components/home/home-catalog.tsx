'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import ReplayIcon from '@hugeicons/core-free-icons/ReplayIcon';
import SparklesIcon from '@hugeicons/core-free-icons/SparklesIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CardExamplePreview } from '@/components/docs/card-example-preview';
import { catalogCode } from '@/components/shell/catalog-code';
import { IconSwap } from '@/components/ui/icon-swap';
import { chartDocs } from '@/lib/card-docs/registry';
import { cardComponents, cardModule } from '@/lib/card-docs/examples';
import { featureCards } from '@/lib/home-showcase';
import { SITE_URL } from '@/lib/llms';

/** Copies text and says so for a moment. */
function CellCopy({ text, label, icon }: { text: string; label: string; icon: typeof Copy01Icon }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);
  return (
    <button
      type="button"
      className="lilt-catalog__action"
      data-copied={copied || undefined}
      aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      <IconSwap
        active={copied}
        initial={<Icon icon={icon} size={12} strokeWidth={1.8} aria-hidden="true" />}
        alternate={<Icon icon={Tick02Icon} size={12} strokeWidth={2} aria-hidden="true" />}
      />
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

/**
 * One cell of the catalog: a live, hoverable card, its code and what to try, then its name and
 * two ways to take it away (a prompt for an agent, or the code). Mounts as it nears the screen.
 */
function CatalogCell({ href, hint, eager }: { href: string; hint: string; eager: boolean }) {
  const doc = chartDocs[href];
  const stage = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (visible) return;
    const element = stage.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  if (!doc) return null;
  const example = featureCards(doc.hero, { height: 188 })[0]!;
  const component = cardComponents[doc.kind];
  const prompt = `Add a Lilt ${doc.title.toLowerCase()} (${component} from ${cardModule(doc.kind)}) to my dashboard. Docs: ${SITE_URL}${href}`;

  return (
    <article className="lilt-catalog__cell" aria-labelledby={`catalog-${doc.kind}`}>
      <div className="lilt-catalog__meta">
        <span className="lilt-catalog__code">{catalogCode(href)}</span>
        <span className="lilt-catalog__hint">
          {hint}
          <button
            type="button"
            className="lilt-catalog__replay"
            onClick={() => setRun((count) => count + 1)}
            aria-label={`Replay the ${doc.title.toLowerCase()}`}
          >
            <Icon icon={ReplayIcon} size={12} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div ref={stage} className="lilt-catalog__stage">
        {visible ? (
          <div className="lilt-catalog__card">
            <CardExamplePreview key={run} example={example} />
          </div>
        ) : null}
      </div>
      <div className="lilt-catalog__foot">
        <div className="lilt-catalog__name">
          <Link href={href} id={`catalog-${doc.kind}`}>
            {doc.title}
            <Icon icon={ArrowUpRight01Icon} size={13} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <code>{component}</code>
        </div>
        <div className="lilt-catalog__actions">
          <CellCopy text={prompt} label="Agent" icon={SparklesIcon} />
          <CellCopy text={doc.usage} label="Copy" icon={Copy01Icon} />
        </div>
      </div>
    </article>
  );
}

/** A hairline catalog of live cards: every one draws, reads on hover, and replays. */
export function HomeCatalog({ items }: { items: readonly { href: string; hint: string }[] }) {
  return (
    <div className="lilt-catalog">
      {items.map((item, index) => (
        <CatalogCell key={item.href} href={item.href} hint={item.hint} eager={index < 3} />
      ))}
    </div>
  );
}

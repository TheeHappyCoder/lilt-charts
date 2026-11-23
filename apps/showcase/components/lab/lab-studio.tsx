'use client';

import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState, type ReactNode } from 'react';
import { Label } from '@/components/craft/label';
import { CopyButton } from '@/components/docs/docs-example';
import { customizeRoutes, featureRoutes } from '@/components/shell/nav-model';
import { DetailBar } from '@/components/showroom/detail-bar';
import { DetailPager } from '@/components/showroom/detail-next';
import {
  TravelingHighlightScope,
  TravelingHighlightTarget,
} from '@/components/ui/traveling-highlight';

export interface LabOption<Value extends string> {
  value: Value;
  label: string;
  /** A few words on what this option is for. */
  note: string;
}

/**
 * The showroom editorial frame every Features and Customize lab shares: sticky DetailBar,
 * display intro, horizontal pill switcher across sibling labs, full-width `--gut` workspace,
 * and Previous / Next pager cards above the shared footer.
 */
export function LabShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isFeatures = pathname.startsWith('/features');
  const routes = isFeatures ? featureRoutes : customizeRoutes;
  const groupLabel = isFeatures ? 'Features' : 'Customize';
  const noun = isFeatures ? 'feature' : 'setting';
  const index = routes.findIndex((route) => route.href === pathname);
  const prev = index > 0 ? routes[index - 1]! : null;
  const next = index >= 0 && index < routes.length - 1 ? routes[index + 1]! : null;

  return (
    <article className="lilt-showroom lilt-studio-page">
      <DetailBar
        tab="charts"
        title={title}
        chip={groupLabel}
        prev={prev ? { href: prev.href, label: prev.label } : null}
        next={next ? { href: next.href, label: next.label } : null}
      />

      <header className="lilt-detail-intro">
        <div className="lilt-detail-intro__copy">
          <Label reveal={false}>
            {groupLabel}
            <span className="lilt-chip">{routes.length}</span>
          </Label>
          <h1>{title}</h1>
          <p>{lede}</p>
        </div>
      </header>

      <nav className="lilt-lab-nav" aria-label={groupLabel}>
        <div className="lilt-lab-nav__track">
          {routes.map((route) => (
            <Link
              key={route.id}
              href={route.href}
              className="lilt-lab-nav__pill"
              aria-current={pathname === route.href ? 'page' : undefined}
            >
              {route.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="lilt-lab-body">{children}</div>

      <DetailPager
        prev={prev ? { href: prev.href, label: prev.label } : null}
        next={next ? { href: next.href, label: next.label } : null}
        noun={noun}
      />
    </article>
  );
}

/**
 * One setting, explored live. Pick an option and every card on the stage changes with it, or
 * switch to Compare to see all options side by side. A single option hides the picker, which
 * suits a feature that is always on.
 */
export function LabStudio<Value extends string>({
  label,
  prop,
  options,
  defaultValue,
  scene,
  compare,
  code: codeFor = (value) => `${prop}="${value}"`,
}: {
  /** Names the control for screen readers, e.g. "Palette". */
  label: string;
  /** The card prop this studio sets, shown in the code chip. */
  prop: string;
  options: readonly LabOption<Value>[];
  defaultValue: Value;
  /** The full stage for the chosen option. */
  scene: (value: Value) => ReactNode;
  /** A single compact card for the side-by-side comparison. Omit to offer no comparison. */
  compare?: (value: Value) => ReactNode;
  /** The code chip for an option. Defaults to `prop="value"`; `null` hides the chip. */
  code?: (value: Value) => string | null;
}) {
  const [value, setValue] = useState<Value>(defaultValue);
  const [comparing, setComparing] = useState(false);
  const reduced = useReducedMotion();
  const thumbId = `lilt-studio-thumb-${useId()}`;
  const current = options.find((option) => option.value === value) ?? options[0]!;
  const code = codeFor(current.value);

  return (
    <section className="lilt-studio" aria-label={label}>
      <div className="lilt-studio__bar">
        {options.length > 1 ? (
          <TravelingHighlightScope
            activationMode="pointer-and-focus"
            className="lilt-ui-highlight-scope"
          >
            <div
              className="lilt-studio__segmented"
              role="radiogroup"
              aria-label={label}
              data-disabled={comparing || undefined}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className="lilt-studio__option"
                    data-lilt-highlight={option.value}
                    disabled={comparing}
                    onClick={() => setValue(option.value)}
                    onKeyDown={(event) => {
                      const index = options.indexOf(option);
                      const step =
                        event.key === 'ArrowRight' || event.key === 'ArrowDown'
                          ? 1
                          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                            ? -1
                            : 0;
                      if (!step) return;
                      event.preventDefault();
                      const next = options[(index + step + options.length) % options.length]!;
                      setValue(next.value);
                      const group = event.currentTarget.parentElement;
                      (group?.children[options.indexOf(next)] as HTMLElement | undefined)?.focus();
                    }}
                    tabIndex={selected ? 0 : -1}
                  >
                    <TravelingHighlightTarget itemId={option.value} />
                    {selected && !comparing ? (
                      <motion.span
                        aria-hidden="true"
                        className="lilt-studio__thumb"
                        layoutId={thumbId}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 520, damping: 40 }
                        }
                      />
                    ) : null}
                    <span className="lilt-studio__option-text">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </TravelingHighlightScope>
        ) : null}
        <p className="lilt-studio__note" aria-live="polite">
          {comparing ? `All ${options.length}, side by side` : current.note}
        </p>
        <div className="lilt-studio__actions">
          {comparing || code === null ? null : (
            <span className="lilt-studio__code">
              <code>{code}</code>
              <CopyButton text={code} label={`Copy ${code}`} compact />
            </span>
          )}
          {compare ? (
            <button
              type="button"
              className="lilt-studio__compare"
              aria-pressed={comparing}
              onClick={() => setComparing((on) => !on)}
            >
              {comparing ? 'Explore' : 'Compare'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="lilt-studio__stage" data-comparing={comparing || undefined}>
        {comparing && compare ? (
          <div className="lilt-studio__compare-grid">
            {options.map((option) => (
              <figure className="lilt-studio__cell" key={option.value}>
                <figcaption>
                  <span className="lilt-studio__chip">{option.label}</span>
                </figcaption>
                {compare(option.value)}
              </figure>
            ))}
          </div>
        ) : (
          scene(value)
        )}
      </div>
    </section>
  );
}

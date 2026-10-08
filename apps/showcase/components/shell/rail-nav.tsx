'use client';

import { HugeiconsIcon as Icon } from '@hugeicons/react';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import SidebarLeftIcon from '@hugeicons/core-free-icons/SidebarLeftIcon';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipHint } from '@/components/ui/tooltip';
import { useChartSettings } from '@/components/docs/chart-settings';
import type { AppRoute } from '@/lib/routes';
import { ChartGlyph, hasGlyph } from './chart-glyph';
import { HeaderSearch } from './docs-search';
import { groupsByTab, icons, tabs, type Tab } from './nav-model';

const SPRING = { type: 'spring', stiffness: 520, damping: 42 } as const;
const STILL = { duration: 0 } as const;
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

/** What each panel holds, said once under its name. */
const blurbs: Record<Tab, string> = {
  charts: 'Every chart, by the job it does',
  customize: 'What applies to every chart',
  features: 'What charts can do',
  docs: 'Install, API and guides',
};

/** The "li" of the wordmark and its dot, as the rail's mark. */
function LiltMark() {
  return (
    <svg className="lilt-rail__mark" viewBox="20 20 276 356" aria-hidden="true" focusable="false">
      <path
        className="lilt-rail__mark-ink"
        d="M31 65.5A39.5 39.5 0 0 1 110 65.5L110 255C110 278 130 294 148 294C172 294 214 262 214 222L214 184A35.5 35.5 0 0 1 285 184L285 292Q285 302 277 303L268 305C260 306.5 255 309 250 314L236 331C210 358 180 370.5 143 370.5A112 112 0 0 1 31 258.5Z"
      />
      <path
        className="lilt-rail__mark-dot"
        d="M285.3 94A35.3 35.3 0 1 1 214.7 94A35.3 35.3 0 1 1 285.3 94Z"
      />
    </svg>
  );
}

interface RailProps {
  tab: Tab;
  open: boolean;
  /** Choosing the open tab again folds the panel away; any other tab opens it on that tab. */
  onChoose: (tab: Tab) => void;
  onToggle: () => void;
  /** In the drawer the rail sits beside the panel instead of down the frame. */
  mobile?: boolean;
  onNavigate?: () => void;
}

/**
 * The always-dark rail, the frame's full height: the mark, search, the four places to browse, and
 * at its foot the button that folds the panel. The open tab sits on a light disc that glides
 * between tabs.
 */
export function Rail({ tab, open, onChoose, onToggle, mobile = false, onNavigate }: RailProps) {
  const reduced = Boolean(useReducedMotion());
  const id = mobile ? 'mobile' : 'desktop';
  const side = mobile ? 'bottom' : 'right';

  const buttons = (
    <>
      <TooltipHint content="Lilt Charts home" side={side}>
        <Link
          href="/"
          className="lilt-rail__home"
          aria-label="Lilt Charts home"
          onClick={onNavigate}
        >
          <LiltMark />
        </Link>
      </TooltipHint>
      <span className="lilt-rail__divider" aria-hidden="true" />
      {mobile ? null : (
        <>
          <HeaderSearch className="lilt-rail__tab" side="right" />
          <span className="lilt-rail__space" aria-hidden="true" />
        </>
      )}
      <div className="lilt-rail__tabs" role="group" aria-label="Browse">
        {tabs.map((option) => {
          const current = option.value === tab;
          return (
            <TooltipHint
              key={option.value}
              content={current && open && !mobile ? `Hide ${option.label}` : option.label}
              side={side}
            >
              <button
                type="button"
                className="lilt-rail__tab"
                aria-label={option.label}
                aria-pressed={current}
                aria-expanded={current && open}
                aria-controls={`lilt-rail-panel-${id}`}
                onClick={() => onChoose(option.value)}
              >
                {current ? (
                  <motion.span
                    aria-hidden="true"
                    className="lilt-rail__disc"
                    data-folded={!open || undefined}
                    layoutId={`lilt-rail-disc-${id}`}
                    initial={false}
                    transition={reduced ? STILL : SPRING}
                  />
                ) : null}
                <Icon icon={option.icon} aria-hidden="true" size={19} strokeWidth={1.6} />
              </button>
            </TooltipHint>
          );
        })}
      </div>
    </>
  );

  if (mobile)
    return (
      <div className="lilt-rail" data-mobile="">
        {buttons}
      </div>
    );

  return (
    <div className="lilt-rail">
      {buttons}
      <div className="lilt-rail__foot">
        <TooltipHint content={open ? 'Hide panel (Ctrl B)' : 'Show panel (Ctrl B)'} side="right">
          <button
            type="button"
            className="lilt-rail__tab lilt-rail__toggle"
            aria-label={open ? 'Hide panel' : 'Show panel'}
            aria-expanded={open}
            aria-controls={`lilt-rail-panel-${id}`}
            aria-keyshortcuts="Control+B Meta+B"
            onClick={onToggle}
          >
            <Icon icon={SidebarLeftIcon} aria-hidden="true" size={18} strokeWidth={1.6} />
          </button>
        </TooltipHint>
      </div>
    </div>
  );
}

const matches = (route: AppRoute, query: string) =>
  !query ||
  route.label.toLowerCase().includes(query) ||
  route.title.toLowerCase().includes(query) ||
  (route.job?.toLowerCase().includes(query) ?? false);

/**
 * The second panel: the open tab's pages as a list, under the job or section they belong to, with
 * a filter on top. A chart is shown by its own small mark; the current page wears a soft fill that
 * glides from row to row.
 */
export function RailPanel({
  tab,
  activeId,
  open = true,
  mobile = false,
  onNavigate,
}: {
  tab: Tab;
  activeId: string;
  open?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const { settings } = useChartSettings();
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);
  const [query, setQuery] = useState('');
  const activeRef = useRef<HTMLAnchorElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = mobile ? 'mobile' : 'desktop';
  const label = tabs.find((option) => option.value === tab)!.label;
  const needle = query.trim().toLowerCase();

  useEffect(() => setQuery(''), [tab]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId, tab]);

  const groups = useMemo(
    () =>
      groupsByTab[tab]
        .map((group) => ({ ...group, routes: group.routes.filter((r) => matches(r, needle)) }))
        .filter((group) => group.routes.length > 0),
    [tab, needle],
  );

  return (
    <div
      className="lilt-rail-panel"
      id={`lilt-rail-panel-${id}`}
      data-lilt-palette={settings.palette}
      data-mobile={mobile || undefined}
      inert={!open || undefined}
    >
      <div className="lilt-rail-panel__head">
        <motion.div
          key={tab}
          className="lilt-rail-panel__title"
          initial={reduced || !hydrated ? false : { opacity: 0, x: -4, filter: 'blur(3px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2>{label}</h2>
          <p>{blurbs[tab]}</p>
        </motion.div>
        {mobile ? (
          <button
            aria-label="Close navigation"
            className="lilt-rail-panel__close"
            onClick={onNavigate}
            type="button"
          >
            <Icon icon={Cancel01Icon} aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>

      <label className="lilt-rail-panel__filter">
        <Icon icon={Search01Icon} aria-hidden="true" size={15} strokeWidth={1.8} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.stopPropagation();
              setQuery('');
            }
          }}
          placeholder={`Filter ${label.toLowerCase()}`}
          aria-label={`Filter ${label.toLowerCase()}`}
          spellCheck={false}
          autoComplete="off"
        />
      </label>

      <ScrollArea
        className="lilt-rail-panel__scroll"
        contentClassName="lilt-rail-panel__content"
        scrollFade
        viewportProps={{ render: <nav />, role: 'navigation', 'aria-label': `${label} pages` }}
      >
        <motion.div
          key={tab}
          initial={reduced || !hydrated ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {groups.length === 0 ? (
            <div className="lilt-rail-panel__empty">
              <p>
                Nothing in {label} matches “{query.trim()}”.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                Clear filter
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section
                key={group.key}
                className="lilt-rail-panel__group"
                aria-label={group.heading ?? label}
              >
                {group.heading ? (
                  <h3 className="lilt-rail-panel__heading">
                    <span>{group.heading}</span>
                    <span aria-hidden="true">{group.routes.length}</span>
                  </h3>
                ) : null}
                <ul>
                  {group.routes.map((route) => {
                    const current = route.id === activeId;
                    return (
                      <li key={route.id}>
                        <Link
                          href={route.href}
                          className="lilt-rail-panel__item"
                          aria-current={current ? 'page' : undefined}
                          data-active={current || undefined}
                          data-nested={route.parent ? '' : undefined}
                          onClick={onNavigate}
                          ref={current ? activeRef : undefined}
                        >
                          {current ? (
                            <motion.span
                              aria-hidden="true"
                              className="lilt-rail-panel__highlight"
                              layoutId={`lilt-rail-highlight-${id}`}
                              initial={false}
                              transition={reduced ? STILL : SPRING}
                            />
                          ) : null}
                          <span className="lilt-rail-panel__preview">
                            {hasGlyph(route.icon) ? (
                              <ChartGlyph icon={route.icon} />
                            ) : (
                              <Icon
                                icon={icons[route.icon]}
                                aria-hidden="true"
                                size={15}
                                strokeWidth={1.7}
                              />
                            )}
                          </span>
                          <span className="lilt-rail-panel__label">{route.label}</span>
                          {route.badge ? (
                            <span className="lilt-rail-panel__badge">{route.badge}</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </motion.div>
      </ScrollArea>
    </div>
  );
}

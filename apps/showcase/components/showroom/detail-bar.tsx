'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useNavDrawer } from '@/components/shell/nav-drawer-context';
import { tabHref, type Tab } from '@/components/shell/nav-model';

export interface AdjacentLink {
  href: string;
  label: string;
}

const BACK_LABEL: Record<Tab, string> = {
  charts: 'All charts',
  components: 'All components',
  visuals: 'All visuals',
  ascii: 'All ASCII',
};

/**
 * The sticky showroom sub-bar (modeled on marksteyn.dev's `.w-bar`): back to the showroom wall,
 * the active item's title and chip, an on-demand Index drawer button, Previous / Next stepping
 * (including Left / Right arrow keys), and an optional Inspector collapse toggle.
 */
export function DetailBar({
  tab,
  title,
  chip,
  glyph,
  prev,
  next,
  panelOpen,
  onTogglePanel,
}: {
  tab: Tab;
  title: string;
  chip?: string;
  glyph?: ReactNode;
  prev: AdjacentLink | null;
  next: AdjacentLink | null;
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}) {
  const router = useRouter();
  const { openDrawer } = useNavDrawer();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowLeft' && prev) router.push(prev.href);
      if (event.key === 'ArrowRight' && next) router.push(next.href);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev, next, router]);

  return (
    <div className="lilt-detail-bar" role="region" aria-label="Item navigation">
      <div className="lilt-detail-bar__left">
        <Link href={tabHref[tab]} className="lilt-detail-quiet">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span>{BACK_LABEL[tab]}</span>
        </Link>
        <span className="lilt-detail-bar__current">
          {glyph ? <span className="lilt-detail-bar__glyph">{glyph}</span> : null}
          <span className="lilt-detail-bar__name">{title}</span>
          {chip ? <span className="lilt-chip">{chip}</span> : null}
        </span>
      </div>

      <div className="lilt-detail-bar__right">
        <button
          type="button"
          className="lilt-detail-quiet"
          onClick={() => openDrawer(tab)}
          aria-label={`Browse all ${tab}`}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M2.5 4h11M2.5 8h11M2.5 12h7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span>Index</span>
        </button>

        {prev ? (
          <Link href={prev.href} className="lilt-detail-quiet" aria-keyshortcuts="ArrowLeft">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="lilt-detail-bar__step-label">Previous</span>
          </Link>
        ) : (
          <span className="lilt-detail-quiet" aria-disabled="true">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="lilt-detail-bar__step-label">Previous</span>
          </span>
        )}

        {next ? (
          <Link href={next.href} className="lilt-detail-quiet" aria-keyshortcuts="ArrowRight">
            <span className="lilt-detail-bar__step-label">Next: {next.label}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        ) : (
          <span className="lilt-detail-quiet" aria-disabled="true">
            <span className="lilt-detail-bar__step-label">Next</span>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </span>
        )}

        {onTogglePanel ? (
          <button
            type="button"
            className="lilt-detail-quiet lilt-detail-quiet--icon lilt-detail-panel-toggle"
            aria-expanded={panelOpen}
            aria-label={panelOpen ? 'Hide inspector' : 'Show inspector'}
            onClick={onTogglePanel}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <rect
                x="1.7"
                y="2.7"
                width="12.6"
                height="10.6"
                rx="2.3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                className="lilt-detail-toggle-pane"
                x="9.6"
                y="4.6"
                width="2.8"
                height="6.8"
                rx=".8"
                fill="currentColor"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

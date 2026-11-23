'use client';

import * as ascii from '@lilt-ui/registry';
import * as ui from '@lilt-ui/registry/ui';
import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react';
import { ArrowSwap } from '@/components/craft/roll';
import { defaultsOf, type AsciiControl } from '@/lib/ascii-scenes';

type Registry = Record<string, ComponentType<Record<string, unknown>>>;
const registries = {
  ascii: ascii as unknown as Registry,
  components: ui as unknown as Registry,
};

export interface RegistryTileItem {
  id: string;
  href: string;
  title: string;
  shelf: string;
  lede: string;
  component: string;
  demo?: string;
  kind: 'canvas' | 'dom';
  layout: 'fill' | 'center';
  backdrop?: 'night';
  controls: readonly AsciiControl[];
  stage?: { fontSize?: number; fontWeight?: number; fontFamily?: string };
  surfaceProp?: string;
  line: 'ascii' | 'components';
}

/**
 * A live plinth tile for any Component or ASCII registry item. Off-screen tiles stay unmounted
 * until they approach the viewport, and centered DOM pieces scale cleanly to fit their frame.
 */
export function RegistryTile({
  item,
  eager = false,
  index = 0,
}: {
  item: RegistryTileItem;
  eager?: boolean;
  index?: number;
}) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [scale, setScale] = useState<number | null>(null);

  const isPiece = item.line === 'components' || item.kind === 'dom';
  const defaults = useMemo(() => defaultsOf(item.controls), [item.controls]);
  const Comp = registries[item.line][item.demo ?? item.component];

  useEffect(() => {
    if (visible) return;
    const node = frameRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !isPiece) return;
    const outer = frameRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const box = outer.getBoundingClientRect();
      const natW = inner.offsetWidth;
      const natH = inner.offsetHeight;
      if (!box.width || !box.height || !natW || !natH) return;
      const pad = 28;
      const next = Math.min(1, (box.width - pad) / natW, (box.height - pad) / natH);
      setScale(Math.max(0.45, next));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  }, [visible, isPiece]);

  const night = item.backdrop === 'night';
  const stageBg = night ? '#07070a' : 'var(--lilt-stage-paper)';
  const stageColor = night ? '#e8e8ee' : 'var(--lilt-stage-ink)';

  return (
    <Link
      href={item.href}
      className="lilt-plinth lilt-showroom-tile"
      data-rv="media"
      style={{ '--i': index % 4 } as CSSProperties}
    >
      <span
        ref={frameRef}
        className="lilt-media lilt-showroom-tile__media"
        data-backdrop={night ? 'night' : undefined}
        aria-hidden="true"
      >
        <span
          className={[
            'lilt-showroom-tile__stage',
            item.line === 'components' ? 'lilt-showroom-tile__stage--piece' : '',
            item.layout === 'center' && item.line === 'ascii'
              ? 'lilt-showroom-tile__stage--center'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            ...item.stage,
            color: stageColor,
            colorScheme: night ? 'dark' : undefined,
          }}
        >
          {visible && Comp ? (
            isPiece ? (
              <div
                ref={innerRef}
                className="lilt-showroom-tile__scaled"
                data-ready={scale !== null || undefined}
                style={{
                  transform: `translate(-50%, -50%) scale(${scale ?? 1})`,
                }}
              >
                <Comp
                  {...defaults}
                  {...(item.surfaceProp ? { [item.surfaceProp]: stageBg } : {})}
                  style={{ color: stageColor }}
                />
              </div>
            ) : (
              <Comp {...defaults} cellSize={12} interactive={false} style={{ color: stageColor }} />
            )
          ) : null}
        </span>
      </span>

      <span className="lilt-cap">
        <span className="lilt-cap__top">
          <span className="lilt-cap__title">
            <strong>{item.title}</strong>
            <span className="lilt-chip" data-tone="wall">
              {item.shelf}
            </span>
          </span>
          <span className="lilt-cap__end">
            <ArrowSwap />
          </span>
        </span>
        <span className="lilt-cap__desc">{item.lede}</span>
      </span>
    </Link>
  );
}

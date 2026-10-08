import { domAnimation, LazyMotion, type domMax } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';

type LayoutFeatures = typeof domMax;
let layoutFeatures: LayoutFeatures | undefined;
let layoutRequest: Promise<LayoutFeatures> | undefined;

function loadLayoutFeatures(): Promise<LayoutFeatures> {
  layoutRequest ??= import('./motion-layout-features').then((module) => {
    layoutFeatures = module.domMax;
    return module.domMax;
  });
  return layoutRequest;
}

/**
 * Gives `m` elements their animation features. Lilt draws with `m` instead of `motion`, so a
 * chart pays only for the Motion features it uses: value and enter/exit animation everywhere,
 * and, with `layout`, layout animation where something reorders. Layout features load after
 * first paint; until then the scope animates like any other, so nothing waits on them. Wrap
 * every root that renders `m` elements; nesting is cheap.
 */
export function MotionScope({
  children,
  layout = false,
}: {
  children?: ReactNode;
  layout?: boolean;
}) {
  const [loaded, setLoaded] = useState(layoutFeatures);
  useEffect(() => {
    if (!layout || loaded) return;
    let live = true;
    void loadLayoutFeatures().then((features) => {
      if (live) setLoaded(features);
    });
    return () => {
      live = false;
    };
  }, [layout, loaded]);
  return <LazyMotion features={layout && loaded ? loaded : domAnimation}>{children}</LazyMotion>;
}

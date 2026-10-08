'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { HERO_LOOK, type HeroLook, type SceneId } from '@/lib/home-hero';

interface LookState {
  look: HeroLook;
  setLook: (look: HeroLook) => void;
  /** The interaction the reader's chart is showing, which it keeps while it flies. */
  scene: SceneId;
  setScene: (scene: SceneId) => void;
}

const LookContext = createContext<LookState | null>(null);

/**
 * The look the reader settles on in the studio and the interaction they last picked, both carried
 * by the chart through the rest of the page.
 */
export function HomeLookProvider({ children }: { children: ReactNode }) {
  const [look, setLookState] = useState<HeroLook>(HERO_LOOK);
  const [scene, setScene] = useState<SceneId>('sync');
  const value = useMemo<LookState>(
    () => ({
      look,
      // Only a real change re-renders the cards that carry it.
      setLook: (next) =>
        setLookState((current) =>
          current.palette === next.palette &&
          current.barStyle === next.barStyle &&
          current.depth === next.depth &&
          current.surface === next.surface
            ? current
            : next,
        ),
      scene,
      setScene,
    }),
    [look, scene],
  );
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useHomeLook() {
  const state = useContext(LookContext);
  if (!state) throw new Error('useHomeLook needs HomeLookProvider.');
  return state;
}

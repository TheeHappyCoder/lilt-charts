import { createContext, createElement, forwardRef, useContext } from 'react';
import { vi } from 'vitest';
import type * as Motion from 'motion/react';

// An `m` element outside `LazyMotion` renders but never animates, silently. In tests, every `m`
// element throws unless a `LazyMotion` (a `MotionScope`) sits above it, so the suite proves each
// root is wrapped.
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof Motion>();
  const InScope = createContext(false);
  const LazyMotion: typeof actual.LazyMotion = (props) =>
    createElement(InScope.Provider, { value: true }, createElement(actual.LazyMotion, props));
  const guarded = new Map<PropertyKey, unknown>();
  const m = new Proxy(actual.m, {
    get(target, key) {
      if (!guarded.has(key)) {
        const Element = Reflect.get(target, key) as Parameters<typeof createElement>[0];
        const Guarded = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
          if (!useContext(InScope))
            throw new Error(
              `<m.${String(key)}> rendered outside a MotionScope, so it cannot animate`,
            );
          return createElement(Element, { ...props, ref } as Record<string, unknown>);
        });
        Guarded.displayName = `m.${String(key)}`;
        guarded.set(key, Guarded);
      }
      return guarded.get(key);
    },
  });
  return { ...actual, LazyMotion, m };
});

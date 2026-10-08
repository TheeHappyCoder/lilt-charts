import type { ReactNode } from 'react';

/** A quiet chapter label, signed with three bars from Lilt's chart language. */
export function StoryIndex({ children }: { children: ReactNode }) {
  return (
    <p className="lilt-story-index">
      <span className="lilt-story-index__line" aria-hidden="true" />
      <span className="lilt-story-index__mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {children}
    </p>
  );
}

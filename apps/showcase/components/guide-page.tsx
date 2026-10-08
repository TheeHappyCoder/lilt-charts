import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { GuideCode } from '@/components/docs/guide-code';

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Prose stays on the section's rail; everything else is material beside it. */
const PROSE = new Set(['p', 'ul', 'ol', 'h3', 'h4', 'blockquote']);

interface GuideSectionProps {
  /** Leave it out when the page title already names the section, as on an API topic page. */
  title?: string;
  children: ReactNode;
}

/** A section's children with fragments opened, so content kept in a fragment still splits. */
function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

function isProse(child: ReactNode): boolean {
  if (!isValidElement(child)) return true;
  return typeof child.type === 'string' && PROSE.has(child.type);
}

/** Raw `<pre>` snippets become highlighted panels with a badge and a copy button. */
function material(child: ReactNode, index: number): ReactNode {
  if (isValidElement<{ children?: ReactNode; title?: string }>(child) && child.type === 'pre') {
    const source = child.props.children;
    if (typeof source === 'string')
      return <GuideCode key={index} code={source} title={child.props.title} />;
  }
  return child;
}

export function GuideSection({ title, children }: GuideSectionProps): ReactElement {
  const id = title ? slug(title) : undefined;
  const items = flatten(children);
  const prose = items.filter(isProse);
  const rest = items.filter((child) => !isProse(child));
  // With no code to show, the prose itself takes the wide column beside the heading.
  const proseOnly = rest.length === 0;
  // Untitled prose has no heading to sit beside, so it reads as one column.
  if (!title && proseOnly)
    return (
      <section className="lilt-docs__section" data-prose="" data-layout="stack">
        <div className="lilt-docs__section-body">{prose}</div>
      </section>
    );
  return (
    <section
      className="lilt-docs__section"
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      data-prose={proseOnly || undefined}
    >
      <div className="lilt-docs__section-head">
        {title ? <h2 id={`${id}-title`}>{title}</h2> : null}
        {proseOnly ? null : prose}
      </div>
      <div className="lilt-docs__section-body">{proseOnly ? prose : rest.map(material)}</div>
    </section>
  );
}

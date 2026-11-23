import { Fragment, type CSSProperties, type ReactNode } from 'react';

/** A small tabular count in a 20px chip: how many of something there are. */
export function Count({ n, className }: { n: number; className?: string }) {
  return <span className={['lilt-count', className].filter(Boolean).join(' ')}>{n}</span>;
}

/** The small label above a section, with its count beside it when there is one. */
export function Label({
  children,
  count,
  reveal = true,
  as: Tag = 'p',
  id,
}: {
  children: ReactNode;
  count?: number;
  /** Fade in with the section. */
  reveal?: boolean;
  as?: 'p' | 'span' | 'h2' | 'h3';
  id?: string;
}) {
  return (
    <Tag
      className="lilt-label"
      id={id}
      data-rv={reveal ? 'fade' : undefined}
      // "On this page" reads the name without its count.
      data-toc-label={typeof children === 'string' ? children : undefined}
    >
      {children}
      {count === undefined ? null : <Count n={count} />}
    </Tag>
  );
}

/**
 * A heading in two tones: a claim in ink, then a second line in faint grey. Each line rises out of
 * its own mask as the heading comes into view.
 */
export function TwoTone({
  claim,
  dim,
  as: Tag = 'h2',
  id,
  className,
  delay = 0,
}: {
  claim: ReactNode;
  dim?: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  id?: string;
  className?: string;
  /** Steps of the shared reveal stagger before it starts. */
  delay?: number;
}) {
  const lines = dim === undefined ? [claim] : [claim, dim];
  return (
    <Tag
      id={id}
      className={className}
      data-rv="lines"
      style={delay ? ({ '--i': delay } as CSSProperties) : undefined}
    >
      {lines.map((line, index) => (
        <Fragment key={index}>
          {/* Keeps the words apart in the heading's text, where the lines are blocks. */}
          {index > 0 ? ' ' : null}
          <span className="lilt-rise" style={{ '--l': index } as CSSProperties}>
            <span className={index === 1 ? 'lilt-dim' : undefined}>{line}</span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}

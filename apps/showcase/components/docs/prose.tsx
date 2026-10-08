import Link from 'next/link';

/** Renders `backticked` words as inline code and [text](/path) as links within the docs. */
export function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\[[^\]]+\]\(\/[^)]*\))/).map((part, index) => {
        if (part.startsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
        const link = /^\[([^\]]+)\]\((\/[^)]*)\)$/.exec(part);
        return link ? (
          <Link key={index} href={link[2]!}>
            {link[1]}
          </Link>
        ) : (
          part
        );
      })}
    </>
  );
}

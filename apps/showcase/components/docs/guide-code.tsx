import { CardBadge } from '@lilt-ui/charts';
import { CodeBlock } from '@/components/code-block';
import { CopyButton } from '@/components/docs/docs-example';

/** What a snippet is, read from its first lines when the page does not say. */
function languageOf(code: string): string {
  const start = code.trimStart();
  if (/^(npm|pnpm|yarn|bun|npx)\s/.test(start)) return 'Terminal';
  if (/^@(layer|import)\b|^[.:#[\w-]+\s*\{/m.test(start) && !/[<>]/.test(start)) return 'CSS';
  return 'TypeScript';
}

/** A code panel with a glass badge naming it, like a chart page's variant tab. */
export function GuideCode({ code, title }: { code: string; title?: string }) {
  const name = title ?? languageOf(code);
  return (
    <figure className="lilt-guide-code" aria-label={name}>
      <CardBadge className="lilt-variant-badge lilt-guide-code__badge">
        <h3>{name}</h3>
        <CopyButton text={code.trim()} label="Copy code" compact />
      </CardBadge>
      <div className="lilt-guide-code__panel">
        <CodeBlock code={code.trim()} />
      </div>
    </figure>
  );
}

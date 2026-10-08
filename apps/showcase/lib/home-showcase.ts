import type { CardDocContent } from './card-docs/content';
import { isExampleRow, type CardExample, type DocExample } from './card-docs/examples';

export interface ShowcaseCard {
  example: DocExample;
  label: string;
  href: string;
}

/**
 * A family's most distinctive variant, taken from its documentation examples so the home page
 * and the docs never drift. Links land on that variant's section.
 */
export function variant(doc: CardDocContent, href: string, id?: string): ShowcaseCard {
  if (!id) return { example: doc.hero, label: doc.title, href };
  const example = doc.examples.find((item) => item.id === id);
  if (!example) throw new Error(`No "${id}" example in ${doc.title}.`);
  return { example, label: `${doc.title} · ${example.title}`, href: `${href}#${id}` };
}

/** One size for every feature card, so the interactions grid reads as level rows. */
const FEATURE_SIZE = { tiles: false, height: 160 } as const;

/** An example's cards (a row gives several) at the shared feature size, with any overrides. */
export function featureCards(
  example: DocExample,
  overrides: Readonly<Record<string, unknown>> = {},
): CardExample[] {
  const cards = isExampleRow(example) ? example.row : [example];
  return cards.map((card) => ({
    ...card,
    props: { ...card.props, ...FEATURE_SIZE, ...overrides },
  }));
}

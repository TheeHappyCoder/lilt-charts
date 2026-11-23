import { isExampleRow, type CardExample, type DocExample } from './card-docs/examples';

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

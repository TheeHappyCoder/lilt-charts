import { describe, expect, it } from 'vitest';
import { appRoutes, type AppRoute } from './routes';
import {
  cardDocsByRoute,
  documentedCharts,
  llmsFull,
  llmsIndex,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  SITE_URL,
} from './llms';
import { cardComponents, cardModule, exampleSource } from './card-docs/examples';
import { stageExamples } from './card-docs/resolve-example';

describe('agent files', () => {
  it('documents every chart in the sidebar', () => {
    const charts = (appRoutes as readonly AppRoute[]).filter(
      (route) => (route.group === 'Charts' || route.group === 'Finance') && route.navigation,
    );
    for (const route of charts) expect(cardDocsByRoute[route.id], route.id).toBeDefined();
    expect(documentedCharts()).toHaveLength(charts.length);
  });

  it('lists every card, with its page, in the index', () => {
    const index = llmsIndex();
    expect(index).toContain(`npm install ${PACKAGE_NAME}`);
    expect(index).toContain(PACKAGE_VERSION);
    expect(index).toContain(`import '${PACKAGE_NAME}/styles.css';`);
    expect(index).toContain(`](${SITE_URL}/llms-full.txt)`);
    for (const { route, component, doc } of documentedCharts()) {
      expect(index).toContain(`](${SITE_URL}${route.href})`);
      expect(index).toContain(`\`${component}\``);
      for (const form of doc.forms ?? []) {
        expect(index).toContain(`\`${cardComponents[form.kind]}\``);
        expect(index).toContain(`](${SITE_URL}${route.href}#${form.kind}-api)`);
      }
    }
  });

  it('gives every card its import, example, and every documented prop', () => {
    const full = llmsFull();
    for (const { doc, component } of documentedCharts()) {
      expect(full).toContain(`import { ${component} } from '${cardModule(doc.kind)}';`);
      expect(full).toContain(doc.usage);
      for (const row of doc.props)
        expect(full, `${component}.${row.name}`).toContain(`- \`${row.name}\` (`);
      for (const { example } of stageExamples(doc))
        expect(full, `${component}.${example.id}`).toContain(exampleSource(example, 'Example'));
    }
  });

  it('never points agents at the old package name', () => {
    expect(llmsIndex()).not.toContain('@lilt/charts');
    expect(llmsFull()).not.toContain('@lilt/charts');
  });
});

it('keeps embedding controls in every family and both agent references', () => {
  for (const { doc, component } of documentedCharts()) {
    for (const name of ['title', 'header', 'aria-label'])
      expect(
        doc.props.some((prop) => prop.name === name),
        component + '.' + name,
      ).toBe(true);
    const legend = doc.props.find((prop) => prop.name === 'legend');
    if (legend) expect(legend.type, component + '.legend').toContain('false');
  }
  for (const text of [llmsIndex(), llmsFull()]) {
    expect(text).toContain('header={false}');
    expect(text).toContain('legend={false}');
    expect(text).toContain('aria-label');
    expect(text).toContain('Escape');
  }
});

it('groups the index by job so an agent can match a request to a card', () => {
  const index = llmsIndex();
  for (const job of [
    'Trends',
    'Comparison',
    'Part of a whole',
    'KPIs',
    'Patterns',
    'Cool',
    'Finance',
  ])
    expect(index).toContain(`### ${job}: `);
  for (const { route } of documentedCharts()) {
    const heading = index.lastIndexOf('### ', index.indexOf(`](${SITE_URL}${route.href})`));
    expect(index.slice(heading), route.id).toMatch(new RegExp(`^### ${route.job ?? route.group}`));
  }
});

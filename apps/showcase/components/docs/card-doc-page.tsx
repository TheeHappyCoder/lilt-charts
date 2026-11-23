import Link from 'next/link';
import { Label } from '@/components/craft/label';
import { ChartStage, ChartStageProvider, type StageItem } from '@/components/docs/chart-stage';
import { DocsSnippet } from '@/components/docs/docs-example';
import { InstallCommand } from '@/components/docs/install-command';
import { Prose } from '@/components/docs/prose';
import { DetailBar } from '@/components/showroom/detail-bar';
import { DetailPager } from '@/components/showroom/detail-next';
import { catalogCode } from '@/components/shell/catalog-code';
import { ChartGlyph, hasGlyph } from '@/components/shell/chart-glyph';
import { adjacentRoutes } from '@/components/shell/nav-model';
import type { CardDocContent } from '@/lib/card-docs/content';
import { cardComponents, cardModule } from '@/lib/card-docs/examples';
import { chartDocs } from '@/lib/card-docs/registry';
import { stageExamples } from '@/lib/card-docs/resolve-example';
import { tuneControls } from '@/lib/card-docs/tune';
import { appRoutes, type AppRoute } from '@/lib/routes';

/**
 * The showroom detail page every chart and finance family shares: sticky sub-bar, spacious
 * display intro with specs, full-width plinth stage, editorial 2-column bands, and adjacent cards.
 */
export function CardDocPage({ doc }: { doc: CardDocContent }) {
  const component = cardComponents[doc.kind];
  const props = doc.props;
  const supportedProps = props.map((prop) => prop.name);
  const heroName = doc.heroFile.replace(/\.tsx$/, '');
  // The default card first, then the situations it handles, each in the look chosen for it.
  const items: readonly StageItem[] = stageExamples(doc).map(({ example, change }, index) => {
    const form = doc.forms?.find((candidate) => candidate.kind === example.kind);
    return {
      id: example.id,
      title: index === 0 ? 'Default' : example.title,
      description: index === 0 ? doc.lede : example.description,
      example,
      change,
      supportedProps: form?.props.map((prop) => prop.name),
      tune: form ? tuneControls(form.kind, form.props) : undefined,
    };
  });
  const tune = tuneControls(doc.kind, props);
  const importLine = `import { ${component} } from '${cardModule(doc.kind)}';`;
  const href = Object.keys(chartDocs).find((key) => chartDocs[key]!.kind === doc.kind);
  const code = href ? catalogCode(href) : null;
  const route = href
    ? (appRoutes as readonly AppRoute[]).find((candidate) => candidate.href === href)
    : undefined;
  const groupChip = route?.job ?? route?.group;
  const glyph = route && hasGlyph(route.icon) ? <ChartGlyph icon={route.icon} /> : undefined;
  const { prev, next } = href ? adjacentRoutes('charts', href) : { prev: null, next: null };

  return (
    <ChartStageProvider items={items} name={heroName} supportedProps={supportedProps}>
      <article className="lilt-showroom" data-carousel="">
        <DetailBar
          tab="charts"
          title={doc.title}
          chip={groupChip}
          glyph={glyph}
          prev={prev ? { href: prev.href, label: prev.label } : null}
          next={next ? { href: next.href, label: next.label } : null}
        />

        <header className="lilt-detail-intro">
          <div className="lilt-detail-intro__copy">
            <Label reveal={false}>
              {groupChip ?? 'Chart'}
              {code ? <span className="lilt-chip">{code}</span> : null}
            </Label>
            <h1>{doc.title}</h1>
            <p>{doc.lede}</p>
          </div>
          {code ? (
            <dl className="lilt-docs__spec">
              <div>
                <dt>Part</dt>
                <dd data-tone="brand">{code}</dd>
              </div>
              <div>
                <dt>Component</dt>
                <dd>{component}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>{cardModule(doc.kind)}</dd>
              </div>
            </dl>
          ) : null}
        </header>

        <section className="lilt-detail-stage" id="overview" aria-label={`${doc.title} preview`}>
          <ChartStage
            tune={tune}
            label={doc.title}
            importLine={importLine}
            filename={doc.heroFile}
          />
        </section>

        <div className="lilt-detail-body">
          <section
            className="lilt-detail-band"
            aria-labelledby="installation-title"
            id="installation"
          >
            <div className="lilt-detail-band__head">
              <Label reveal={false}>Installation</Label>
              <h2 id="installation-title">One package, one sheet.</h2>
              <p>
                Add the package, then import the component and the stylesheet once. See{' '}
                <Link href="/guides/installation">Getting started</Link> for theming.
              </p>
            </div>
            <div className="lilt-detail-band__content">
              <InstallCommand />
              <DocsSnippet
                code={`import { ${component} } from '${cardModule(doc.kind)}';\nimport '@lilt-ui/charts/styles.css';`}
              />
            </div>
          </section>

          <section className="lilt-detail-band" aria-labelledby="usage-title" id="usage">
            <div className="lilt-detail-band__head">
              <Label reveal={false}>Usage</Label>
              <h2 id="usage-title">The default card.</h2>
              <p>The default card above, as you would write it.</p>
            </div>
            <div className="lilt-detail-band__content">
              <DocsSnippet code={doc.usage} />
              <div className="lilt-detail-prose-card">
                <p>
                  Omit <code>title</code> to leave out the visible title. Set{' '}
                  <code>{'header={false}'}</code> to remove the whole header, and use{' '}
                  <code>aria-label</code> to name a chart inside your own card.
                  {supportedProps.includes('legend') ? (
                    <>
                      {' '}
                      <code>{'legend={false}'}</code> removes the legend independently.
                    </>
                  ) : null}{' '}
                  <code>surface=&quot;ghost&quot;</code> controls only the visual frame. See{' '}
                  <Link href="/guides/api/cards">Card composition</Link>.
                </p>
              </div>
            </div>
          </section>

          <section className="lilt-detail-band" aria-labelledby="data-title" id="data">
            <div className="lilt-detail-band__head">
              <Label reveal={false}>Data</Label>
              <h2 id="data-title">The shape it reads.</h2>
              <p>
                <Prose text={doc.dataNote} />
              </p>
            </div>
            <div className="lilt-detail-band__content">
              <DocsSnippet code={doc.dataShape} />
              {doc.rangesUsage ? (
                <>
                  <p>
                    For a working period select, pass <code>ranges</code>. Each range brings its own
                    data and delta.
                  </p>
                  <DocsSnippet code={doc.rangesUsage} />
                </>
              ) : null}
            </div>
          </section>

          {doc.forms?.map((form) => (
            <section
              key={form.kind}
              className="lilt-detail-band"
              id={`${form.kind}-api`}
              aria-labelledby={`${form.kind}-api-title`}
            >
              <div className="lilt-detail-band__head">
                <Label count={form.props.length} reveal={false}>
                  Companion form
                </Label>
                <h2 id={`${form.kind}-api-title`}>{form.title}</h2>
                <p>{form.description}</p>
              </div>
              <div className="lilt-detail-band__content">
                <DocsSnippet
                  code={`import { ${cardComponents[form.kind]} } from '${cardModule(form.kind)}';\n\n${form.usage}`}
                />
                <div className="lilt-docs__table">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Prop</th>
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.props.map((prop) => (
                        <tr key={prop.name}>
                          <th scope="row">
                            <code>{prop.name}</code>
                          </th>
                          <td>
                            <code>{prop.type}</code>
                          </td>
                          <td>{prop.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}

          <section className="lilt-detail-band" aria-labelledby="props-title" id="props">
            <div className="lilt-detail-band__head">
              <Label count={props.length} reveal={false}>
                Props
              </Label>
              <h2 id="props-title">Every prop.</h2>
              <p>
                Every prop <code>{component}</code> accepts, in the order you are likely to reach
                for them.
              </p>
            </div>
            <div className="lilt-detail-band__content">
              <div className="lilt-docs__table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Prop</th>
                      <th scope="col">Type</th>
                      <th scope="col">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.map((prop) => (
                      <tr key={prop.name}>
                        <th scope="row">
                          <code>{prop.name}</code>
                        </th>
                        <td>
                          <code>{prop.type}</code>
                        </td>
                        <td>{prop.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <DetailPager
          prev={prev ? { href: prev.href, label: prev.label } : null}
          next={next ? { href: next.href, label: next.label } : null}
          noun="chart"
        />
      </article>
    </ChartStageProvider>
  );
}

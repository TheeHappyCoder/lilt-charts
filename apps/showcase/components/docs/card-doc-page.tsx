import Link from 'next/link';
import { DocsSnippet } from '@/components/docs/docs-example';
import { ChartStage, ChartStageProvider, type StageItem } from '@/components/docs/chart-stage';
import { PageHeader } from '@/components/docs/page-header';
import { Prose } from '@/components/docs/prose';
import type { CardDocContent } from '@/lib/card-docs/content';
import { tuneControls } from '@/lib/card-docs/tune';
import { stageExamples } from '@/lib/card-docs/resolve-example';
import { cardComponents, cardModule } from '@/lib/card-docs/examples';

/** The documentation page every card family shares, so all of them read the same way. */
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
  const content = (
    <>
      {/* Chart pages keep the import with the rest of the stage's actions, in its tab. */}
      <PageHeader title={doc.title} />

      <section className="lilt-docs__hero" id="overview" aria-label={`${doc.title} preview`}>
        <ChartStage tune={tune} label={doc.title} importLine={importLine} filename={doc.heroFile} />
      </section>

      <section className="lilt-docs__section" aria-labelledby="usage-title" id="usage">
        <div className="lilt-docs__section-head">
          <h2 id="usage-title">Usage</h2>
          <p>
            Import the component and the stylesheet once. See{' '}
            <Link href="/guides/installation">Getting started</Link> to install the package.
          </p>
        </div>
        <div className="lilt-docs__section-body">
          <DocsSnippet
            code={`import { ${component} } from '${cardModule(doc.kind)}';\nimport '@lilt-ui/charts/styles.css';`}
          />
          <DocsSnippet code={doc.usage} />
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
            <code>surface="ghost"</code> controls only the visual frame. See{' '}
            <Link href="/guides/api/cards">Card composition</Link>.
          </p>
        </div>
      </section>

      <section className="lilt-docs__section" aria-labelledby="data-title" id="data">
        <div className="lilt-docs__section-head">
          <h2 id="data-title">Data</h2>
          <p>
            <Prose text={doc.dataNote} />
          </p>
        </div>
        <div className="lilt-docs__section-body">
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
          className="lilt-docs__section"
          data-layout="stack"
          id={`${form.kind}-api`}
          aria-label={`${form.title} API`}
        >
          <div className="lilt-docs__section-head">
            <h2>{form.title}</h2>
            <p>{form.description}</p>
          </div>
          <div className="lilt-docs__section-body">
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

      <section
        className="lilt-docs__section"
        data-layout="stack"
        aria-labelledby="props-title"
        id="props"
      >
        <div className="lilt-docs__section-head">
          <h2 id="props-title">Props</h2>
          <p>
            Every prop <code>{component}</code> accepts, in the order you are likely to reach for
            them.
          </p>
        </div>
        <div className="lilt-docs__section-body">
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
    </>
  );
  // The carousel gives the chart the full content width.
  return (
    <ChartStageProvider items={items} name={heroName} supportedProps={supportedProps}>
      <article className="lilt-main lilt-docs" data-carousel="">
        <div className="lilt-docs__main">{content}</div>
      </article>
    </ChartStageProvider>
  );
}

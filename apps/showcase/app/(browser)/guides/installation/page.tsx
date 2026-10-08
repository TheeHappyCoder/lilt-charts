import type { Metadata } from 'next';
import { DocsSnippet } from '@/components/docs/docs-example';
import { GuideCode } from '@/components/docs/guide-code';
import { InstallCommand } from '@/components/docs/install-command';
import { PageHeader } from '@/components/docs/page-header';
import { FrameworkTabs } from '@/components/guides/framework-tabs';
import { GuideNext, GuideStep, GuideSteps } from '@/components/guides/guide-steps';
import { areaDoc } from '@/lib/card-docs/area';
import { exampleSource } from '@/lib/card-docs/examples';
import { PACKAGE_NAME, SITE_URL } from '@/lib/llms';

export const metadata: Metadata = { title: 'Getting started' };

const nextPage = `import { VisitorsCard } from './visitors-card';

export default function Page() {
  return <main style={{ maxWidth: 640, margin: '48px auto', padding: 16 }}><VisitorsCard /></main>;
}`;

const plainReact = `import { createRoot } from 'react-dom/client';
import { VisitorsCard } from './visitors-card';

createRoot(document.getElementById('root')!).render(<VisitorsCard />);`;

const agentPrompt = `Use Lilt Charts (${PACKAGE_NAME}) for charts.
Read ${SITE_URL}/llms.txt first and follow its rules.`;

export default function InstallationGuidePage() {
  return (
    <article className="lilt-main lilt-docs lilt-learn lilt-start">
      <PageHeader
        title="Getting started"
        lede="Install the package, add its stylesheet once, and drop in a card. Works in Next.js and any React 19 app."
      />
      <GuideSteps>
        <GuideStep title="Install">
          <InstallCommand />
          <p>
            Lilt needs React and React DOM 19. Check both versions in your app before installing.
          </p>
        </GuideStep>
        <GuideStep title="Add the styles">
          <DocsSnippet code="import '@lilt-ui/charts/styles.css';" />
          <p>
            Import it once, in your root layout or app entry. Every card reads from the same
            stylesheet.
          </p>
        </GuideStep>
        <GuideStep title="Your first card">
          <p>
            Save this component as <code>visitors-card.tsx</code>. It is complete: rows, the card,
            and the stylesheet import. Cards are client components, and the directive is harmless
            outside Next.js.
          </p>
          <GuideCode title="visitors-card.tsx" code={exampleSource(areaDoc.hero, 'VisitorsCard')} />
        </GuideStep>
        <GuideStep title="Render it">
          <p>
            In the Next.js App Router, render it from any Server Component page. In any other React
            app, mount it from your entry.
          </p>
          <FrameworkTabs
            options={[
              { id: 'next', label: 'Next.js', file: 'app/page.tsx', code: nextPage },
              { id: 'react', label: 'Plain React', file: 'main.tsx', code: plainReact },
            ]}
          />
          <p>
            Every chart page has a Code tab with a complete component like this one. Import
            <code> @lilt-ui/charts/styles.css</code> once, in your app or in the component.
          </p>
        </GuideStep>
        <GuideStep title="Match your theme">
          <p>
            Cards read shadcn-style theme variables when your app defines them: <code>--card</code>,{' '}
            <code>--card-foreground</code>, <code>--muted-foreground</code>, <code>--border</code>,{' '}
            <code>--ring</code>, and <code>--chart-1</code> to <code>--chart-5</code>. Anything you
            leave out falls back to Lilt&apos;s own values, and a <code>palette</code> prop still
            picks a fixed color set.
          </p>
          <p>
            Every Lilt style sits in the <code>lilt</code> cascade layer, so your own CSS overrides
            it without specificity tricks. With Tailwind, declare the layer order once at the top of
            your global stylesheet, so Lilt beats Tailwind&apos;s resets and your utility classes
            beat Lilt:
          </p>
          <GuideCode
            title="globals.css"
            code={`@layer theme, base, lilt, components, utilities;
@import 'tailwindcss';`}
          />
        </GuideStep>
        <GuideStep title="Hand it to your agent">
          <p>
            Working with Claude Code, Cursor or another coding agent? Paste this, then ask for the
            chart you want. <code>llms.txt</code> lists every card by job with its rules, and{' '}
            <code>llms-full.txt</code> adds every example, data shape and prop.
          </p>
          <DocsSnippet code={agentPrompt} />
        </GuideStep>
      </GuideSteps>
      <GuideNext
        links={[
          {
            href: '/charts/area',
            title: 'Browse the charts',
            description: 'Every family with its variants, props and copyable code.',
          },
          {
            href: '/customize/colors',
            title: 'Customize',
            description: 'Colors, surfaces, axes, legends and hover across every chart.',
          },
          {
            href: '/guides/api',
            title: 'API reference',
            description: 'Compose your own charts from the model, plot and marks.',
          },
        ]}
      />
    </article>
  );
}

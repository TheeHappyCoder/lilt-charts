import type { Metadata } from 'next';
import { ApiIndex } from '@/components/api/api-index';
import { apiLimits } from '@/components/api/api-topic-content';
import { PageHeader } from '@/components/docs/page-header';

export const metadata: Metadata = { title: 'API reference' };

export default function ApiReferencePage() {
  return (
    <article className="lilt-main lilt-docs lilt-learn lilt-api-page">
      <PageHeader
        title="API reference"
        lede="Chart composition, analytical layouts and shared interactions. Find a topic by name or by the export you are using."
      />
      <ApiIndex />
      <section className="lilt-api__limits" aria-labelledby="api-limits">
        <h2 id="api-limits">Current limits</h2>
        {apiLimits}
      </section>
    </article>
  );
}

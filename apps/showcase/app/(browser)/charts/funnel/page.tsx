import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { funnelDoc } from '@/lib/card-docs/funnel';

export const metadata: Metadata = { title: 'Funnel chart' };

export default function FunnelChartPage() {
  return <CardDocPage doc={funnelDoc} />;
}

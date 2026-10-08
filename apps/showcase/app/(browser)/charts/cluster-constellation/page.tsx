import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { clusterConstellationDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Cluster constellation' };
export default function ClusterConstellationPage() {
  return <CardDocPage doc={clusterConstellationDoc} />;
}

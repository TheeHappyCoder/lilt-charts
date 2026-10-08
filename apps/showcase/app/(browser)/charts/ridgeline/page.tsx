import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { ridgelineDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Ridgeline' };

export default function RidgelinePage() {
  return <CardDocPage doc={ridgelineDoc} />;
}

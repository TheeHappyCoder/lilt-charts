import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { arcBridgesDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Arc bridges' };

export default function ArcBridgesPage() {
  return <CardDocPage doc={arcBridgesDoc} />;
}

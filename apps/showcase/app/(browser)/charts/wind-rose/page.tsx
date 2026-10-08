import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { windRoseDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Wind rose' };
export default function WindRosePage() {
  return <CardDocPage doc={windRoseDoc} />;
}

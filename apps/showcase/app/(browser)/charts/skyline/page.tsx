import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { skylineDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Skyline' };

export default function SkylinePage() {
  return <CardDocPage doc={skylineDoc} />;
}

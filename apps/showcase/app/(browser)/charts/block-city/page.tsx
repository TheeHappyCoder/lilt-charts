import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { blockCityDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Block city' };

export default function BlockCityPage() {
  return <CardDocPage doc={blockCityDoc} />;
}

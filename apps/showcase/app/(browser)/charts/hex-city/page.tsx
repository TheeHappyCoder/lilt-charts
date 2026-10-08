import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { hexCityDoc } from '@/lib/card-docs/cool';

export const metadata: Metadata = { title: 'Hex city' };

export default function HexCityPage() {
  return <CardDocPage doc={hexCityDoc} />;
}

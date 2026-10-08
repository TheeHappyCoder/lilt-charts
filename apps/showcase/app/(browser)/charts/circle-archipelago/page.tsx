import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { circleArchipelagoDoc } from '@/lib/card-docs/spatial';
export const metadata: Metadata = { title: 'Circle archipelago' };
export default function CircleArchipelagoPage() {
  return <CardDocPage doc={circleArchipelagoDoc} />;
}

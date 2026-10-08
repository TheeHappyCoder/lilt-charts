import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { eventHelixDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Event helix' };

export default function EventHelixPage() {
  return <CardDocPage doc={eventHelixDoc} />;
}

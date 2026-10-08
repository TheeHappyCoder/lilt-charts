import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { chordLoomDoc } from '@/lib/card-docs/sculpted';

export const metadata: Metadata = { title: 'Chord loom' };

export default function ChordLoomPage() {
  return <CardDocPage doc={chordLoomDoc} />;
}

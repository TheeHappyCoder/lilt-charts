import type { Metadata } from 'next';
import { CardDocPage } from '@/components/docs/card-doc-page';
import { volumeProfileDoc } from '@/lib/card-docs/volume-profile';

export const metadata: Metadata = { title: 'Volume profile' };

export default function VolumeProfilePage() {
  return <CardDocPage doc={volumeProfileDoc} />;
}

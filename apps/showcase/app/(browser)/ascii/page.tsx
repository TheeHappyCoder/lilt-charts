import type { Metadata } from 'next';
import { AsciiShowroom } from '@/components/showroom/ascii-showroom';

export const metadata: Metadata = {
  title: 'ASCII',
  description: 'Living scenes, text effects, data and interface pieces drawn in type.',
};

/** Every ASCII scene and piece, live on plinths, grouped by shelf. */
export default function AsciiPage() {
  return <AsciiShowroom />;
}

import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { CompareLab } from '@/components/features/feature-labs';

export const metadata: Metadata = { title: 'Compare · Features' };

export default function Page() {
  return (
    <LabShell title="Compare" lede="What changed between two points.">
      <CompareLab />
    </LabShell>
  );
}

import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { PinLab } from '@/components/features/feature-labs';

export const metadata: Metadata = { title: 'Pin · Features' };

export default function Page() {
  return (
    <LabShell title="Pin" lede="Hold a point while you read.">
      <PinLab />
    </LabShell>
  );
}

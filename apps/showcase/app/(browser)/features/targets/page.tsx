import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { TargetsLab } from '@/components/features/feature-labs';

export const metadata: Metadata = { title: 'Targets and forecasts · Features' };

export default function Page() {
  return (
    <LabShell title="Targets & forecasts" lede="Goals to reach, and days still to come.">
      <TargetsLab />
    </LabShell>
  );
}

import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { BackgroundsLab } from '@/components/lab/labs';

export const metadata: Metadata = { title: 'Backgrounds · Customize' };

export default function Page() {
  return (
    <LabShell title="Backgrounds" lede="Texture behind the marks, never behind the numbers.">
      <BackgroundsLab />
    </LabShell>
  );
}

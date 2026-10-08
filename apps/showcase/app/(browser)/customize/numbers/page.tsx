import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { NumbersLab } from '@/components/lab/numbers-lab';

export const metadata: Metadata = { title: 'Numbers · Customize' };

export default function Page() {
  return (
    <LabShell title="Numbers" lede="How headlines move when their value changes.">
      <NumbersLab />
    </LabShell>
  );
}

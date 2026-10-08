import type { Metadata } from 'next';
import { LabShell } from '@/components/lab/lab-studio';
import { ThreeDLab } from '@/components/lab/three-d-lab';

export const metadata: Metadata = { title: '3D · Customize' };

export default function Page() {
  return (
    <LabShell title="3D" lede="One prop. Real depth. Exact values.">
      <ThreeDLab />
    </LabShell>
  );
}

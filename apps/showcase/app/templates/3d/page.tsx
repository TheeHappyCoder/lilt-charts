import type { Metadata } from 'next';
import { ThreeDTemplate } from '@/components/templates/three-d-template';
import './three-d.css';

/** Unlisted for now: no sidebar entry, no search result, and kept out of search engines. */
export const metadata: Metadata = {
  title: '3D template',
  robots: { index: false, follow: false },
};

export default function ThreeDTemplatePage() {
  return <ThreeDTemplate />;
}

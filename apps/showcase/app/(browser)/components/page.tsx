import { redirect } from 'next/navigation';
import { componentDocs, componentPath } from '@/lib/component-docs';

/** The Components section opens on its first component. */
export default function ComponentsIndex() {
  redirect(componentPath(componentDocs[0]!));
}

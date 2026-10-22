import { redirect } from 'next/navigation';

/** The Components section opens on its first component. */
export default function ComponentsIndex() {
  redirect('/components/loader');
}

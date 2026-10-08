import { redirect } from 'next/navigation';

/** The charts section opens on its first chart. */
export default function ChartsPage() {
  redirect('/charts/area');
}

import { redirect } from 'next/navigation';

/** The features section opens on its first page. */
export default function FeaturesPage() {
  redirect('/features/sync');
}

import { redirect } from 'next/navigation';

/** The ASCII section opens on its first scene. */
export default function AsciiPage() {
  redirect('/ascii/glow');
}

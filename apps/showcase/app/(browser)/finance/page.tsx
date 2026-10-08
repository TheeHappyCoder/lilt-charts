import { redirect } from 'next/navigation';

/** The finance section opens on its first chart. */
export default function FinancePage() {
  redirect('/finance/candlestick');
}

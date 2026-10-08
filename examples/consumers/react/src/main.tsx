import { createRoot } from 'react-dom/client';
import { DailyRevenue } from './daily-revenue';
import { CompactMetric } from './compact-metric';

createRoot(document.getElementById('root')!).render(
  <main
    style={{
      maxWidth: 800,
      margin: '48px auto',
      padding: 16,
      display: 'grid',
      gap: 24,
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <DailyRevenue />
    <CompactMetric />
  </main>,
);

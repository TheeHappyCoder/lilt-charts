/** Deterministic, illustrative data shared verbatim by previews and generated examples. */
export const channelMix = Array.from({ length: 13 }, (_, i) => ({
  week: `W${i + 1}`,
  organic: Math.round(80 + 30 * Math.sin(i * 0.45) + i * 3),
  referral: Math.round(45 + 22 * Math.cos(i * 0.6)),
  paid: Math.round(25 + i * 5 + 18 * Math.sin(i * 0.8)),
  direct: Math.round(35 + 12 * Math.cos(i * 0.4)),
}));
export const sentimentResponses = [
  { team: 'Product', disagree: 14, unsure: 10, agree: 42, strongly: 34 },
  { team: 'Design', disagree: 8, unsure: 16, agree: 48, strongly: 28 },
  { team: 'Growth', disagree: 24, unsure: 18, agree: 36, strongly: 22 },
  { team: 'Support', disagree: 12, unsure: 14, agree: 32, strongly: 42 },
  { team: 'Ops', disagree: 20, unsure: 12, agree: 44, strongly: 24 },
];
export const audienceAge = [
  { age: '18–24', current: 1240, previous: 980 },
  { age: '25–34', current: 2860, previous: 2480 },
  { age: '35–44', current: 2180, previous: 2340 },
  { age: '45–54', current: 1560, previous: 1820 },
  { age: '55–64', current: 980, previous: 1240 },
  { age: '65+', current: 640, previous: 820 },
];
export const cohortConversion = [
  { stage: 'Visit', experiment: 12000, control: 11800 },
  { stage: 'Explore', experiment: 8400, control: 7900 },
  { stage: 'Trial', experiment: 4800, control: 3900 },
  { stage: 'Activate', experiment: 3200, control: 2400 },
  { stage: 'Subscribe', experiment: 2100, control: 1450 },
];
export const expenseHierarchy = [
  { path: 'Product/Engineering', spend: 48000 },
  { path: 'Product/Design', spend: 23000 },
  { path: 'Growth/Acquisition', spend: 32000 },
  { path: 'Growth/Content', spend: 14000 },
  { path: 'Operations/Support', spend: 21000 },
  { path: 'Operations/Infrastructure', spend: 28000 },
];
export const quarterlyPace = [
  { day: 0, actual: 0, expected: 0 },
  { day: 15, actual: 12000, expected: 9000 },
  { day: 30, actual: 24500, expected: 22000 },
  { day: 45, actual: 41000, expected: 36000 },
  { day: 60, actual: 56000, expected: 55000 },
  { day: 75, actual: null, expected: 77000 },
  { day: 90, actual: null, expected: 100000 },
];
export const releaseCheckpoints = [
  { name: 'Scope', position: 0 },
  { name: 'Design', position: 25 },
  { name: 'Build', position: 55 },
  { name: 'QA', position: 80 },
  { name: 'Launch', position: 100 },
];
export const deliverySamples = ['Standard', 'Express', 'Local'].flatMap((carrier, c) =>
  Array.from({ length: 28 }, (_, i) => ({
    parcel: `${carrier} ${i + 1}`,
    carrier,
    hours: Math.round(
      (c === 0 ? 40 : c === 1 ? 22 : 12) + Math.sin(i * 2.399) * (c === 0 ? 12 : 5) + (i % 5) * 1.7,
    ),
  })),
);
export const campaignMetrics = Array.from({ length: 30 }, (_, i) => ({
  spend: 1200 + i * 120 + Math.sin(i) * 400,
  visits: 850 + i * 75 + Math.cos(i * 0.5) * 240,
  orders: 50 + i * 5 + Math.sin(i * 1.8) * 22,
  churn: 12 - i * 0.18 + Math.cos(i * 0.9) * 2,
  latency: 100 + Math.sin(i * 2.1) * 40,
}));
export const marketTrails = ['North', 'South', 'West'].flatMap((market, m) =>
  Array.from({ length: 7 }, (_, quarter) => ({
    market,
    quarter,
    reading: `${market} · Q${quarter + 1}`,
    reach: 20 + m * 14 + quarter * 5 + Math.sin(quarter + m) * 4,
    retention: 35 + m * 8 + quarter * 3 + Math.cos(quarter * 0.8 + m) * 6,
  })),
);
export const indexedGrowth = Array.from({ length: 10 }, (_, i) => ({
  month: `M${i + 1}`,
  subscribers: Math.round(1200 * (1 + i * 0.065 + Math.sin(i) * 0.03)),
  revenue: Math.round(28000 * (1 + i * 0.09 + Math.sin(i * 0.5) * 0.05)),
}));
export const forecastEnvelopes = Array.from({ length: 12 }, (_, i) => {
  const value = Math.round(120 + i * 8 + Math.sin(i * 0.8) * 8);
  const spread = Math.max(0, i - 6) * 7;
  return {
    month: `M${i + 1}`,
    revenue: value,
    low95: i < 7 ? null : value - spread,
    high95: i < 7 ? null : value + spread,
    low80: i < 7 ? null : value - spread * 0.6,
    high80: i < 7 ? null : value + spread * 0.6,
  };
});

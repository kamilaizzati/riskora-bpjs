// Count each claim once per category, grouped by its service month. The
// window follows the latest service month in the loaded backend dataset.
export function buildAnomalyTrend(claims, categories) {
  const dated = claims.flatMap((claim) => {
    const match = String(claim.serviceDate || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (!match) return [];
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return [];
    return [{ claim, month: year * 12 + month - 1 }];
  });
  if (!dated.length) return [];
  const latest = Math.max(...dated.map((item) => item.month));
  const formatter = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const rows = Array.from({ length: 6 }, (_, index) => {
    const month = latest - 5 + index;
    return { month, label: formatter.format(new Date(Date.UTC(Math.floor(month / 12), month % 12, 1))),
      ...Object.fromEntries(categories.map((category) => [category, 0])) };
  });
  const seen = new Set();
  for (const { claim, month } of dated) {
    const row = rows[month - (latest - 5)];
    if (!row) continue;
    for (const category of new Set(claim.anomalyTypes || [])) {
      if (!categories.includes(category)) continue;
      const key = `${claim.id || claim.claimId || claim.sepNumber}:${month}:${category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      row[category]++;
    }
  }
  return rows;
}

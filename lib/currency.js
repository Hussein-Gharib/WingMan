// Formatting helpers for WingMan's dual-currency pricing (USD + L.L).
// Each returns null when the value is missing, so callers can cleanly skip a
// currency that is not set without leaving empty markup.

export function formatUSD(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `$${n.toFixed(2)}`;
}

export function formatLBP(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${Math.round(n).toLocaleString('en-US')} L.L`;
}

// Convenience: returns an array of the formatted prices that exist, e.g.
// ['$8.00', '600 L.L'] or ['600 L.L'] or [].
export function formatPrices({ price_usd, price_lbp } = {}) {
  return [formatUSD(price_usd), formatLBP(price_lbp)].filter(Boolean);
}

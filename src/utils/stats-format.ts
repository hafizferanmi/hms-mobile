// Shared by every screen under src/app/stats/ — the mockups abbreviate
// large totals ("NGN 3.42M", "720K") far more than any other money display
// in this app (elsewhere it's always the full "NGN 40,000" — see e.g.
// room-types.tsx/reservation/[id].tsx's own formatNaira), so this is its
// own helper rather than reusing/extending those.
export function formatNairaCompact(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `NGN ${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `NGN ${Math.round(amount / 1_000)}K`;
  return `NGN ${Math.round(amount)}`;
}

// Same scaling, no "NGN " prefix — for the donut center label ("3.42M").
export function formatCompactNumber(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return `${Math.round(amount)}`;
}

export function formatNaira(amount: number) {
  return `NGN ${Math.round(amount).toLocaleString('en-US')}`;
}

// Quantity formatting for recipe display.

const FRACTIONS = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']];

export function formatNumber(q) {
  if (q == null || Number.isNaN(q)) return '';
  const whole = Math.floor(q + 1e-9);
  const frac = q - whole;
  let best = null;
  for (const [v, s] of FRACTIONS) if (Math.abs(frac - v) < 0.045) best = s;
  if (Math.abs(frac - 1) < 0.045) return String(whole + 1);
  if (best !== null) return whole === 0 && best ? best : `${whole}${best}`;
  return (Math.round(q * 10) / 10).toString();
}

const UNIT_LABELS = {
  cup: ['cup', 'cups'], tbsp: ['tbsp', 'tbsp'], tsp: ['tsp', 'tsp'], clove: ['clove', 'cloves'],
  slice: ['slice', 'slices'], pinch: ['pinch', 'pinches'], block: ['block', 'blocks'], can: ['can', 'cans'],
  fillet: ['fillet', 'fillets'], oz: ['oz', 'oz'], half: ['half', 'halves'], g: ['g', 'g'], kg: ['kg', 'kg'], ml: ['ml', 'ml'],
  whole: ['', ''],
};

export function formatQty(qty, unit) {
  const n = formatNumber(qty);
  if (unit === 'g' || unit === 'ml') return `${Math.round(qty)} ${unit}`;
  if (unit === 'kg') return `${(Math.round(qty * 100) / 100)} kg`;
  const [one, many] = UNIT_LABELS[unit] ?? [unit, unit];
  const word = qty > 1 + 1e-9 ? many : one;
  return word ? `${n} ${word}` : n;
}

export const UNIT_FAMILY = {
  g: ['mass', 1], kg: ['mass', 1000], oz: ['mass', 28.35],
  tsp: ['volume', 4.929], tbsp: ['volume', 14.787], cup: ['volume', 236.6], ml: ['volume', 1],
};

const nearFraction = (q) => { const fr = q - Math.floor(q); return FRACTIONS.some(([v]) => Math.abs(fr - v) < 0.045) || Math.abs(fr - 1) < 0.045; };

/** Readable volume for shopping: exact kitchen fractions where possible, otherwise rounded with "≈". */
export function displayVolume(ml) {
  const cups = ml / 236.6;
  const tbsp = ml / 14.787;
  if (cups >= 1) {
    if (nearFraction(cups)) return formatQty(cups, 'cup');
    const r = Math.round(cups * 4) / 4;
    return `≈ ${formatQty(r, 'cup')}`;
  }
  if (cups >= 0.25 && nearFraction(cups)) return formatQty(cups, 'cup');
  if (tbsp >= 1) {
    const r = Math.round(tbsp * 2) / 2;
    return `${Math.abs(r - tbsp) > 0.05 ? '≈ ' : ''}${formatQty(r, 'tbsp')}`;
  }
  return formatQty(Math.round((ml / 4.929) * 4) / 4 || 0.25, 'tsp');
}

export function displayMass(g) {
  return g >= 1000 ? formatQty(g / 1000, 'kg') : formatQty(g, 'g');
}

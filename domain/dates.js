// Calendar helpers. Dates are local calendar days written as YYYY-MM-DD.

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const todayIso = (now = new Date()) => toIsoDate(now);
export function addDays(iso, n) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}
export function isValidIso(iso) {
  if (!ISO.test(String(iso ?? ''))) return false;
  const d = parseIso(iso);
  return toIsoDate(d) === iso;
}
/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (iso) => (parseIso(iso).getDay() + 6) % 7;
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

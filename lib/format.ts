// Small formatters shared by server and client components.
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
}
export const formatLongDate = (iso: string) => formatDate(iso, { weekday: 'long', month: 'long', day: 'numeric' });
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
export function timeAgo(iso: string, now = Date.now()) {
  const s = (now - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const isoDate = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

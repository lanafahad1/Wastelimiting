/** Build a path with a query string, dropping empty values (server-safe twin of apiPath). */
export function withQuery(path: string, query: Record<string, string | number | null | undefined> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== '' && v != null) q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

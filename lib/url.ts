/** Build a path with a query string, dropping empty values (server and client safe). */
export function apiPath(path: string, query: Record<string, string | number | null | undefined> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== '' && v != null) q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

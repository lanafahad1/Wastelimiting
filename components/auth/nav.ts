// Where to go after signing in. Used by server pages and client forms alike.
//
// Open-redirect protection: `next` is honoured only when it is a same-site
// relative path ("/patients?x=1"). Protocol-relative URLs ("//evil.example"),
// backslash tricks ("/\evil.example"), control characters (browsers strip tabs
// and newlines, turning "/\t/evil" into "//evil") and absolute URLs are ignored.

const CONTROL = /[\u0000-\u001f\u007f]/;

export function safeNext(value: unknown): string | null {
  const next = Array.isArray(value) ? value[0] : value;
  if (typeof next !== 'string' || next.length === 0 || next.length > 512) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (CONTROL.test(next) || next.includes('\\')) return null;
  try {
    const base = 'http://carebite.invalid';
    const url = new URL(next, base);
    if (url.origin !== base) return null;
    // Never bounce back into the auth pages themselves.
    if (['/login', '/register'].includes(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Role start page (mirrors homeFor() in lib/server/session.ts, which is server-only). */
export function startPageFor(user: { role?: string | null; status?: string | null } | null | undefined): string {
  if (!user) return '/';
  if (user.status !== 'active') return '/access-pending';
  return user.role === 'patient' ? '/my-meals' : '/patients';
}

/** Query string that carries a safe `next` between /login and /register. */
export const nextQuery = (next: string | null) => (next ? `?next=${encodeURIComponent(next)}` : '');

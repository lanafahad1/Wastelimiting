// JSON API used by client components (SWR reads and mutations). It reuses the
// domain route table, resolves the caller from the better-auth session, and
// every operation is authorized by RBAC inside the domain service. GET requests
// read a snapshot; every other method runs as one locked write transaction.
//
// CSRF: state-changing requests must be same-origin (Origin header), carry the
// custom X-CareBite-Request header and a JSON body. Session cookies are
// SameSite=Lax and HttpOnly.
import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { getRuntime, type Ctx } from './runtime';
import { actorFromHeaders, toViewer, type Actor } from './session';
import { createApiRoutes, matchRoute, errorBody } from '@/domain/routes.js';
import { ServiceError } from '@/domain/service.js';
import { can } from '@/domain/rbac.js';
import { DEMO_ACCOUNTS } from '@/domain/demo-data.js';
import { ROLES, label } from '@/domain/constants.js';

const MAX_BODY = 100_000;
const NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...NO_STORE, ...extra } });
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const allowed = new Set([req.nextUrl.host, req.headers.get('host'), process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).host : null].filter(Boolean));
    return allowed.has(o.host);
  } catch { return false; }
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY) throw new ServiceError(413, 'too_large', 'Request body too large.');
  const text = await req.text();
  if (!text) return {};
  if (text.length > MAX_BODY) throw new ServiceError(413, 'too_large', 'Request body too large.');
  if (!String(req.headers.get('content-type') ?? '').includes('application/json')) throw new ServiceError(415, 'unsupported', 'Expected JSON.');
  try { return JSON.parse(text); } catch { throw new ServiceError(400, 'bad_json', 'Malformed JSON.'); }
}

// Used only to match paths and read route flags; handlers run on a per-request service.
const ROUTES = createApiRoutes(null);

/** Account endpoints that are not part of the domain route table. */
async function accountRoute(method: string, path: string, actor: Actor | null, body: Record<string, unknown>) {
  const rt = await getRuntime();
  if (method === 'GET' && path === '/api/demo-accounts') {
    return { password: 'CareBite#2026', accounts: DEMO_ACCOUNTS.map(({ username, name, role, summary, patientDemoId }: { username: string; name: string; role: string; summary: string; patientDemoId?: string }) => ({ username, name, role, roleLabel: label(ROLES, role), summary, patientDemoId: patientDemoId ?? null })) };
  }
  if (!path.startsWith('/api/account')) return undefined;
  if (!actor) throw new ServiceError(401, 'unauthenticated', 'Please log in to continue.');
  if (method === 'GET' && path === '/api/account/me') return { user: await toViewer(actor) };
  if (method === 'GET' && path === '/api/account/export') return (await rt.readContext()).service.exportData(actor, actor);
  if (method === 'POST' && path === '/api/account/link') {
    if (actor.role !== 'patient') throw new ServiceError(403, 'forbidden', 'Only patient accounts can be linked to a patient profile.');
    const patientId = await rt.write(({ repo, service }) => {
      if (actor.patientId && repo.getPatient(actor.patientId)) throw new ServiceError(409, 'already_linked', 'This account is already linked to a patient profile.');
      service.redeemLinkCode(actor, body.linkCode);
      return repo.getUserById(actor.id)?.patientId ?? null;
    });
    return { user: await toViewer({ ...actor, patientId }) };
  }
  if (method === 'POST' && path === '/api/account/reset-demo') {
    if (!(actor.isDemo && can(actor.role, 'demo:reset'))) throw new ServiceError(403, 'forbidden', 'Only the demo admin account can reset the demonstration hospital.');
    await rt.resetDemo();
    return { ok: true, message: 'The demonstration hospital was reset to its starting state.' };
  }
  return undefined;
}

export async function handleApi(req: NextRequest, segments: string[]) {
  const method = req.method.toUpperCase();
  const path = `/api/${segments.map(encodeURIComponent).join('/')}`;
  try {
    if (method !== 'GET' && method !== 'HEAD') {
      if (req.headers.get('x-carebite-request') !== '1' || !sameOrigin(req)) return fail(403, 'csrf', 'Request rejected.');
    }
    const rt = await getRuntime();
    const actor = await actorFromHeaders(req.headers);
    const body = method === 'GET' || method === 'HEAD' ? {} : await readBody(req);
    const account = await accountRoute(method, path, actor, body);
    if (account !== undefined) {
      const extra: Record<string, string> = path === '/api/account/export' ? { 'Content-Disposition': 'attachment; filename="carebite-my-data.json"' } : {};
      return json(account, 200, extra);
    }
    const match = matchRoute(ROUTES, method, path);
    if (!match) return fail(404, 'not_found', 'Not found.');
    if (!match.route.public && !actor) return fail(401, 'unauthenticated', 'Please log in to continue.');
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const index = ROUTES.indexOf(match.route);
    const run = ({ service }: Ctx) => createApiRoutes(service)[index].handler({ params: match.params, query, body, user: actor });
    let result;
    if (method === 'GET' || method === 'HEAD') {
      // Public catalogue routes for signed-out visitors need only the menu.
      const ctx = match.route.public && !actor ? await rt.catalogContext() : await rt.readContext();
      result = await run(ctx);
    } else {
      result = await rt.write(run);
    }
    return json(result ?? { ok: true });
  } catch (err) {
    const { status, body } = errorBody(err);
    if (status >= 500) console.error(err);
    return json(body, status);
  }
}

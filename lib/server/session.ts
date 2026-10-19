// Who is asking: the signed-in user resolved from the better-auth server
// session, mapped to the domain's "actor". Pages and route handlers use these
// helpers; every permission decision goes through RBAC (domain/rbac.js).
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect, forbidden } from 'next/navigation';
import { getRuntime } from './runtime';
import { can, permissionsFor } from '@/domain/rbac.js';
import { ROLES, ACCOUNT_STATUS, label } from '@/domain/constants.js';

export type Role = 'admin' | 'staff' | 'patient';
export type Actor = {
  id: string; role: Role | null; status: string; name: string; username: string; email: string;
  patientId: string | null; isDemo: boolean; requestedRole: string | null; decisionNote: string | null; createdAt: string;
};
/** What the browser may know about the signed-in user (no tokens, no internal fields). */
export type Viewer = {
  name: string; username: string; email: string; role: Role | null; roleLabel: string; status: string; statusLabel: string;
  requestedRole: string | null; decisionNote: string | null; patientId: string | null; patientDemoId: string | null; isDemo: boolean; permissions: string[];
};

type SessionUser = Record<string, unknown> & { id: string; name: string; email: string; createdAt: Date | string };

function toActor(u: SessionUser): Actor {
  return {
    id: String(u.id), role: (u.role as Role) ?? null, status: String(u.status ?? 'pending'), name: u.name, username: String(u.displayUsername ?? u.username ?? ''),
    email: u.email, patientId: u.patientId ? String(u.patientId) : null, isDemo: Boolean(u.isDemo), requestedRole: (u.requestedRole as string) ?? null,
    decisionNote: (u.decisionNote as string) ?? null, createdAt: new Date(u.createdAt).toISOString(),
  };
}

export async function actorFromHeaders(h: Headers): Promise<Actor | null> {
  const { auth } = await getRuntime();
  const s = await auth.api.getSession({ headers: h });
  return s ? toActor(s.user as unknown as SessionUser) : null;
}

/** The signed-in user for this request (memoised per render). */
export const getActor = cache(async (): Promise<Actor | null> => actorFromHeaders(await headers()));

export async function toViewer(actor: Actor): Promise<Viewer> {
  const { repo } = await getRuntime();
  const patient = actor.patientId ? repo.getPatient(actor.patientId) : null;
  const active = actor.status === 'active';
  return {
    name: actor.name, username: actor.username, email: actor.email, role: actor.role,
    roleLabel: actor.role ? label(ROLES, actor.role) : 'Access requested', status: actor.status, statusLabel: label(ACCOUNT_STATUS, actor.status),
    requestedRole: actor.requestedRole, decisionNote: actor.decisionNote, patientId: patient ? String(patient.id) : null, patientDemoId: patient?.demoId ?? null,
    isDemo: actor.isDemo, permissions: active ? permissionsFor(actor.role) : [],
  };
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const actor = await getActor();
  return actor ? toViewer(actor) : null;
});

/** Require a signed-in, active user; otherwise send them to log in (or to the access-request page). */
export async function requireActor(next: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (actor.status !== 'active') redirect('/access-pending');
  return actor;
}

/** Require an RBAC permission for a page; renders the 403 page when the role lacks it. */
export async function requirePermission(permission: string, next: string): Promise<Actor> {
  const actor = await requireActor(next);
  if (!can(actor.role, permission)) forbidden();
  return actor;
}

/** Start page for each role after signing in. */
export function homeFor(actor: Pick<Actor, 'role' | 'status'> | null): string {
  if (!actor) return '/';
  if (actor.status !== 'active') return '/access-pending';
  return actor.role === 'patient' ? '/my-meals' : '/patients';
}

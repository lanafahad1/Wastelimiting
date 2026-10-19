// Server-side data access for server components: call the domain service as
// the signed-in actor and turn domain errors into the right Next.js response
// (404 page, 403 page, or a redirect to log in).
import 'server-only';
import { notFound, forbidden, redirect } from 'next/navigation';
import { getRuntime, type Runtime } from './runtime';
import type { Actor } from './session';

export async function serviceCall<T>(fn: (service: Runtime['service'], rt: Runtime) => T | Promise<T>): Promise<T> {
  const rt = await getRuntime();
  try {
    return await fn(rt.service, rt);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) notFound();
    if (status === 403) forbidden();
    if (status === 401) redirect('/login');
    throw err;
  }
}

/** Reference vocabularies (labels, diet categories, ingredients) for forms. */
export async function getReference() {
  return serviceCall((s) => s.getReference());
}

/** Read a string search param safely. */
export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export type { Actor };

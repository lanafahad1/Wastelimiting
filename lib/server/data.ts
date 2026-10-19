// Server-side data access for server components: call the domain service as
// the signed-in actor and turn domain errors into the right Next.js response
// (404 page, 403 page, or a redirect to log in).
import 'server-only';
import { cache } from 'react';
import { notFound, forbidden, redirect } from 'next/navigation';
import { getRuntime, type Runtime, type Service } from './runtime';
import type { Actor } from './session';

// One read-only snapshot per page render, shared by every call in that render.
const pageContext = cache(async () => (await getRuntime()).readContext());
const catalogContext = cache(async () => (await getRuntime()).catalogContext());

async function call<T>(context: () => Promise<{ service: Service }>, fn: (service: Service, rt: Runtime) => T | Promise<T>): Promise<T> {
  const rt = await getRuntime();
  try {
    const { service } = await context();
    return await fn(service, rt);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) notFound();
    if (status === 403) forbidden();
    if (status === 401) redirect('/login');
    throw err;
  }
}

/** Read hospital data for the page (patients, schedule, requests, accounts, menu). */
export async function serviceCall<T>(fn: (service: Service, rt: Runtime) => T | Promise<T>): Promise<T> {
  return call(pageContext, fn);
}

/** Public pages: read the menu catalogue only. */
export async function publicCall<T>(fn: (service: Service, rt: Runtime) => T | Promise<T>): Promise<T> {
  return call(catalogContext, fn);
}

/** Reference vocabularies (labels, diet categories, ingredients) for forms. */
export async function getReference() {
  return publicCall((s) => s.getReference());
}

/** Read a string search param safely. */
export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

export type { Actor };

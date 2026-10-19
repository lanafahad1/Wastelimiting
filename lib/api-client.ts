'use client';
// Client data access: SWR for reads (seeded with server-fetched data as
// `fallbackData`) and apiSend() for mutations. All calls are same-origin, carry
// the CSRF header, and send cookies automatically.
import * as React from 'react';
import useSWR, { type SWRConfiguration } from 'swr';

export class ApiError extends Error {
  status: number;
  code: string;
  errors: Record<string, string>;
  details: Record<string, unknown>;
  constructor(status: number, body: { error?: { code?: string; message?: string; errors?: Record<string, string> } & Record<string, unknown> }) {
    super(body?.error?.message ?? 'Something went wrong. Please try again.');
    this.status = status;
    this.code = body?.error?.code ?? 'error';
    this.errors = body?.error?.errors ?? {};
    this.details = body?.error ?? {};
  }
}

export async function apiFetch<T = unknown>(path: string, { method = 'GET', body }: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'X-CareBite-Request': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const apiSend = <T = unknown>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body: unknown = {}) => apiFetch<T>(path, { method, body });

const fetcher = (key: string) => apiFetch(key);

/**
 * Read API data with SWR. Pass the data the server component already fetched as
 * `fallbackData` so the first render needs no request; SWR then keeps it fresh
 * (on focus, reconnect and after `mutate()`).
 */
export function useApi<T>(key: string | null, fallbackData?: T, config: SWRConfiguration<T> = {}) {
  const swr = useSWR<T>(key, fetcher as (k: string) => Promise<T>, {
    fallbackData,
    revalidateOnMount: fallbackData === undefined,
    revalidateOnFocus: true,
    keepPreviousData: true,
    ...config,
  });
  // SWR prefers its cache over fallbackData. When the server renders newer data
  // (for example on a return visit), write it into the cache so it wins.
  const seeded = React.useRef<T | undefined>(undefined);
  const { mutate } = swr;
  React.useEffect(() => {
    if (key && fallbackData !== undefined && seeded.current !== fallbackData) {
      seeded.current = fallbackData;
      void mutate(fallbackData, { revalidate: false });
    }
  }, [key, fallbackData, mutate]);
  return swr;
}

export { apiPath } from './url';

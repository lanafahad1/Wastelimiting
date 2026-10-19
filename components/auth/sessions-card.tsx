'use client';
import * as React from 'react';
import { MonitorSmartphone, Smartphone, Monitor, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { LoadingBlock } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import type { AuthError } from './form-bits';

// What list-sessions returns once the server has removed the session tokens.
type SessionRow = { id: string; createdAt: string | Date; updatedAt?: string | Date; expiresAt: string | Date; ipAddress?: string | null; userAgent?: string | null };

/** A short, readable device name from a user-agent string (best effort). */
export function describeDevice(ua?: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: 'Unknown device', mobile: false };
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /HeadlessChrome/.test(ua) ? 'Headless Chrome' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : null;
  const mobile = /Mobile|iPhone|Android/.test(ua);
  if (!browser && !os) return { label: ua.slice(0, 60), mobile };
  return { label: [browser ?? 'Browser', os ? `on ${os}` : null].filter(Boolean).join(' '), mobile };
}

const iso = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString());

/**
 * Shared demo accounts are used by many visitors at once: show only this device (other visitors'
 * IP addresses and browsers are not theirs to see) and do not offer to sign the others out.
 */
export function SessionsCard({ shared = false }: { shared?: boolean }) {
  const [rows, setRows] = React.useState<SessionRow[] | null>(null);
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<{ stale: boolean; message: string } | null>(null);
  const [revoking, setRevoking] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [list, current] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
    setLoading(false);
    if (list.error) {
      const err = list.error as AuthError;
      setError({ stale: err?.code === 'SESSION_NOT_FRESH', message: authErrorMessage(err) });
      setRows(null);
      return;
    }
    setError(null);
    const id = (current.data?.session as { id?: string } | undefined)?.id ?? null;
    setCurrentId(id);
    const all = (list.data ?? []) as unknown as SessionRow[];
    setRows(shared ? all.filter((r) => r.id === id) : all.slice());
  }, [shared]);

  React.useEffect(() => {
    void load();
    // The password form signs out other devices: refresh the list afterwards.
    const onChange = () => void load();
    window.addEventListener('carebite:sessions-changed', onChange);
    return () => window.removeEventListener('carebite:sessions-changed', onChange);
  }, [load]);

  const revokeOthers = async () => {
    setRevoking(true);
    const { error: err } = await authClient.revokeOtherSessions();
    setRevoking(false);
    if (err) { toast(authErrorMessage(err), { tone: 'error' }); return; }
    toast('Signed out of all other devices.');
    void load();
  };

  const sorted = rows ? [...rows].sort((a, b) => (a.id === currentId ? -1 : b.id === currentId ? 1 : +new Date(iso(b.createdAt)) - +new Date(iso(a.createdAt)))) : [];
  const others = rows ? rows.filter((r) => r.id !== currentId).length : 0;

  return (
    <Card aria-labelledby="sess-h">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle id="sess-h" className="flex items-center gap-2"><MonitorSmartphone aria-hidden className="size-5 text-sage-deep" />Signed-in devices</CardTitle>
          <CardDescription>Each device where your account is logged in. A session ends after 8 hours without activity, when you log out, or when you change your password.</CardDescription>
        </div>
      </CardHeader>
      {loading && !rows ? <LoadingBlock label="Loading your sessions…" rows={2} /> : null}
      {error ? (
        error.stale ? (
          <Notice tone="info" title="Log in again to see your devices.">
            For your security, the list of signed-in devices is shown only within 15 minutes of logging in.{' '}
            <Button variant="link" size="sm" className="min-h-0 py-0 align-baseline" onClick={async () => { await authClient.signOut(); window.location.assign('/login?next=/settings'); }}>Log in again</Button>
          </Notice>
        ) : (
          <Notice tone="danger" title="Your sessions could not be loaded.">
            {error.message} <Button variant="link" size="sm" onClick={() => void load()}><RefreshCw aria-hidden />Try again</Button>
          </Notice>
        )
      ) : null}
      {rows ? (
        <ul className="flex flex-col gap-2" aria-label="Signed-in devices">
          {sorted.map((s) => {
            const d = describeDevice(s.userAgent);
            const Icon = d.mobile ? Smartphone : Monitor;
            const current = s.id === currentId;
            return (
              <li key={s.id} className="flex items-start gap-3 rounded-[14px] border border-border bg-background/60 p-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-sage-deep"><Icon className="size-5" /></span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="font-display font-semibold text-heading">{d.label}</b>
                    {current ? <Badge variant="ok">This device</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">IP address: {s.ipAddress || 'not recorded'}</p>
                  <p className="text-sm text-muted-foreground">Signed in {formatDateTime(iso(s.createdAt))} · expires {formatDateTime(iso(s.expiresAt))}</p>
                  {s.userAgent ? <p className="truncate text-xs text-muted-foreground" title={s.userAgent}>{s.userAgent}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rows && shared ? (
        <p className="text-sm text-muted-foreground">This is a shared demo account that other visitors use at the same time, so only this device is shown and other sessions cannot be signed out from here.</p>
      ) : null}
      {rows && !shared ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={revokeOthers} disabled={revoking || others === 0}>
            {revoking ? <Loader2 aria-hidden className="animate-spin" /> : <LogOut aria-hidden />}Sign out of all other devices
          </Button>
          <p className="text-sm text-muted-foreground">{others === 0 ? 'No other devices are signed in.' : `${others} other ${others === 1 ? 'device is' : 'devices are'} signed in.`}</p>
        </div>
      ) : null}
    </Card>
  );
}

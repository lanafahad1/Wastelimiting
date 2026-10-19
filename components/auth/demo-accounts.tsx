'use client';
import * as React from 'react';
import { Lock, Users, User, Loader2 } from 'lucide-react';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useAfterSignIn } from './use-after-sign-in';

export type DemoAccount = { username: string; name: string; role: string; roleLabel: string; summary: string; patientDemoId: string | null };

const ROLE_ICON = { admin: Lock, staff: Users, patient: User } as Record<string, typeof Lock>;
const ROLE_TONE: Record<string, string> = { admin: 'bg-heading text-white', staff: 'bg-sage text-sage-deep', patient: 'bg-rose text-rose-ink' };
const ORDER = ['admin', 'staff', 'patient'];

/** One-click demo sign-in. The shared demo password is published on this page, so it is not a secret. */
export function DemoAccountList({ accounts, password, next }: { accounts: DemoAccount[]; password: string; next: string | null }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const after = useAfterSignIn(next);
  const groups = ORDER.map((r) => [r, accounts.filter((a) => a.role === r)] as const).filter(([, l]) => l.length);

  const use = async (a: DemoAccount) => {
    if (busy) return;
    setBusy(a.username);
    const { data, error } = await authClient.signIn.username({ username: a.username, password });
    if (error || !data) {
      setBusy(null);
      toast(authErrorMessage(error), { tone: 'error' });
      return;
    }
    toast(`Logged in as ${a.name} (${a.roleLabel}, demo).`);
    after(data.user as { role?: string | null; status?: string | null });
  };

  if (!accounts.length) return <p className="text-sm text-muted-foreground">Demo accounts are unavailable.</p>;

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([role, list]) => (
        <div key={role} className="flex flex-col gap-2">
          <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-rose-ink">{list[0].roleLabel}{list.length > 1 ? 's' : ''}</h3>
          <ul className="flex flex-col gap-2">
            {list.map((a) => {
              const Icon = ROLE_ICON[a.role] ?? User;
              return (
                <li key={a.username} className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-3">
                  <span aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-full', ROLE_TONE[a.role])}><Icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">
                      <b className="font-display font-semibold text-heading">{a.name}</b>{' '}
                      <span className="text-sm text-muted-foreground">@{a.username}{a.patientDemoId ? ` · ${a.patientDemoId}` : ''}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{a.summary}</p>
                  </div>
                  <Button size="sm" className="min-h-11 shrink-0 px-4" onClick={() => use(a)} disabled={busy !== null} aria-label={`Log in as ${a.name}`}>
                    {busy === a.username ? <Loader2 aria-hidden className="animate-spin" /> : null}Use
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

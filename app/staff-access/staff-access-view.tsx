'use client';
import * as React from 'react';
import { Clock, Users, Check, X as XIcon, Lock } from 'lucide-react';
import { useApi, apiSend } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, NativeSelect } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Table, Th, Td } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Panel, When, useFormErrors, FormMessage } from '@/components/staff/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type User = any;
type Data = { pending: User[]; staff: User[]; roles: { id: string; label: string; hint?: string }[] };
type Decision = 'approve' | 'decline' | 'role' | 'deactivate' | 'reactivate';

const KEY = '/api/admin/staff';
const DECISIONS: Record<Decision, { title: string; intro: string; needRole?: boolean; noteLabel?: string; button: string; danger?: boolean }> = {
  approve: { title: 'Approve staff access', intro: 'Check the person’s identity and job through the hospital’s own process first. The role decides what they can see and do.', needRole: true, button: 'Approve' },
  decline: { title: 'Decline staff access', intro: 'The person will see your reason when they log in.', noteLabel: 'Reason (required)', button: 'Decline', danger: true },
  role: { title: 'Change role', intro: 'The new role applies immediately.', needRole: true, button: 'Change role' },
  deactivate: { title: 'Deactivate account', intro: 'The person is signed out and can no longer log in. Their audit history is kept.', button: 'Deactivate', danger: true },
  reactivate: { title: 'Reactivate account', intro: 'The account gets its previous role back.', button: 'Reactivate' },
};

export function StaffAccessView({ initial }: { initial: Data }) {
  const { data, error, mutate } = useApi<Data>(KEY, initial);
  const d = data ?? initial;
  const [open, setOpen] = React.useState<{ user: User; decision: Decision } | null>(null);
  const decide = (user: User, decision: Decision) => setOpen({ user, decision });

  return (
    <>
      <PageHead eyebrow="Hospital administration" title="Staff Access">
        <p>Staff accounts are issued or approved here by an admin, who assigns each person’s role. Asking for access never grants a role by itself.</p>
      </PageHead>
      <PageBody>
        <Notice tone="warn" title="Demonstration access only" role="note">This academic prototype does not verify anyone’s identity or employment. A real hospital would issue staff accounts through its identity system (for example single sign-on) after HR and credential checks.</Notice>
        {error ? <Notice tone="danger" title="We couldn’t refresh staff access.">{error.message} Check your connection and try again.</Notice> : null}

        <Panel id="sa-p" icon={Clock} title={`Waiting for approval (${d.pending.length})`}>
          {d.pending.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {d.pending.map((u) => (
                <li key={u.id} className="flex flex-col gap-3 rounded-[16px] border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <b className="font-display text-base font-semibold text-heading">{u.name}</b>
                      <span className="break-words text-sm text-muted-foreground">@{u.username} · {u.email} · asked <When iso={u.createdAt} withYear /></span>
                    </div>
                    <Badge variant="warn"><Clock aria-hidden />Pending</Badge>
                  </div>
                  <p className="text-sm"><b>Asked to work as:</b> {u.requestedRoleLabel ?? '—'} · <b>Department / job:</b> {u.requestNote || '—'}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => decide(u, 'approve')}><Check aria-hidden />Approve and assign a role<span className="sr-only">: {u.name}</span></Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(u, 'decline')}><XIcon aria-hidden />Decline<span className="sr-only">: {u.name}</span></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">No requests waiting. New staff ask for access from “Create account → Hospital staff”.</p>}
        </Panel>

        <Panel id="sa-s" icon={Users} title="Staff accounts">
          <Table caption="Staff accounts">
            <thead><tr><Th scope="col">Person</Th><Th scope="col">Role</Th><Th scope="col">Status</Th><Th scope="col">Decided</Th><Th scope="col">Actions</Th></tr></thead>
            <tbody>
              {d.staff.map((u) => (
                <tr key={u.id}>
                  <Th scope="row" className="min-w-40 bg-transparent font-sans text-sm font-semibold normal-case tracking-normal text-foreground">{u.name}<br /><span className="text-xs font-normal text-muted-foreground">@{u.username}{u.isDemo ? ' · shared demo account' : ''}</span></Th>
                  <Td>{u.roleLabel}</Td>
                  <Td>{u.status === 'active' ? <Badge variant="ok"><Check aria-hidden />{u.statusLabel}</Badge> : <Badge variant="outline"><XIcon aria-hidden />{u.statusLabel}</Badge>}</Td>
                  <Td className="min-w-40 text-sm">{u.decidedBy ? <>{u.decidedBy}, <When iso={u.decidedAt} withYear /></> : '—'}{u.decisionNote ? <><br /><span className="text-muted-foreground">{u.decisionNote}</span></> : null}</Td>
                  <Td className="relative">
                    {u.isDemo ? <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Lock className="size-3.5" aria-hidden />Locked (demo)</span>
                      : u.status === 'active' ? (
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => decide(u, 'role')}>Change role<span className="sr-only">: {u.name}</span></Button>
                          <Button size="sm" variant="ghost" onClick={() => decide(u, 'deactivate')}>Deactivate<span className="sr-only">: {u.name}</span></Button>
                        </div>
                      ) : u.status === 'deactivated' ? <Button size="sm" variant="outline" onClick={() => decide(u, 'reactivate')}>Reactivate<span className="sr-only">: {u.name}</span></Button>
                        : <span className="text-sm text-muted-foreground">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </PageBody>
      <DecideDialog open={open} roles={d.roles} onClose={() => setOpen(null)} onDone={async () => { setOpen(null); await mutate(); }} />
    </>
  );
}

function DecideDialog({ open, roles, onClose, onDone }: { open: { user: User; decision: Decision } | null; roles: Data['roles']; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = React.useState('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { errors, formError, reset, fail } = useFormErrors();
  const [last, setLast] = React.useState(open);
  if (open && open !== last) { setLast(open); setRole(open.user.role ?? open.user.requestedRole ?? ''); setNote(''); reset(); }
  const shown = open ?? last;
  if (!shown) return <Dialog open={false} />;
  const cfg = DECISIONS[shown.decision];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); reset();
    try {
      await apiSend('POST', `/api/admin/staff/${shown.user.id}`, { decision: shown.decision, ...(cfg.needRole ? { role } : {}), note });
      toast('Saved. The change takes effect at the person’s next request.');
      onDone();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const fieldErr = Boolean(errors.role || errors.note);
  return (
    <Dialog open={Boolean(open)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{cfg.title}: {shown.user.name}</DialogTitle>
            <DialogDescription>{cfg.intro}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {cfg.needRole ? (
              <Field id="sd-role" label="Role to assign" error={errors.role} hint={roles.find((r) => r.id === role)?.hint}>
                <NativeSelect value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Choose a role…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </NativeSelect>
              </Field>
            ) : null}
            <Field id="sd-note" label={cfg.noteLabel ?? 'Note (optional)'} error={errors.note}>
              <Input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <FormMessage message={fieldErr ? null : formError} />
          </DialogBody>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
            <Button type="submit" variant={cfg.danger ? 'destructive-solid' : 'default'} disabled={busy}>{busy ? 'Saving…' : cfg.button}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

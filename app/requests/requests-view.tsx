'use client';
import * as React from 'react';
import Link from 'next/link';
import { HeartPulse, MessageSquare, Lock, Check, X as XIcon } from 'lucide-react';
import { useApi, apiPath, apiSend } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { RequestStatusChip } from '@/components/cb/status';
import { PatientHeader, EmptyState } from '@/components/cb/misc';
import { periodLabel, requestLabel, roleLabel } from '@/components/cb/labels';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, Label, Input, Textarea } from '@/components/ui/input';
import { Field, OptionCard } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Fieldset } from '@/components/forms/fieldset';
import { toast } from '@/components/ui/toast';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { When, useFormErrors, FormMessage } from '@/components/staff/ui';
import { REQUEST_TYPES } from '@/domain/constants.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Req = any;
type Data = { requests: Req[]; counts: { open: number; all: number } };
type Filters = { status: string; type: string; date: string; order: string };

const KEY = apiPath('/api/requests', { status: 'all' });
const STATUS_PILLS: [string, string][] = [['open', 'Pending'], ['resolved', 'Resolved'], ['declined', 'Declined'], ['all', 'All requests']];

export function RequestsView({ initial, permissions, initialFilters }: { initial: Data; permissions: string[]; initialFilters: Filters }) {
  const { data, error, mutate } = useApi<Data>(KEY, initial);
  const [f, setF] = React.useState<Filters>(initialFilters);
  const [responding, setResponding] = React.useState<Req | null>(null);
  const resultsRef = React.useRef<HTMLHeadingElement>(null);
  const canResolve = permissions.includes('request:resolve');
  const canClinical = permissions.includes('request:resolve-clinical');

  const update = (next: Partial<Filters>) => {
    const n = { ...f, ...next };
    setF(n);
    window.history.replaceState(null, '', apiPath('/requests', { status: n.status === 'open' ? '' : n.status, type: n.type, date: n.date, order: n.order }));
  };

  const all: Req[] = (data ?? initial).requests;
  const count = (s: string) => (s === 'all' ? all.length : all.filter((r) => r.status === s).length);
  let rows = all.filter((r) => (f.status === 'all' || r.status === f.status) && (!f.type || r.type === f.type) && (!f.date || r.date === f.date));
  if (f.order === 'newest') rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = Boolean(f.type || f.date);
  const statusWord = f.status === 'all' ? '' : `${STATUS_PILLS.find(([s]) => s === f.status)?.[1].toLowerCase()} `;

  return (
    <>
      <PageHead eyebrow="Patient participation" title="Patient Requests">
        <p>Requests for a different meal, a schedule change or support, and reports of changes to allergies or diet. Statuses are the same ones the patient sees: Pending, Resolved or Declined. Clinical reports are answered by an admin and never change the record automatically.</p>
      </PageHead>
      <PageBody>
        {error ? <Notice tone="danger" title="We couldn’t refresh the requests.">{error.message} Check your connection and try again.</Notice> : null}
        <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-card p-4">
          <div role="group" aria-label="Show requests by status" className="flex flex-wrap gap-2">
            {STATUS_PILLS.map(([s, l]) => (
              <button key={s} type="button" aria-pressed={f.status === s} onClick={() => update({ status: s })}
                className="min-h-10 rounded-full border border-border bg-card px-3.5 py-1.5 font-display text-sm font-medium text-heading hover:bg-mint aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                {l} ({count(s)})
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rq-type">Type</Label>
              <NativeSelect id="rq-type" value={f.type} onChange={(e) => update({ type: e.target.value })}>
                <option value="">All types</option>
                {REQUEST_TYPES.map((t: { id: string; label: string }) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rq-date">Meal date</Label>
              <Input id="rq-date" type="date" value={f.date} onChange={(e) => update({ date: /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : '' })} aria-describedby="rq-date-hint" />
              <span id="rq-date-hint" className="text-xs text-muted-foreground">Requests about a meal on this date. Leave empty for all.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rq-order">Order</Label>
              <NativeSelect id="rq-order" value={f.order} onChange={(e) => update({ order: e.target.value })}>
                <option value="">Pending and clinical first, oldest first</option>
                <option value="newest">Newest submitted first</option>
              </NativeSelect>
            </div>
          </div>
          {filtered ? <Button variant="link" size="sm" className="w-fit" onClick={() => update({ type: '', date: '' })}>Clear type and date filters</Button> : null}
        </div>

        <h2 ref={resultsRef} tabIndex={-1} className="text-lg outline-none" aria-live="polite">{plural(rows.length, `${statusWord}request`)}{filtered ? ' matching the filters' : ''}</h2>

        {rows.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((r) => (
              <li key={r.id} className={cn('flex flex-col gap-3 rounded-[20px] border bg-card p-4 shadow-soft sm:p-5', r.clinical ? 'border-[#F1DFB8] border-l-4 border-l-warning' : 'border-border')}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <PatientHeader b={r.patient} />
                  <RequestStatusChip status={r.status} />
                </div>
                <h3 className="flex items-center gap-2 text-base">{r.clinical ? <HeartPulse className="size-4 shrink-0" aria-hidden /> : <MessageSquare className="size-4 shrink-0" aria-hidden />}{r.typeLabel}</h3>
                {r.reportLabel ? <p className="text-sm"><b>{r.reportLabel}</b>{r.allergenLabel ? `: ${r.allergenLabel} (meals containing it are held for review until this is resolved)` : ''}</p> : null}
                <blockquote className="m-0 border-l-2 border-sage pl-3">“{r.message}”</blockquote>
                <p className="text-sm text-muted-foreground">
                  {r.createdBy} ({roleLabel(r.createdByRole)}) · Submitted <When iso={r.createdAt} format="ago" />
                  {r.date ? ` · ${periodLabel(r.period)} on ${formatDate(r.date)}` : ''}{r.mealName ? ` · ${r.mealName}` : ''}
                </p>
                {r.response ? <p className="text-sm"><b>Response from {r.resolvedBy}:</b> {r.response}{r.resolvedAt ? <span className="text-muted-foreground"> (<When iso={r.resolvedAt} />)</span> : null}</p> : null}
                {r.status === 'open' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {r.clinical ? (
                      <>
                        {canClinical ? <Button size="sm" onClick={() => setResponding(r)}>Respond</Button> : null}
                        <Link href={`/patients/${r.patient.id}?tab=requests`} className={buttonVariants({ size: 'sm', variant: canClinical ? 'outline' : 'default' })}>{canClinical ? 'Review on the patient’s profile' : 'Open patient'}</Link>
                        {canClinical ? null : <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden />Waiting for an admin. Reports about allergies or the diet order must be reviewed by an admin.</span>}
                      </>
                    ) : (
                      <>
                        {canResolve ? <Button size="sm" onClick={() => setResponding(r)}>Respond</Button> : null}
                        <Link href={`/patients/${r.patient.id}${r.date ? `?date=${r.date}` : ''}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>{r.type === 'alternative' ? 'Offer new options' : 'Open patient'}</Link>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={`No ${f.status === 'open' ? 'open ' : statusWord}requests${filtered ? ' match these filters' : ''}`}>
            {filtered ? 'Clear the type and date filters to see more.' : 'Patients can ask for alternatives, schedule changes or support from their own screen.'}
          </EmptyState>
        )}
      </PageBody>
      <RespondDialog request={responding} onClose={() => setResponding(null)} onDone={async () => { setResponding(null); await mutate(); resultsRef.current?.focus(); }} />
    </>
  );
}

function RespondDialog({ request: r, onClose, onDone }: { request: Req | null; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = React.useState('resolved');
  const [response, setResponse] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const { errors, formError, reset, fail } = useFormErrors();
  const [last, setLast] = React.useState<Req | null>(r);
  if (r && r !== last) { setLast(r); setStatus('resolved'); setResponse(''); reset(); }
  const shown = r ?? last;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shown) return;
    setBusy(true); reset();
    try {
      await apiSend('PATCH', `/api/requests/${shown.id}`, { status, response });
      toast('Response saved. The patient sees it under My Requests.');
      onDone();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  return (
    <Dialog open={Boolean(r)} onOpenChange={(o) => { if (!o) onClose(); }}>
      {shown ? (
        <DialogContent>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle>Respond: {requestLabel(shown.type)} · {shown.patient.demoId}</DialogTitle>
              <DialogDescription>“{shown.message}”</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Fieldset legend="Outcome">
                <div className="grid gap-2 sm:grid-cols-2">
                  <OptionCard name="rs-status" value="resolved" checked={status === 'resolved'} onChange={() => setStatus('resolved')} title={<span className="inline-flex items-center gap-1.5"><Check className="size-4" aria-hidden />Resolved</span>} />
                  <OptionCard name="rs-status" value="declined" checked={status === 'declined'} onChange={() => setStatus('declined')} title={<span className="inline-flex items-center gap-1.5"><XIcon className="size-4" aria-hidden />Declined</span>} description="Explain why to the patient." />
                </div>
              </Fieldset>
              {shown.clinical ? <Notice tone="info">Responding does not change the record. Update the diet order or allergies on the patient’s profile if needed.</Notice> : null}
              <Field id="rs-text" label="Response for the patient" error={errors.response} hint="Up to 400 characters. The patient sees this under My Requests.">
                <Textarea maxLength={400} value={response} onChange={(e) => setResponse(e.target.value)} />
              </Field>
              <FormMessage message={errors.response ? null : formError} />
            </DialogBody>
            <DialogFooter>
              <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
              <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send response'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

'use client';
import * as React from 'react';
import { Plus, Lock, CalendarDays } from 'lucide-react';
import { apiSend } from '@/lib/api-client';
import { RequestStatusChip } from '@/components/cb/status';
import { EmptyState } from '@/components/cb/misc';
import { periodLabel, requestLabel, roleLabel } from '@/components/cb/labels';
import { FormErrors, FieldError } from '@/components/forms/errors';
import { Fieldset } from '@/components/forms/fieldset';
import { OptionCard } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect, Textarea, Label } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Modal, FormMessage, useSubmit, When } from './common';
import { usePatient, P, type DialogProps } from './patient-context';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function RequestsTab() {
  const c = usePatient();
  const rs: any[] = c.record.requests;
  const isAdmin = c.can('request:resolve-clinical');
  const reviewReport = (r: any, from: HTMLElement) => {
    const p = structuredClone(c.record.patient);
    if (r.report?.kind === 'new-allergy' && r.report.allergen && !p.allergies.confirmed.includes(r.report.allergen)) {
      p.allergies.confirmed.push(r.report.allergen);
      p.allergies.status = 'recorded';
    }
    c.open({
      kind: 'section', section: 'clinical',
      prefill: { patient: p, requestId: r.id, note: `Patient report: “${r.message}”${r.allergenLabel ? ` The reported allergen (${r.allergenLabel}) has been pre-selected; remove it if your review does not confirm it.` : ''} After saving, you will be asked to respond to the patient.` },
    }, { from, fallback: `rq-${r.id}` });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-3xl text-muted-foreground">Requests from the patient or recorded by staff on their behalf. Reports about allergies or the diet order are answered by an admin and never change the record by themselves.</p>
        {!c.discharged && c.can('request:create') ? (
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={(ev) => c.open({ kind: 'request' }, { from: ev.currentTarget })}><Plus aria-hidden />New request</Button>
        ) : null}
      </div>
      {rs.length ? (
        <ul className="flex flex-col gap-3">
          {rs.map((r) => (
            <li key={r.id} className={cn('flex flex-col gap-2.5 rounded-xl border bg-card p-4 sm:p-5', r.clinical ? 'border-[#F1DFB8] border-l-[5px] border-l-warning' : 'border-border')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 id={`rq-${r.id}`} tabIndex={-1} className="text-base outline-none sm:text-lg">{r.typeLabel}</h3>
                <RequestStatusChip status={r.status} />
              </div>
              {r.reportLabel ? <p className="text-sm"><b>{r.reportLabel}</b>{r.allergenLabel ? `: ${r.allergenLabel}` : ''}</p> : null}
              <p>“{r.message}”</p>
              <span className="text-sm text-muted-foreground">{r.createdBy} ({roleLabel(r.createdByRole)}) · <When iso={r.createdAt} />{r.date ? ` · ${periodLabel(r.period)} on ${formatDate(r.date)}` : ''}{r.mealName ? ` · ${r.mealName}` : ''}</span>
              {r.response ? <p className="text-sm"><b>Response from {r.resolvedBy}</b> (<When iso={r.resolvedAt} />): {r.response}</p> : null}
              {r.status === 'open' && (!r.clinical || isAdmin) && c.can('request:resolve') ? (
                <div className="flex flex-wrap gap-2">
                  {r.clinical ? (
                    <>
                      {c.can('patient:edit-clinical') ? <Button size="sm" onClick={(ev) => reviewReport(r, ev.currentTarget)}>Review and update diet or allergies</Button> : null}
                      <Button size="sm" variant="outline" onClick={(ev) => c.open({ kind: 'respond', requestId: r.id }, { from: ev.currentTarget, fallback: `rq-${r.id}` })}>Respond without changing the record</Button>
                    </>
                  ) : <Button size="sm" onClick={(ev) => c.open({ kind: 'respond', requestId: r.id }, { from: ev.currentTarget, fallback: `rq-${r.id}` })}>Respond</Button>}
                  {r.type === 'alternative' && r.date ? <Button size="sm" variant="outline" onClick={() => c.goToMeal(r.date, r.period)}><CalendarDays aria-hidden />Go to this meal</Button> : null}
                </div>
              ) : r.status === 'open' ? <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="size-4" aria-hidden /> Waiting for an admin.</p> : null}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No requests">Requests for alternatives, schedule changes or support appear here.</EmptyState>}
    </div>
  );
}

// ------------------------------------------------------------------ record a request for the patient
export function RequestDialog({ a, open, finalFocus }: DialogProps<'request'>) {
  const c = usePatient();
  const pre = a.prefill ?? {};
  const { busy, errors, formError, run } = useSubmit();
  const formRef = React.useRef<HTMLFormElement>(null);
  const types = c.reference.vocab.requestTypes.filter((t: any) => !t.clinical);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!v.date) delete v.date;
    if (!v.period) delete v.period;
    run(async () => {
      await apiSend('POST', P(c.id, '/requests'), v);
      await c.refresh();
      c.close();
      toast('Request saved. It appears on the Requests page with status Pending.');
    }, formRef.current);
  };
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title="Record a request for this patient"
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button type="submit" form="nr-form" disabled={busy}>{busy ? 'Saving…' : 'Save request'}</Button></>}>
      <FormErrors errors={errors}>
        <form id="nr-form" ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nr-type">Request type</Label>
            <NativeSelect id="nr-type" name="type" defaultValue={pre.type ?? types[0]?.id}>{types.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}</NativeSelect>
            <FieldError name="type" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nr-date">Day</Label>
              <Input id="nr-date" type="date" name="date" defaultValue={pre.date ?? ''} />
              <FieldError name="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nr-period">Meal</Label>
              <NativeSelect id="nr-period" name="period" defaultValue={pre.period ?? ''}>
                <option value="">—</option>
                {c.reference.vocab.periods.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </NativeSelect>
              <FieldError name="period" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nr-msg">Details</Label>
            <Textarea id="nr-msg" name="message" maxLength={400} defaultValue={pre.message ?? ''} />
            <FieldError name="message" />
          </div>
          <FormMessage message={formError} />
        </form>
      </FormErrors>
    </Modal>
  );
}

// ------------------------------------------------------------------ respond to a request
export function RespondDialog({ a, open, finalFocus }: DialogProps<'respond'>) {
  const c = usePatient();
  const [r] = React.useState(() => c.record.requests.find((x: any) => x.id === a.requestId));
  const [status, setStatus] = React.useState<'resolved' | 'declined'>('resolved');
  const { busy, errors, formError, run } = useSubmit();
  if (!r) return null;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = String(new FormData(e.currentTarget).get('response') ?? '');
    run(async () => {
      const res = await apiSend<{ released?: unknown[] }>('PATCH', `/api/requests/${encodeURIComponent(r.id)}`, { status, response });
      await c.refresh();
      c.close();
      toast(`Response saved. The patient sees it under My Requests.${res.released?.length ? ` ${plural(res.released.length, 'held meal')} released.` : ''}`);
    });
  };
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title={`Respond: ${requestLabel(r.type)}`}
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button type="submit" form="rr-form" disabled={busy}>{busy ? 'Sending…' : 'Send response'}</Button></>}>
      <p>“{r.message}”</p>
      <FormErrors errors={errors}>
        <form id="rr-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Fieldset legend="Outcome">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard name="status" value="resolved" checked={status === 'resolved'} onChange={() => setStatus('resolved')} title="Resolved" />
              <OptionCard name="status" value="declined" checked={status === 'declined'} onChange={() => setStatus('declined')} title="Declined" description="Explain why to the patient." />
            </div>
          </Fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rr-text">Response for the patient</Label>
            <Textarea id="rr-text" name="response" maxLength={400} required defaultValue={a.suggestion ?? ''} />
            <FieldError name="response" />
          </div>
          <FormMessage message={formError} />
        </form>
      </FormErrors>
    </Modal>
  );
}

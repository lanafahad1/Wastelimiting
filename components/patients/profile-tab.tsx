'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Lock, LogOut, User, Trash2, KeyRound, Copy, Check, X, HeartPulse } from 'lucide-react';
import { apiSend } from '@/lib/api-client';
import { SectionFields, SectionSummary, readSection, type Section } from '@/components/forms/profile-sections';
import { FormErrors, FieldError } from '@/components/forms/errors';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, NativeSelect, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { SECTION_PERMISSION } from '@/domain/rbac.js';
import { formatDate, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Modal, FormMessage, useSubmit, When, errorText, dropAppCache } from './common';
import { usePatient, P, type DialogProps } from './patient-context';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const SECTIONS: [Section, string, string][] = [
  ['clinical', 'Prescribed diet, allergies and restrictions', 'Entered by the care team. Only an admin can change this section. Saving re-screens every upcoming meal.'],
  ['preferences', 'Food preferences', 'Preferred cuisines and foods, disliked ingredients and preferred portion. Used only for ranking.'],
  ['appetite', 'Current appetite', 'Used to suggest a portion within the prescribed plan.'],
  ['details', 'Patient details', 'Demonstration identifier, ward and bed.'],
];

function Panel({ id, title, aside, children, className }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={id} tabIndex={-1} className="text-lg outline-none sm:text-xl">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ProfileTab() {
  const c = usePatient();
  const p = c.record.patient;
  const discharged = c.discharged;
  const canEdit = (section: Section) => c.can((SECTION_PERMISSION as Record<string, string>)[section]) && !discharged;
  const [linkBusy, setLinkBusy] = React.useState(false);
  const createCode = async (ev: React.MouseEvent<HTMLButtonElement>) => {
    const from = ev.currentTarget;
    setLinkBusy(true);
    try {
      const r = await apiSend<{ code: string; expiresAt: string; hours: number }>('POST', P(c.id, '/link-code'));
      c.open({ kind: 'linkcode', ...r }, { from, fallback: 'sec-acct' });
      void c.refresh();
    } catch (err) { toast(errorText(err), { tone: 'error' }); } finally { setLinkBusy(false); }
  };
  const discharge = (ev: React.MouseEvent<HTMLButtonElement>) => c.open({
    kind: 'reason', title: `Record discharge for ${p.demoId}?`,
    intro: 'Upcoming meals that have not been delivered are cancelled and the kitchen is alerted. Pending requests are closed with a note. Nothing is deleted.',
    label: 'Note (optional), e.g. discharged home', button: 'Record discharge',
    onSubmit: async (note) => { const r = await apiSend<{ cancelled: unknown[] }>('POST', P(c.id, '/discharge'), { note }); toast(`Discharge recorded. ${plural(r.cancelled.length, 'upcoming meal period')} cancelled.`); },
  }, { from: ev.currentTarget, fallback: 'sec-adm' });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {SECTIONS.map(([section, title, hint]) => (
        <Panel key={section} id={`sec-${section}`} title={title} className={section === 'clinical' ? 'border-sage bg-mint/40 lg:col-span-2' : undefined}
          aside={canEdit(section)
            ? <Button variant="outline" size="sm" onClick={(ev) => c.open({ kind: 'section', section }, { from: ev.currentTarget, fallback: `sec-${section}` })} aria-label={`Edit ${title.toLowerCase()}`}><Pencil aria-hidden />Edit</Button>
            : section === 'clinical' && !c.can('patient:edit-clinical') ? <Badge variant="outline"><Lock aria-hidden />Admin only</Badge> : null}>
          <p className="text-sm text-muted-foreground">{hint}</p>
          <SectionSummary section={section} p={p} reference={c.reference} />
        </Panel>
      ))}

      <Panel id="sec-adm" title="Admission status" aside={discharged ? <Badge variant="outline"><X aria-hidden />Discharged</Badge> : <Badge variant="ok"><Check aria-hidden />Admitted</Badge>}>
        {discharged ? (
          <>
            <p>Discharged on <b>{p.dischargedOn}</b>{p.dischargedBy ? ` by ${p.dischargedBy}` : ''}{p.dischargeNote ? ` (${p.dischargeNote})` : ''}.</p>
            <p className="text-sm text-muted-foreground">Records are kept read-only. Readmitting returns the patient to meal lists; review the diet order first.</p>
            {c.can('patient:admission') ? <div><Button size="sm" onClick={(ev) => c.open({ kind: 'readmit' }, { from: ev.currentTarget, fallback: 'sec-adm' })}>Readmit patient</Button></div> : null}
          </>
        ) : (
          <>
            <p className="text-sm">Recording a discharge removes the patient from upcoming meal and kitchen lists and cancels meals not yet delivered (the kitchen is alerted). It does <b>not</b> delete anything: past meals, intake and requests are kept. It is separate from removing the patient account and from deleting the record.</p>
            {c.can('patient:admission') ? <div><Button variant="outline" size="sm" onClick={discharge}><LogOut aria-hidden />Record discharge</Button></div> : null}
          </>
        )}
      </Panel>

      <Panel id="sec-acct" title="Patient account">
        <p className="text-sm text-muted-foreground">The patient’s personal login. Removing the link stops the account from reaching this profile; the account and the hospital record are both kept.</p>
        {p.linkedAccounts.length ? (
          <>
            <p className="flex items-center gap-1.5"><User className="size-4" aria-hidden /> Linked to <b>@{p.linkedAccounts[0].username}</b> since {formatDate(String(p.linkedAccounts[0].createdAt).slice(0, 10))}.</p>
            {c.can('patient:link-account') ? <div><Button variant="destructive" size="sm" onClick={(ev) => c.open({ kind: 'unlink' }, { from: ev.currentTarget, fallback: 'sec-acct' })}>Remove account link</Button></div> : null}
          </>
        ) : discharged ? <p className="text-sm text-muted-foreground">No account linked.</p> : (
          <>
            <p>No account linked.{p.linkCodeActive ? ' A link code is active.' : ''}</p>
            {c.can('patient:link-account') ? <div><Button size="sm" onClick={createCode} disabled={linkBusy}><KeyRound aria-hidden />{linkBusy ? 'Creating code…' : 'Create a one-time link code'}</Button></div> : null}
          </>
        )}
      </Panel>

      {c.can('patient:delete') ? (
        <Panel id="sec-del" title="Delete patient record permanently" className="border-[#F3C9D3] bg-destructive-soft/40 lg:col-span-2">
          <p className="text-sm">Demonstration data control: permanently deletes this record with its meals, intake and requests. This cannot be undone. To end a stay, record a discharge instead.</p>
          <div><Button variant="destructive" size="sm" onClick={(ev) => c.open({ kind: 'delete' }, { from: ev.currentTarget, fallback: 'sec-del' })}><Trash2 aria-hidden />Delete record permanently</Button></div>
        </Panel>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ edit one section
export function SectionDialog({ a, open, finalFocus }: DialogProps<'section'>) {
  const c = usePatient();
  const { busy, errors, formError, run } = useSubmit();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [patient] = React.useState(() => a.prefill?.patient ?? c.record.patient);
  const title = SECTIONS.find(([s]) => s === a.section)?.[1] ?? a.section;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = readSection(a.section, e.currentTarget);
    run(async () => {
      const res = await apiSend<{ changes?: string[]; recheck?: { hold?: boolean }[]; warnings?: string[] }>('PATCH', P(c.id, `/sections/${a.section}`), body);
      await c.refresh();
      const held = (res.recheck ?? []).filter((r) => r.hold).length;
      toast(`Saved.${res.changes?.length ? ` ${res.changes.join('; ')}.` : ''}${res.recheck?.length ? ` ${plural(res.recheck.length, 'upcoming meal period')} affected${held ? `, ${held} put on hold` : ''}.` : ''}`, { timeout: 9000 });
      for (const w of res.warnings ?? []) toast(w, { tone: 'warn', timeout: 9000 });
      if (a.prefill?.requestId) c.open({ kind: 'respond', requestId: a.prefill.requestId, suggestion: 'Allergy record updated after review.' });
      else c.close();
    }, formRef.current);
  };
  return (
    <Modal open={open} onClose={c.close} wide={a.section !== 'appetite'} finalFocus={finalFocus} title={`Edit: ${title}`}
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button type="submit" form="sec-form" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></>}>
      {a.section === 'clinical' ? <Notice tone="info">Saving re-screens every upcoming offered, chosen, confirmed and prepared meal. Meals that no longer pass are put on hold for review, and the kitchen is alerted about trays already on its list.</Notice> : null}
      {a.prefill?.note ? <Notice tone="rose" icon={<HeartPulse aria-hidden />}>{a.prefill.note}</Notice> : null}
      <FormErrors errors={errors}>
        <form id="sec-form" ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <SectionFields section={a.section} p={patient} reference={c.reference} />
          <FormMessage message={formError} />
        </form>
      </FormErrors>
    </Modal>
  );
}

// ------------------------------------------------------------------ readmit
export function ReadmitDialog({ open, finalFocus }: DialogProps<'readmit'>) {
  const c = usePatient();
  const p = c.record.patient;
  const { busy, errors, formError, run } = useSubmit();
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      await apiSend('POST', P(c.id, '/readmit'), { ward: fd.get('ward'), bed: fd.get('bed') });
      await c.refresh();
      c.close();
      toast('Patient readmitted.');
    });
  };
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title={`Readmit ${p.demoId}`}
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button type="submit" form="ra-form" disabled={busy}>{busy ? 'Saving…' : 'Readmit'}</Button></>}>
      <FormErrors errors={errors}>
        <form id="ra-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ra-ward">Ward</Label>
              <NativeSelect id="ra-ward" name="ward" defaultValue={p.ward}>{c.reference.vocab.wards.map((w: any) => <option key={w.id} value={w.id}>{w.label}</option>)}</NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ra-bed">Bed</Label>
              <Input id="ra-bed" name="bed" defaultValue={p.bed} maxLength={8} />
              <FieldError name="bed" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">An admin should review the diet order and allergies before meals are planned.</p>
          <FormMessage message={formError} />
        </form>
      </FormErrors>
    </Modal>
  );
}

// ------------------------------------------------------------------ link code
export function LinkCodeDialog({ a, open, finalFocus }: DialogProps<'linkcode'>) {
  const c = usePatient();
  const copy = async () => {
    try { await navigator.clipboard.writeText(a.code); toast('Code copied.'); } catch { toast('Select the code and copy it manually.', { tone: 'warn' }); }
  };
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title="One-time account link code"
      footer={<><Button variant="outline" onClick={copy}><Copy aria-hidden />Copy code</Button><Button onClick={c.close}>Done</Button></>}>
      <p>Give this code to the patient. They choose <b>Create account → Patient</b> and enter it. It works once and expires in {a.hours} hours (<When iso={a.expiresAt} />).</p>
      <p className="select-all rounded-[16px] bg-mint p-4 text-center font-mono text-[1.75rem] tracking-[.12em] text-sage-deep sm:text-[2rem]" aria-label={`Link code ${a.code.split('').join(' ')}`}>{a.code}</p>
      <p className="text-sm text-muted-foreground">Creating a new code replaces any earlier unused code.</p>
    </Modal>
  );
}

// ------------------------------------------------------------------ unlink accounts
export function UnlinkDialog({ open, finalFocus }: DialogProps<'unlink'>) {
  const c = usePatient();
  const { busy, formError, run } = useSubmit();
  const go = () => run(async () => {
    await apiSend('DELETE', P(c.id, '/accounts'));
    await c.refresh();
    c.close();
    toast('Account link removed.');
  });
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title="Remove the patient account link?"
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button variant="destructive-solid" onClick={go} disabled={busy}>{busy ? 'Removing…' : 'Remove link'}</Button></>}>
      <p>The patient will no longer reach this profile from their account. The account and all hospital records are kept.</p>
      <FormMessage message={formError} />
    </Modal>
  );
}

// ------------------------------------------------------------------ delete the demonstration record
export function DeleteDialog({ open, finalFocus }: DialogProps<'delete'>) {
  const c = usePatient();
  const router = useRouter();
  const demoId = c.record.patient.demoId;
  const [typed, setTyped] = React.useState('');
  const { busy, errors, formError, run } = useSubmit();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await apiSend('DELETE', P(c.id), { confirmDemoId: typed });
      c.close();
      toast('Record deleted.');
      void dropAppCache();
      router.push('/patients');
    });
  };
  return (
    <Modal open={open} onClose={c.close} finalFocus={finalFocus} title={`Permanently delete ${demoId}?`}
      footer={<><Button variant="outline" onClick={c.close}>Cancel</Button><Button type="submit" form="dl-form" variant="destructive-solid" disabled={busy}>{busy ? 'Deleting…' : 'Delete permanently'}</Button></>}>
      <Notice tone="danger" icon={<Trash2 aria-hidden />}>This deletes the record, its schedule, intake and requests for good. To end a hospital stay, use “Record discharge” instead.</Notice>
      <FormErrors errors={errors}>
        <form id="dl-form" onSubmit={submit} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dl-id">Type {demoId} to confirm</Label>
            <Input id="dl-id" name="confirmDemoId" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} aria-invalid={errors.confirmDemoId ? true : undefined} />
            <FieldError name="confirmDemoId" />
          </div>
          <FormMessage message={errors.confirmDemoId ? null : formError} />
        </form>
      </FormErrors>
    </Modal>
  );
}

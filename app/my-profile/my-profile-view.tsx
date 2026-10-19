'use client';
import * as React from 'react';
import Link from 'next/link';
import { Lock, Heart, Activity, HeartPulse, Pencil, Info, Clock } from 'lucide-react';
import { useApi, apiSend, ApiError } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { RequestStatusChip } from '@/components/cb/status';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { SectionFields, SectionSummary, readSection, type Section } from '@/components/forms/profile-sections';
import { FormErrors, scrollToFirstError } from '@/components/forms/errors';
import { RequestDialog, type RequestTarget } from '@/components/patient/request-dialog';
import { PERMISSION_TEXT } from '@/components/patient/helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Record_ = any;
type Editable = Extract<Section, 'preferences' | 'appetite'>;

export function MyProfileView({ pid, initial, reference, openReport, today }: { pid: string; initial: Record_; reference: any; openReport: boolean; today: string }) {
  const key = `/api/patients/${pid}`;
  const { data, error, mutate } = useApi<Record_>(key, initial);
  const rec = data ?? initial;
  const p = rec.patient;
  const discharged = p.status === 'discharged';
  const reports = rec.requests.filter((r: any) => r.clinical);
  const [edit, setEdit] = React.useState<Editable | null>(null);
  const [report, setReport] = React.useState<RequestTarget | null>(null);

  // ?report=1 opens the report dialog once (admitted patients only), then clears the parameter.
  React.useEffect(() => {
    if (!openReport) return;
    window.history.replaceState(null, '', '/my-profile');
    if (!discharged) setReport({ type: 'clinical-change' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHead eyebrow={`${p.demoId} · My food profile`} title="My Food Profile">
        <div className="flex flex-col gap-3 pt-1">
          <Notice tone="info" role="note" icon={<Lock aria-hidden />} title={PERMISSION_TEXT}>
            Your preferences change the order of the options you are offered. They never override your prescribed diet or allergy exclusions.
          </Notice>
          {discharged ? <Notice tone="warn" icon={<Info aria-hidden />}>You have been discharged, so this profile is shown for reference and can no longer be changed here.</Notice> : null}
        </div>
      </PageHead>
      <PageBody>
        {error ? <Notice tone="danger" title="We couldn’t refresh your profile.">{error.message} Check your connection and try again.</Notice> : null}
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card aria-labelledby="pf-pref">
            <CardHeader>
              <CardTitle id="pf-pref" className="flex items-center gap-2"><Heart className="size-5" aria-hidden />My food preferences</CardTitle>
              {discharged ? null : <Button size="sm" className="min-h-10" onClick={() => setEdit('preferences')} aria-label="Update my food preferences"><Pencil aria-hidden />Update</Button>}
            </CardHeader>
            <SectionSummary section="preferences" p={p} reference={reference} />
            <p className="text-sm text-muted-foreground">You can change these yourself at any time.</p>
          </Card>
          <Card aria-labelledby="pf-app">
            <CardHeader>
              <CardTitle id="pf-app" className="flex items-center gap-2"><Activity className="size-5" aria-hidden />My appetite</CardTitle>
              {discharged ? null : <Button size="sm" className="min-h-10" onClick={() => setEdit('appetite')} aria-label="Update my appetite"><Pencil aria-hidden />Update</Button>}
            </CardHeader>
            <SectionSummary section="appetite" p={p} reference={reference} />
            <p className="text-sm text-muted-foreground">If your appetite is low, smaller portions are suggested within your prescribed plan.</p>
          </Card>
          <Card tone="mint" aria-labelledby="pf-diet" className="md:col-span-2">
            <CardHeader>
              <CardTitle id="pf-diet" className="flex items-center gap-2"><Lock className="size-5" aria-hidden />My prescribed diet and allergies</CardTitle>
              {discharged ? null : <Button size="sm" variant="outline" className="min-h-10" onClick={() => setReport({ type: 'clinical-change' })}><HeartPulse aria-hidden />Report a change</Button>}
            </CardHeader>
            <p className="text-sm">Recorded by your care team. Only an authorised admin can change this. If something is wrong or has changed, report it: your nutrition team reviews it, and nothing changes until they do.</p>
            <SectionSummary section="clinical" p={p} reference={reference} />
            {reports.length ? (
              <div className="flex flex-col gap-2 border-t border-sage pt-4">
                <h3 className="text-base">Changes I reported</h3>
                <ul className="flex flex-col gap-2">
                  {reports.map((r: any) => (
                    <li key={r.id} className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-card px-3.5 py-3 text-[.95rem]">
                      <span className="flex flex-wrap items-center gap-2"><RequestStatusChip status={r.status} /><b>{r.reportLabel ?? r.typeLabel}{r.allergenLabel ? `: ${r.allergenLabel}` : ''}</b></span>
                      <span className="min-w-0 break-words">“{r.message}”</span>
                      {r.response
                        ? <span className="text-sm">Response from {r.resolvedBy}: {r.response}</span>
                        : <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" aria-hidden />Waiting for an admin’s review.</span>}
                      <Link href={`/my-requests?id=${encodeURIComponent(r.id)}`} className="inline-flex min-h-10 w-fit items-center text-sm" aria-label={`View report: ${r.reportLabel ?? r.typeLabel}`}>View</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>
      </PageBody>

      <EditDialog pid={pid} section={edit} p={p} reference={reference} onClose={() => setEdit(null)} onSaved={() => mutate()} />
      <RequestDialog pid={pid} target={report} onClose={() => setReport(null)} vocab={reference.vocab} today={today} maxDate={today} defaultDate={today} onSent={() => { void mutate(); }} />
    </>
  );
}

function EditDialog({ pid, section, p, reference, onClose, onSaved }: { pid: string; section: Editable | null; p: any; reference: any; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const last = React.useRef<Editable | null>(null);
  if (section) last.current = section;
  const s = section ?? last.current;
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (section) { setErrors({}); setFormError(null); setBusy(false); } }, [section]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!s) return;
    setBusy(true); setErrors({}); setFormError(null);
    try {
      const res = await apiSend<{ warnings?: string[] }>('PATCH', `/api/patients/${pid}/sections/${s}`, readSection(s, e.currentTarget));
      onClose();
      toast('Saved. Your nutrition team will see your update.');
      for (const w of res.warnings ?? []) toast(w, { tone: 'warn', timeout: 9000 });
      await onSaved();
    } catch (err) {
      const ae = err as ApiError;
      if (Object.keys(ae.errors ?? {}).length) { setErrors(ae.errors); scrollToFirstError(formRef.current); } else setFormError(ae.message);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={Boolean(section)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent wide={s === 'preferences'}>
        <DialogHeader>
          <DialogTitle>{s === 'preferences' ? 'Update my food preferences' : 'Update my appetite'}</DialogTitle>
          <DialogDescription>{s === 'preferences' ? 'Preferences change the order of your options. They never override your diet or allergies.' : 'Tell us how your appetite is now. Portions are suggested within your prescribed plan.'}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {s ? (
            <FormErrors errors={errors}>
              <form id="pf-form" ref={formRef} noValidate onSubmit={submit} key={s} className="flex flex-col gap-4">
                <SectionFields section={s} p={p} reference={reference} />
                {formError ? <p role="alert" className="text-sm font-semibold text-destructive">{formError}</p> : null}
              </form>
            </FormErrors>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
          <Button type="submit" form="pf-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

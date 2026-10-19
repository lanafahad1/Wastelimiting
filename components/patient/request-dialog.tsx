'use client';
// Patient requests to the nutrition team: a different meal, a schedule change,
// support, or a report about allergies or diet (a clinical request that an
// admin reviews before anything changes). After sending, the dialog shows a
// confirmation with the request's status and a link to it in My Requests.
import * as React from 'react';
import Link from 'next/link';
import { useSWRConfig } from 'swr';
import { HeartPulse } from 'lucide-react';
import { apiSend, ApiError } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Textarea, NativeSelect, Label } from '@/components/ui/input';
import { OptionCard } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { SuccessCheck } from '@/components/ui/success-check';
import { RequestStatusChip } from '@/components/cb/status';
import { FormErrors, FieldError } from '@/components/forms/errors';
import { Fieldset } from '@/components/forms/fieldset';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type RequestTarget = { type: string; date?: string | null; period?: string | null };
export type RequestVocab = { periods: { id: string; label: string }[]; requestTypes: { id: string; label: string; clinical?: boolean }[]; reportKinds?: { id: string; label: string }[]; allergens?: { id: string; label: string; hint?: string }[] };

type Sent = { note: string; request: { id: string; status: string } };

export function RequestDialog({ pid, target, onClose, vocab, today, maxDate, defaultDate, onSent }: {
  pid: string; target: RequestTarget | null; onClose: () => void; vocab: RequestVocab; today: string; maxDate: string; defaultDate: string; onSent?: (r: Sent) => void;
}) {
  const { mutate } = useSWRConfig();
  // Keep the last target so the content stays while the dialog animates closed.
  const last = React.useRef<RequestTarget | null>(null);
  if (target) last.current = target;
  const t = target ?? last.current;
  const [sent, setSent] = React.useState<Sent | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [kind, setKind] = React.useState(vocab.reportKinds?.[0]?.id ?? '');
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (target) { setSent(null); setErrors({}); setFormError(null); setBusy(false); setKind(vocab.reportKinds?.[0]?.id ?? ''); }
  }, [target, vocab.reportKinds]);

  const type = vocab.requestTypes.find((x) => x.id === t?.type);
  const clinical = Boolean(type?.clinical);
  const needsSlot = t?.type === 'alternative' || Boolean(t?.period);
  const msgLabel = t?.type === 'alternative' ? 'What would you prefer?' : t?.type === 'schedule-change' ? 'What would you like to change?' : clinical ? 'Tell us more' : 'How can we help?';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!t) return;
    const body = { type: t.type, ...Object.fromEntries(new FormData(e.currentTarget)) };
    setBusy(true); setErrors({}); setFormError(null);
    try {
      const r = await apiSend<Sent>('POST', `/api/patients/${pid}/requests`, body);
      setSent(r);
      onSent?.(r);
      // Refresh every view of this patient's data (my meals, requests, profile).
      void mutate((k) => typeof k === 'string' && k.startsWith(`/api/patients/${pid}`));
    } catch (err) {
      const ae = err as ApiError;
      if (ae.errors && Object.keys(ae.errors).length) {
        setErrors(ae.errors);
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-field-error]')?.scrollIntoView({ block: 'center' }));
      } else setFormError(ae.message);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{clinical ? 'Report a change to my diet or allergies' : type?.label ?? 'Request'}</DialogTitle>
          <DialogDescription>{clinical ? 'Your nutrition team reviews every report before your record changes.' : 'Your message goes to the nutrition team caring for you.'}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <>
            <DialogBody>
              <SuccessCheck />
              <Notice tone="ok" role="status" title={clinical ? 'Report sent' : 'Request sent'}>{sent.note}</Notice>
              <p className="flex flex-wrap items-center gap-2">Status: <RequestStatusChip status={sent.request.status} /></p>
            </DialogBody>
            <DialogFooter>
              <Link href={`/my-requests?id=${encodeURIComponent(sent.request.id)}`} className={buttonVariants({ variant: 'outline' })} onClick={onClose}>{clinical ? 'View my report' : 'View my request'}</Link>
              <DialogClose className={buttonVariants()}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody>
              {clinical ? <Notice tone="rose" icon={<HeartPulse aria-hidden />}>An admin reviews every report before your record changes. If you think you are having an allergic reaction, tell your nurse immediately.</Notice> : null}
              <FormErrors errors={errors}>
                <form id="rq-form" ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
                  {clinical ? (
                    <>
                      <Fieldset legend="What has changed?">
                        <div className="grid gap-2">
                          {(vocab.reportKinds ?? []).map((k) => <OptionCard key={k.id} name="reportKind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} title={k.label} />)}
                        </div>
                        <FieldError name="reportKind" />
                      </Fieldset>
                      {['new-allergy', 'allergy-wrong'].includes(kind) ? (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="cl-alg">Which food? <span className="font-sans text-xs font-normal text-muted-foreground">(optional)</span></Label>
                          <NativeSelect id="cl-alg" name="allergen" defaultValue="" aria-describedby="cl-alg-hint">
                            <option value="">Not one of these / not sure</option>
                            {(vocab.allergens ?? []).map((a) => <option key={a.id} value={a.id}>{a.label}{a.hint ? ` (${a.hint})` : ''}</option>)}
                          </NativeSelect>
                          <span id="cl-alg-hint" className="text-sm text-muted-foreground">If you choose a food for a new allergy, meals containing it are held for your admin to check until they review your report.</span>
                        </div>
                      ) : null}
                    </>
                  ) : needsSlot ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="rq-date">Day</Label>
                        <Input type="date" id="rq-date" name="date" defaultValue={t?.date || defaultDate} min={today} max={maxDate} aria-invalid={errors.date ? true : undefined} />
                        <FieldError name="date" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="rq-period">Meal</Label>
                        <NativeSelect id="rq-period" name="period" defaultValue={t?.period ?? vocab.periods[0]?.id} aria-invalid={errors.period ? true : undefined}>
                          {vocab.periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </NativeSelect>
                        <FieldError name="period" />
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="rq-msg">{msgLabel}</Label>
                    <Textarea id="rq-msg" name="message" maxLength={400} required aria-describedby="rq-hint" aria-invalid={errors.message ? true : undefined}
                      placeholder={clinical ? 'For example: I was told I should avoid sesame.' : undefined} />
                    <span id="rq-hint" className="text-sm text-muted-foreground">Up to 400 characters. The nutrition team will reply here and under My Requests.</span>
                    <FieldError name="message" />
                  </div>
                  {formError ? <p role="alert" className="text-sm font-semibold text-destructive">{formError}</p> : null}
                </form>
              </FormErrors>
            </DialogBody>
            <DialogFooter>
              <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
              <Button type="submit" form="rq-form" disabled={busy}>{busy ? 'Sending…' : clinical ? 'Send to my nutrition team' : 'Send to the nutrition team'}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

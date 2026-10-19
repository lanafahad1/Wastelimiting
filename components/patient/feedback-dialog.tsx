'use client';
// "How was your lunch?": the patient's own report after a meal was delivered
// (delivered does not mean eaten). Uses the shared intake fields (staff=false).
import * as React from 'react';
import { apiSend, ApiError } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { IntakeFields, readIntake } from '@/components/forms/intake-fields';
import { FormErrors, scrollToFirstError } from '@/components/forms/errors';
import { periodLabel, portionLabel } from '@/components/cb/labels';
import { formatDate } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type FeedbackTarget = { date: string; period: string; mealName?: string | null; portion?: string | null; myFeedback?: any };

export function FeedbackDialog({ pid, target, onClose, reference, onSaved }: { pid: string; target: FeedbackTarget | null; onClose: () => void; reference: any; onSaved: () => void | Promise<unknown> }) {
  const last = React.useRef<FeedbackTarget | null>(null);
  if (target) last.current = target;
  const t = target ?? last.current;
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (target) { setErrors({}); setFormError(null); setBusy(false); } }, [target]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError(null);
    try {
      await apiSend('POST', `/api/patients/${pid}/intake`, readIntake(e.currentTarget));
      onClose();
      toast('Thank you. Your feedback was saved.');
      await onSaved();
    } catch (err) {
      const ae = err as ApiError;
      if (Object.keys(ae.errors ?? {}).length) { setErrors(ae.errors); scrollToFirstError(formRef.current); } else setFormError(ae.message);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent wide>
        <DialogHeader>
          <DialogTitle>How was your {t ? periodLabel(t.period).toLowerCase() : 'meal'}?</DialogTitle>
          {t ? <DialogDescription><b className="text-foreground">{t.mealName ?? ''}</b>{t.portion ? ` · ${portionLabel(t.portion)} portion` : ''} · {formatDate(t.date, { weekday: 'long', month: 'short', day: 'numeric' })}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody>
          {t ? (
            <FormErrors errors={errors}>
              <form id="fb-form" ref={formRef} noValidate onSubmit={submit} key={`${t.date}|${t.period}`} className="flex flex-col gap-5">
                <input type="hidden" name="date" value={t.date} />
                <input type="hidden" name="period" value={t.period} />
                <IntakeFields reference={reference} staff={false} initial={t.myFeedback ?? null} />
                {formError ? <p role="alert" className="text-sm font-semibold text-destructive">{formError}</p> : null}
              </form>
            </FormErrors>
          ) : null}
          <p className="text-sm text-muted-foreground">Your answers help the team choose meals you enjoy. They never change your prescribed diet or allergy rules. Staff may also note what they observed; each meal is counted once.</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
          <Button type="submit" form="fb-form" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

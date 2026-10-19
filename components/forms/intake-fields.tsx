'use client';
// Intake and feedback fields shared by the patient's and the staff screens.
// Keeps the four measurements distinct: accepted or refused, the estimated
// amount eaten, the patient's satisfaction and (staff only) weighed waste (g).
import * as React from 'react';
import { OptionCard } from '@/components/ui/field';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Fieldset, Options } from './fieldset';
import { FieldError } from './errors';
import { cn } from '@/lib/utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
type IntakeRecord = { appetiteBefore?: string | null; accepted?: boolean; amount?: string | null; reasons?: string[]; satisfaction?: number | null; comment?: string; measuredWasteG?: number | null } | null;

export function IntakeFields({ reference, staff = false, initial = null }: { reference: any; staff?: boolean; initial?: IntakeRecord }) {
  const v = reference.vocab;
  const [accepted, setAccepted] = React.useState<'yes' | 'no' | ''>(initial ? (initial.accepted ? 'yes' : 'no') : '');
  return (
    <div className="flex flex-col gap-6">
      <Fieldset legend={staff ? 'Appetite before the meal' : 'How was your appetite before the meal?'}>
        <Options>{v.appetite.map((a: any) => <OptionCard key={a.id} name="appetiteBefore" value={a.id} defaultChecked={initial?.appetiteBefore === a.id} title={a.label} />)}</Options>
        <FieldError name="appetiteBefore" />
      </Fieldset>
      <Fieldset legend={staff ? 'Was the meal accepted or refused?' : 'Did you eat the meal?'}>
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionCard name="accepted" value="yes" checked={accepted === 'yes'} onChange={() => setAccepted('yes')} title={staff ? 'Accepted' : 'Yes, I ate some or all of it'} />
          <OptionCard name="accepted" value="no" checked={accepted === 'no'} onChange={() => setAccepted('no')} title={staff ? 'Refused' : 'No, I did not eat it'} />
        </div>
        <FieldError name="accepted" />
      </Fieldset>
      <div className={cn(accepted === 'no' && 'hidden')}>
        <Fieldset legend={staff ? 'Estimated amount eaten (observed, not weighed)' : 'About how much did you eat?'}>
          <Options>{v.intakeAmounts.map((a: any) => <OptionCard key={a.id} name="amount" value={a.id} defaultChecked={initial?.amount === a.id} title={a.label} disabled={accepted === 'no'} />)}</Options>
          <FieldError name="amount" />
        </Fieldset>
      </div>
      <Fieldset legend={staff ? 'Reasons for refusal or leftovers' : 'Why did you leave some or all of it? (choose any)'}>
        <Options>{v.refusalReasons.map((r: any) => <OptionCard key={r.id} type="checkbox" name="reasons" value={r.id} defaultChecked={initial?.reasons?.includes(r.id)} title={r.label} />)}</Options>
        <FieldError name="reasons" />
      </Fieldset>
      <Fieldset legend={staff ? 'Patient’s satisfaction, if the patient told you (optional)' : 'How satisfied were you with the meal? (optional)'}>
        <div role="radiogroup" aria-label="Satisfaction from 1 to 5" className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="satisfaction" value={n} defaultChecked={initial?.satisfaction === n} className="peer sr-only" />
              <span className="grid size-11 place-items-center rounded-full border border-input bg-card font-display font-semibold text-heading peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30">{n}</span>
            </label>
          ))}
          <span className="text-sm text-muted-foreground">1 = very unhappy · 5 = very happy</span>
        </div>
        <FieldError name="satisfaction" />
      </Fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="in-comment">Comment <span className="font-sans text-xs font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="in-comment" name="comment" maxLength={300} defaultValue={initial?.comment ?? ''} />
      </div>
      {staff ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="in-waste">Measured food waste in grams <span className="font-sans text-xs font-normal text-muted-foreground">(optional, weighed by staff)</span></Label>
          <Input id="in-waste" name="measuredWasteG" type="number" min={0} max={3000} inputMode="numeric" defaultValue={initial?.measuredWasteG ?? ''} aria-describedby="in-waste-hint" />
          <span id="in-waste-hint" className="text-sm text-muted-foreground">Weigh the returned plate. This is kept separate from the estimated amount eaten and is never calculated from it.</span>
          <FieldError name="measuredWasteG" />
        </div>
      ) : null}
    </div>
  );
}

/** Read the intake form (date and period come from hidden inputs). */
export function readIntake(form: HTMLFormElement) {
  const fd = new FormData(form);
  const acc = fd.get('accepted');
  const out: Record<string, unknown> = {
    date: fd.get('date'), period: fd.get('period'),
    appetiteBefore: fd.get('appetiteBefore') || null, accepted: acc === 'yes' ? true : acc === 'no' ? false : undefined,
    amount: acc === 'no' ? undefined : fd.get('amount') || undefined, reasons: fd.getAll('reasons'), satisfaction: fd.get('satisfaction') || null, comment: fd.get('comment') || '',
  };
  if (fd.has('measuredWasteG') && fd.get('measuredWasteG') !== '') out.measuredWasteG = fd.get('measuredWasteG');
  return out;
}

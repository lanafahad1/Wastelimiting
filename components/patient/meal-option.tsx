'use client';
// One approved option inside a meal period on My Meals: the shared MealRow
// (patient audience) plus allergens, "Why this meal?" in patient wording, and
// the portion select with "Choose this meal" / "Update my choice".
import * as React from 'react';
import { Info, Check, Sparkles, HeartPulse } from 'lucide-react';
import { MealRow, AllergenLine } from '@/components/cb/meal';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { NativeSelect, Label } from '@/components/ui/input';
import { portionLabel } from '@/components/cb/labels';
import { cn } from '@/lib/utils';
import { you } from './helpers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Option = any;

/** "Why this meal?" from the patient-facing summary the server sends (no rule codes or points). */
export function PatientWhy({ o }: { o: Option }) {
  const w = o.why;
  return (
    <Accordion className="rounded-[14px] border border-sage bg-mint/60" headClassName="min-h-11 px-3.5 py-2.5 font-display text-sm font-semibold text-heading"
      title={<span className="inline-flex items-center gap-2"><Info className="size-4" aria-hidden />Why this meal?</span>}>
      <div className="flex flex-col gap-3 px-3.5 pb-3.5">
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-start gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-heading" /><span>{w.checks.length ? `Fits your recorded diet and allergies: ${w.checks.join(', ').toLowerCase()}.` : 'Checked against your recorded diet, allergies and restrictions.'}</span></li>
          {w.reasons.map((r: string, i: number) => <li key={i} className="flex items-start gap-2"><Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-heading" /><span>{you(r)}</span></li>)}
          {w.reviewed ? <li className="flex items-start gap-2"><HeartPulse aria-hidden className="mt-0.5 size-4 shrink-0 text-heading" /><span>Reviewed by your admin{o.offer.reviewNote ? `: ${o.offer.reviewNote}` : '.'}</span></li> : null}
        </ul>
        <p className="text-xs text-muted-foreground">Approved for you by the nutrition team ({o.offer.approvedByName}). Your preferences change the order of options; they never override your diet or allergies.</p>
      </div>
    </Accordion>
  );
}

export function MealOption({ o, period, date, chosen, chosenPortion, canChoose, busy, onChoose }: {
  o: Option; period: string; date: string; chosen: boolean; chosenPortion?: string | null; canChoose: boolean; busy: boolean; onChoose: (mealId: string, portion: string) => void;
}) {
  const portions: string[] = o.offer.portions;
  const [portion, setPortion] = React.useState<string>((chosen && chosenPortion) || o.offer.suggestedPortion || portions[0]);
  const selectId = `pt-${period}-${o.id}`;
  return (
    // The art keeps its 4:3 shape beside the text on wider screens (no stretched slice).
    <div className={cn('flex flex-col gap-1.5 rounded-[22px] sm:[&_article>div:first-child]:self-start', chosen && 'bg-mint p-1.5 ring-2 ring-heading')}>
      {chosen ? <p className="flex items-center gap-1.5 px-2 pt-1 font-display text-sm font-semibold text-heading"><Check className="size-4" aria-hidden />Your choice</p> : null}
      <MealRow m={o} why={false} audience="patient" href={`/meal/${o.id}?date=${date}&period=${period}`}
        actions={(
          <div className="flex w-full min-w-0 flex-col gap-3">
            {o.description ? <p className="text-sm text-muted-foreground">{o.description}</p> : null}
            <AllergenLine a={o.allergens} />
            <PatientWhy o={o} />
            {canChoose ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                {portions.length > 1 ? (
                  <div className="flex flex-col gap-1.5 sm:min-w-56">
                    <Label htmlFor={selectId}>Portion</Label>
                    <NativeSelect id={selectId} value={portion} onChange={(e) => setPortion(e.target.value)}>
                      {portions.map((p) => <option key={p} value={p}>{portionLabel(p)}{p === o.offer.suggestedPortion ? ' (suggested)' : ''}</option>)}
                    </NativeSelect>
                  </div>
                ) : <span className="text-sm text-muted-foreground sm:pb-3">{portionLabel(portions[0])} portion</span>}
                <Button variant={chosen ? 'outline' : 'default'} disabled={busy} onClick={() => onChoose(o.id, portion)} className="w-full sm:w-auto"
                  aria-label={`${chosen ? 'Update my choice' : 'Choose this meal'}: ${o.name}`}>
                  {chosen ? <Check aria-hidden /> : null}{busy ? 'Sending…' : chosen ? 'Update my choice' : 'Choose this meal'}
                </Button>
              </div>
            ) : null}
          </div>
        )} />
    </div>
  );
}

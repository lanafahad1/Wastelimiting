import * as React from 'react';
import Link from 'next/link';
import { Info, Layers, Leaf, ShieldX, TriangleAlert, Check, Sparkles, ChevronDown, List, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { mealArt } from '@/lib/art.js';
import { ScreenChip } from './status';
import { allergenName } from './labels';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Meal = any;
type Evaluation = any;

/** Generated illustration of a meal (our own SVG; the meal name is escaped). */
export function MealArt({ meal, className, label = false }: { meal: { id: string; name: string; art?: unknown; category?: string }; className?: string; label?: boolean }) {
  return <div className={cn('overflow-hidden rounded-[14px] bg-blush [&>svg]:block [&>svg]:h-full [&>svg]:w-full', className)} dangerouslySetInnerHTML={{ __html: mealArt(meal, { label }) }} />;
}

/** Nutrition summary from SFDA SFCT values; partial totals are marked "≥" and never estimated. */
export function NutriSummary({ n, caption = 'Nutrition', partial = null, missingFrom = [] }: { n?: Record<string, number | null> | null; caption?: string; partial?: Record<string, number | null> | null; missingFrom?: string[] }) {
  const keys: [string, string, string][] = [['kcal', '', 'kcal'], ['protein', 'g', 'protein'], ['carbs', 'g', 'carbohydrate'], ['fiber', 'g', 'fibre'], ['sodium', 'mg', 'sodium']];
  const none = !n || keys.every(([k]) => n[k] == null && partial?.[k] == null);
  if (none) return <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> No nutrition values: no SFDA Saudi Food Composition Table entry for this meal. Never estimated.</p>;
  const isPartial = keys.some(([k]) => n![k] == null && partial?.[k] != null);
  return (
    <div className="flex flex-col gap-1.5">
      <dl aria-label={caption} className="grid grid-cols-5 gap-1 rounded-[12px] bg-blush/70 p-2 text-center">
        {keys.map(([k, unit, name]) => {
          const v = n![k]; const pv = partial?.[k];
          return (
            <div key={k} className="flex flex-col">
              <dd className="order-1 font-display text-sm font-semibold text-heading tabular">{v != null ? `${Math.round(v)}${unit}` : pv != null ? <span title="Partial total">≥{Math.round(pv)}{unit}</span> : '—'}</dd>
              <dt className="order-2 text-[.7rem] text-muted-foreground">{name}</dt>
            </div>
          );
        })}
      </dl>
      {isPartial ? <p className="text-xs text-muted-foreground">≥ = partial total: {missingFrom.length ? `${[...new Set(missingFrom.map((x) => x.replace(/ \(.*\)$/, '')))].join(', ')} ${missingFrom.length === 1 ? 'has' : 'have'} no SFDA values` : 'some dishes have no SFDA values'}. Not estimated.</p> : null}
    </div>
  );
}

/** "Individual dish" or "Complete meal: kabsa + purslane stew". */
export function MealType({ m }: { m: Meal }) {
  if (!m?.components) return null;
  return m.type === 'complete'
    ? <span className="inline-flex items-center gap-1 text-sm text-heading"><Layers className="size-4" aria-hidden />Complete meal: {m.components.map((c: { name: string }) => c.name).join(' + ')}</span>
    : <span className="text-sm text-muted-foreground">Individual dish</span>;
}

export function AllergenLine({ a }: { a: { contains: string[]; mayContain: string[]; labelCheck: string[] } }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span><b>Contains:</b> {a.contains.length ? a.contains.map(allergenName).join(', ') : 'none of the 14 SFDA allergens'}</span>
      {a.mayContain.length ? <span><b>May contain:</b> {a.mayContain.map(allergenName).join(', ')}</span> : null}
      {a.labelCheck.length ? <span className="text-muted-foreground">Kitchen checks labels: {a.labelCheck.join(', ')}</span> : null}
    </div>
  );
}

export function LocalLine({ local = [] }: { local?: (string | { ingredient: string })[] }) {
  if (!local.length) return null;
  return <p className="flex items-center gap-1.5 text-sm text-success"><Leaf className="size-4" aria-hidden /> Local produce (MEWA): {local.map((l) => (typeof l === 'string' ? l : l.ingredient)).join(', ')}</p>;
}

function WhyGroup({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-1.5', className)}><div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{title}</div><ul className="flex flex-col gap-1.5">{children}</ul></div>;
}
function WhyItem({ icon: Icon, children, pts }: { icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; children: React.ReactNode; pts?: number | null }) {
  return <li className="flex items-start gap-2 text-sm"><Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-heading" /><span className="min-w-0 flex-1">{children}</span>{pts ? <span className="text-xs text-muted-foreground tabular">{pts > 0 ? '+' : ''}{pts}</span> : null}</li>;
}

/**
 * "Why This Meal?" built only from the engine's evaluation: exclusions, then
 * review requirements, then ranking. `audience` controls the wording.
 */
export function WhyThisMeal({ ev, open = false, audience = 'staff', reviewNote = null }: { ev: Evaluation; open?: boolean; audience?: 'staff' | 'patient'; reviewNote?: string | null }) {
  if (!ev) return null;
  const staff = audience !== 'patient';
  const passed = ev.checks.filter((c: { status: string }) => c.status === 'pass');
  const title = ev.status === 'excluded' ? 'Why is this meal excluded?' : ev.status === 'review' ? 'Why This Meal? · Needs admin review' : 'Why This Meal?';
  const Icon = ev.status === 'excluded' ? ShieldX : ev.status === 'review' ? TriangleAlert : Info;
  return (
    <Accordion defaultOpen={open} className={cn('rounded-[14px] border', ev.status === 'excluded' ? 'border-[#F3C9D3] bg-destructive-soft/40' : ev.status === 'review' ? 'border-[#F1DFB8] bg-warning-soft/50' : 'border-sage bg-mint/60')}
      headClassName="px-3.5 py-2.5 font-display text-sm font-semibold text-heading"
      title={<span className="inline-flex items-center gap-2"><Icon className="size-4" aria-hidden />{title}</span>}>
      <div className="flex flex-col gap-3 px-3.5 pb-3.5">
        {ev.exclusions.length ? <WhyGroup title="Excluded because">{ev.exclusions.map((x: { message: string; ruleId: string }, i: number) => <WhyItem key={i} icon={ShieldX}>{x.message}{staff ? <span className="text-xs text-muted-foreground"> ({x.ruleId})</span> : null}</WhyItem>)}</WhyGroup> : null}
        {ev.status !== 'excluded' && ev.reviewReasons.length ? (
          <WhyGroup title="Admin review required">
            {ev.reviewReasons.map((x: { message: string; ruleId: string }, i: number) => <WhyItem key={i} icon={TriangleAlert}>{x.message}{staff ? <span className="text-xs text-muted-foreground"> ({x.ruleId})</span> : null}</WhyItem>)}
            {reviewNote ? <li className="text-sm"><b>Admin review note:</b> {reviewNote}</li> : staff ? <li className="text-sm text-muted-foreground">Only an admin can offer or confirm this meal, with a review note.</li> : null}
          </WhyGroup>
        ) : null}
        {passed.length ? <WhyGroup title="Meets the recorded dietary criteria">{passed.map((c: { label: string; detail: string }, i: number) => <WhyItem key={i} icon={Check}><b>{c.label}:</b> {c.detail}</WhyItem>)}</WhyGroup> : null}
        {ev.status !== 'excluded' && ev.reasons.length ? <WhyGroup title={staff ? 'Ranking: preferences, appetite and feedback' : 'Why it suits you'}>{ev.reasons.map((r: { text: string; points: number }, i: number) => <WhyItem key={i} icon={r.points > 0 ? Sparkles : r.points < 0 ? ChevronDown : Info} pts={staff ? r.points : null}>{r.text}</WhyItem>)}</WhyGroup> : null}
        {ev.warnings.length ? <WhyGroup title="Please note">{ev.warnings.map((w: { message: string }, i: number) => <WhyItem key={i} icon={TriangleAlert}>{w.message}</WhyItem>)}</WhyGroup> : null}
        {staff && ev.kitchenInstructions?.length ? <WhyGroup title="Kitchen instructions">{ev.kitchenInstructions.map((k: string, i: number) => <WhyItem key={i} icon={List}>{k}</WhyItem>)}</WhyGroup> : null}
        <p className="text-xs text-muted-foreground">Explanations come from the patient’s recorded information, the documented rules and the meal’s ingredient data. They describe how this meal fits the record, not a health outcome.</p>
      </div>
    </Accordion>
  );
}

/** One meal in a screening list, with optional actions. */
export function MealRow({ m, ev = m.evaluation, actions, why = true, audience = 'staff', reviewNote = null, open = false, href }: { m: Meal; ev?: Evaluation; actions?: React.ReactNode; why?: boolean; audience?: 'staff' | 'patient'; reviewNote?: string | null; open?: boolean; href?: string }) {
  const portion = ev?.portion;
  const n = portion?.nutrition ?? m.nutrition;
  return (
    <article className={cn('flex flex-col gap-3 rounded-[18px] border bg-card p-3 sm:flex-row sm:p-4', ev?.status === 'excluded' ? 'border-[#F3C9D3]' : ev?.status === 'review' ? 'border-[#F1DFB8]' : 'border-border')}>
      <MealArt meal={m} className="aspect-[4/3] w-full shrink-0 self-start sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <h3 className="text-base"><Link href={href ?? `/meal/${m.id}`} className="no-underline hover:underline">{m.name}</Link></h3>
            <span className="text-sm text-muted-foreground">{m.cuisine} · {m.servingSize}{ev?.matchLevel && ev.status === 'eligible' ? <> · <b className="text-heading">{ev.matchLevel}</b></> : null}</span>
          </div>
          {ev ? <ScreenChip status={ev.status} /> : null}
        </div>
        {portion ? <p className="flex items-start gap-1.5 text-sm"><Layers className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden /> {portion.explanation}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <MealType m={m} />
          {m.available === false ? <Badge variant="danger"><X aria-hidden />Unavailable{m.unavailableReason ? `: ${m.unavailableReason}` : ''}</Badge> : null}
          {m.infoStatus === 'pending' ? <Badge variant="warn"><TriangleAlert aria-hidden />Dietary information not yet verified</Badge> : null}
        </div>
        <NutriSummary n={n} caption={portion ? `Nutrition for the ${portion.suggested} portion` : 'Nutrition per standard serving'} partial={portion ? null : m.nutritionPartial} missingFrom={m.nutritionMissingFrom} />
        {why && ev ? <WhyThisMeal ev={ev} audience={audience} reviewNote={reviewNote} open={open} /> : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </article>
  );
}

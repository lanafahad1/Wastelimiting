'use client';
import * as React from 'react';
import Link from 'next/link';
import { List, Check, User, Clock, Layers, RefreshCw, X, TriangleAlert, Activity, ShieldCheck, ShieldX, MessageSquare, Sparkles, OctagonAlert } from 'lucide-react';
import { apiSend, apiPath } from '@/lib/api-client';
import { DateNav } from '@/components/cb/date-nav';
import { EntryChip, Stepper } from '@/components/cb/status';
import { MealRow, MealType } from '@/components/cb/meal';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { amountLabel, portionLabel, roleLabel } from '@/components/cb/labels';
import { todayIso, addDays } from '@/domain/dates.js';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { When, errorText } from './common';
import { usePatient, P, type PatientCtx } from './patient-context';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Per = any;

export function MealsTab() {
  const c = usePatient();
  const { day, date, discharged, record, dayLoading } = c;
  const today = todayIso();
  const [auto, setAuto] = React.useState(false);
  const runAuto = async () => {
    setAuto(true);
    try {
      const r = await apiSend<{ created: unknown[]; flagged: unknown[] }>('POST', P(c.id, '/auto-schedule'), { from: date, days: 3 });
      await c.refresh();
      toast(`${plural(r.created.length, 'meal period')} offered with the top eligible options.${r.flagged.length ? ` ${plural(r.flagged.length, 'period')} flagged for the team (review or no suitable option).` : ''}`, { timeout: 8000 });
    } catch (err) { toast(errorText(err), { tone: 'error' }); } finally { setAuto(false); }
  };
  const jump = (e: React.MouseEvent, period: string) => {
    e.preventDefault();
    const h = document.getElementById(`h-${period}`);
    h?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    h?.focus({ preventScroll: true });
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-card p-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-medium text-heading">Meal day</span>
          <DateNav date={date} onChange={c.setDate} min={addDays(today, -13)} max={addDays(today, 6)} id="pd-date" label="Meal day" />
        </div>
        <div className="flex flex-col gap-0.5 text-sm" aria-live="polite">
          {dayLoading ? <b className="text-heading">Loading meals…</b> : <b className="text-heading">{day.weekday} menu (cycle day {day.cycleDay})</b>}
          <span className="text-muted-foreground">{discharged ? 'Discharged: read-only.' : day.editable ? 'Options can be offered and confirmed for today and the next 6 days.' : 'Past days are read-only.'}</span>
        </div>
        {day.editable && !record.patient.dietOrder.npo && c.can('meal:plan') ? (
          <Button variant="outline" size="sm" onClick={runAuto} disabled={auto || dayLoading} className="w-full sm:w-auto"><Sparkles aria-hidden />{auto ? 'Offering options…' : 'Offer top options for empty periods (3 days)'}</Button>
        ) : null}
      </div>
      <nav aria-label="Meal periods" className="flex flex-wrap gap-2">
        {day.periods.map((per: Per) => (
          <a key={per.period} href={`#period-${per.period}`} onClick={(e) => jump(e, per.period)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold text-foreground no-underline hover:bg-mint">
            {per.label} <EntryChip status={per.npo && !per.entry ? 'npo' : per.entry?.status ?? 'none'} short />
          </a>
        ))}
      </nav>
      <div aria-busy={dayLoading} className={cn('flex flex-col gap-5 transition-opacity', dayLoading && 'opacity-60')}>
        {day.periods.map((per: Per) => <PeriodCard key={per.period} per={per} />)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ actions per stage
function stageActions(per: Per, c: PatientCtx) {
  const { day, date, discharged } = c;
  const e = per.entry;
  const s: string = e?.status ?? 'none';
  const editable = day.editable && !per.npo;
  const fb = { fallback: `h-${per.period}` };
  const openFrom = (d: Parameters<PatientCtx['open']>[0]) => (ev: React.MouseEvent<HTMLElement>) => c.open(d, { from: ev.currentTarget, ...fb });
  const sec = (key: string, text: string, Icon: React.ComponentType<{ 'aria-hidden'?: boolean }>, onClick: (ev: React.MouseEvent<HTMLElement>) => void) => (
    <Button key={key} variant="outline" size="sm" onClick={onClick}><Icon aria-hidden />{text}</Button>
  );
  const intakeTarget = () => ({ date, period: per.period, mealName: e.mealName, portion: e.portion, deliveredAt: e.deliveredAt, existing: per.outcome?.staffRecord ?? null, hasPatientRecord: Boolean(per.outcome?.patientRecord) });
  const intakeBtn = () => (c.can('intake:record') ? (
    <Button className="w-full sm:w-auto" onClick={openFrom({ kind: 'intake', target: intakeTarget() })}><Activity aria-hidden />{per.outcome?.staffRecord ? 'Update staff intake record' : 'Record intake'}</Button>
  ) : null);
  const waiting = (Icon: React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }>, text: string) => <span className="inline-flex items-center gap-1.5 font-display font-semibold text-heading"><Icon className="size-4" aria-hidden />{text}</span>;

  if (!editable) {
    if (s === 'delivered' && !discharged && date >= addDays(todayIso(), -13)) return { primary: intakeBtn(), secondary: [] as React.ReactNode[] };
    return { primary: null, secondary: [] as React.ReactNode[] };
  }
  const secondary: React.ReactNode[] = [];
  let primary: React.ReactNode = null;
  const canOffer = c.can('meal:offer');
  const canConfirm = c.can('meal:confirm');
  const canCancel = c.can('meal:cancel');
  const confirmSec = (text: string, Icon = Check) => (canConfirm ? secondary.push(sec('confirm', text, Icon, openFrom({ kind: 'confirm', period: per.period }))) : null);
  const offerSec = () => (canOffer ? secondary.push(sec('offer', 'Change options', List, openFrom({ kind: 'offer', period: per.period }))) : null);
  const cancelSec = () => (canCancel ? secondary.push(sec('cancel', 'Cancel this meal', X, openFrom(cancelDialog(c, per.period)))) : null);

  if (s === 'none' || s === 'cancelled') {
    if (!per.screening?.noSuitable) {
      if (canOffer) primary = <Button className="w-full sm:w-auto" onClick={openFrom({ kind: 'offer', period: per.period })}><List aria-hidden />Offer options to the patient</Button>;
      confirmSec('Confirm one meal directly');
    }
  } else if (s === 'offered') {
    const canChoose = c.can('meal:choose');
    if (day.linkedAccount) {
      primary = waiting(Clock, 'Waiting for the patient to choose on their screen');
      if (canChoose) secondary.push(sec('select', 'Record the patient’s choice', User, openFrom({ kind: 'select', period: per.period })));
    } else if (canChoose) {
      primary = <Button className="w-full sm:w-auto" onClick={openFrom({ kind: 'select', period: per.period })}><User aria-hidden />Record the patient’s choice</Button>;
    }
    confirmSec('Confirm a meal directly'); offerSec(); cancelSec();
  } else if (s === 'selected') {
    if (canConfirm) primary = <Button className="w-full sm:w-auto" onClick={openFrom({ kind: 'confirm', period: per.period, mealId: e.selectedMealId })}><Check aria-hidden />Confirm {e.mealName}</Button>;
    confirmSec('Confirm a different meal', RefreshCw); offerSec(); cancelSec();
  } else if (s === 'on-hold') {
    if (c.can('meal:resolve-hold')) primary = <Button variant="destructive-solid" className="w-full sm:w-auto" onClick={openFrom({ kind: 'hold', period: per.period })}><TriangleAlert aria-hidden />Review flagged meal</Button>;
  } else if (s === 'confirmed' || s === 'prepared') {
    primary = waiting(s === 'confirmed' ? List : Layers, s === 'confirmed' ? 'Sent to the kitchen' : 'Prepared by the kitchen; waiting for delivery');
    if (canConfirm) secondary.push(sec('replace', 'Replace meal', RefreshCw, openFrom({ kind: 'confirm', period: per.period, replace: true })));
    cancelSec();
  } else if (s === 'delivered') {
    primary = intakeBtn();
  }
  if (e?.openChanges?.length && s !== 'on-hold' && c.can('meal:resolve-hold')) {
    secondary.unshift(sec('reviewed', 'Mark changes as reviewed', Check, openFrom({
      kind: 'reason', title: 'Mark changes as reviewed', intro: 'Confirm you have reviewed the withdrawn options. The current order is unaffected.', label: 'Note (optional)', button: 'Mark as reviewed',
      onSubmit: async (note) => { await apiSend('POST', P(c.id, '/review'), { date, period: per.period, action: 'mark-reviewed', note }); toast('Marked as reviewed.'); },
    })));
  }
  return { primary, secondary };
}

export function cancelDialog(c: PatientCtx, period: string) {
  const label = c.day.periods.find((x: Per) => x.period === period)?.label ?? period;
  return {
    kind: 'reason' as const, title: `Cancel ${label.toLowerCase()}?`,
    intro: 'No meal will be prepared for this period. The order and its history are kept, and the kitchen is alerted if the tray was already on its list.',
    label: 'Reason (kept in the meal history)', button: 'Cancel this meal', danger: true,
    onSubmit: async (note: string) => { await apiSend('POST', P(c.id, '/cancel'), { date: c.date, period, reason: note }); toast('Meal cancelled.'); },
  };
}

// ------------------------------------------------------------------ blocks
export function ChangesBlock({ per }: { per: Per }) {
  const open = per.entry?.openChanges ?? [];
  if (!open.length) return null;
  const hold = per.entry.status === 'on-hold';
  return (
    <Notice tone={hold ? 'danger' : 'warn'} role="alert" icon={hold ? <OctagonAlert aria-hidden /> : <RefreshCw aria-hidden />}
      title={hold ? 'On hold: this meal cannot be confirmed, prepared or delivered until reviewed' : 'Changes to review'}>
      <ul className="flex flex-col gap-1.5">
        {open.map((ch: any) => (
          <li key={ch.id}>
            <b>{ch.causeLabel}:</b> {ch.change}
            {ch.details?.length ? <ul className="list-disc pl-5 text-sm">{ch.details.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul> : null}
            <span className="block text-sm opacity-80"><When iso={ch.at} />{ch.kitchenAffected ? ' · kitchen alerted' : ''}</span>
          </li>
        ))}
      </ul>
    </Notice>
  );
}

function OrderBlock({ per }: { per: Per }) {
  const { id, date } = usePatient();
  const e = per.entry;
  if (!e) return null;
  const m = e.selectedMeal;
  const href = (mealId: string) => apiPath(`/meal/${mealId}`, { patient: id, date, period: per.period });
  const lines: React.ReactNode[] = [];
  if (e.selectedBy) lines.push(<>Chosen by {e.selectedBy} ({roleLabel(e.selectedByRole)})</>);
  if (e.confirmedBy) lines.push(<>{e.confirmMode === 'direct' ? 'Confirmed directly (no patient choice recorded)' : 'Confirmed'} by {e.confirmedBy} ({roleLabel(e.confirmedByRole)}) <When iso={e.confirmedAt} /></>);
  if (e.preparedBy) lines.push(<>Prepared by {e.preparedBy} <When iso={e.preparedAt} /></>);
  if (e.deliveredBy) lines.push(<>Delivered by {e.deliveredBy} <When iso={e.deliveredAt} /></>);
  const settled = ['confirmed', 'prepared', 'delivered'].includes(e.status);
  return (
    <>
      {e.selectedMealId ? (
        <div className={cn('flex flex-col gap-1 rounded-[14px] border px-4 py-3', settled ? 'border-sage bg-success-soft/60' : e.status === 'on-hold' ? 'border-[#F3C9D3] bg-destructive-soft/50' : 'border-border bg-blush/50')}>
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{e.status === 'on-hold' ? `On hold (was ${e.holdFrom})` : e.status === 'selected' ? 'Patient choice, waiting for confirmation' : 'Current order'}</span>
          <b className="font-display text-heading"><Link href={href(e.selectedMealId)}>{e.mealName}</Link></b>
          <span className="flex flex-wrap items-center gap-x-2 text-sm">{m ? <MealType m={m} /> : null}<span>· {portionLabel(e.portion)} portion</span></span>
          {lines.map((l, i) => <span key={i} className="text-sm text-muted-foreground">{l}</span>)}
          {e.replaces ? <span className="text-sm"><b>{e.replaces.outcome === 'cancelled' ? 'Cancelled earlier order' : 'Replaces'}:</b> {e.replaces.mealName} ({e.replaces.portion}, was {e.replaces.status}). The kitchen was alerted.</span> : null}
        </div>
      ) : null}
      {e.status === 'cancelled' ? <p className="text-sm"><b>Cancelled:</b> {e.cancelledReason}</p> : null}
      {e.offers.length && ['offered', 'selected', 'on-hold'].includes(e.status) ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Approved options offered ({e.offers.length})</span>
          <ul className="flex flex-col gap-1">
            {e.offers.map((o: any) => (
              <li key={o.mealId} className="text-sm">
                <Link href={href(o.mealId)}>{o.mealName ?? o.meal?.name ?? o.mealId}</Link>{' '}
                <span className="text-muted-foreground">{o.portions.map(portionLabel).join(' / ')}{o.screenedAs === 'review' ? ` · reviewed by ${o.approvedByName}: “${o.reviewNote}”` : ''}</span>
                {o.mealId === e.selectedMealId ? <> <Badge variant="ok"><Check aria-hidden />chosen</Badge></> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function PeriodCard({ per }: { per: Per }) {
  const c = usePatient();
  const { id, date, day, discharged } = c;
  const e = per.entry;
  const s: string = per.npo && !e ? 'npo' : e?.status ?? 'none';
  const sc = per.screening;
  const { primary, secondary } = stageActions(per, c);
  const showLists = !discharged && sc && !per.npo && ['none', 'offered', 'selected', 'on-hold', 'cancelled'].includes(s);
  const mealHref = (mealId: string) => apiPath(`/meal/${mealId}`, { patient: id, date, period: per.period });
  const o = per.outcome;
  return (
    <section id={`period-${per.period}`} aria-labelledby={`h-${per.period}`} className="flex scroll-mt-24 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 id={`h-${per.period}`} tabIndex={-1} className="text-xl outline-none">{per.label} <span className="font-sans text-sm font-normal text-muted-foreground">around {per.serviceTime}</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          <EntryChip status={s} />
          {sc ? <span className="text-sm text-muted-foreground">{sc.counts.total} on the menu · {sc.counts.eligible} eligible · {sc.counts.review} for review · {sc.counts.excluded} excluded</span> : null}
        </div>
      </div>
      {e && !['on-hold', 'cancelled'].includes(e.status) ? <Stepper status={e.status} compact /> : null}
      {per.npo ? <Notice tone="info">Nothing by mouth (NPO). No meals are recommended, offered or sent to the kitchen.</Notice> : null}
      {sc?.noSuitable && !['confirmed', 'prepared', 'delivered'].includes(s) ? (
        <Notice tone="danger" title="No suitable option on this menu." icon={<ShieldX aria-hidden />}>
          <p>No meal passes screening for this patient. CareBite does not relax the diet order or allergy rules. Arrange an alternative with the kitchen (menu management can add a meal for this date) or review the diet order.</p>
          {day.editable && c.can('request:create') ? (
            <Button variant="outline" size="sm" className="mt-2" onClick={(ev) => c.open({ kind: 'request', prefill: { type: 'alternative', date, period: per.period, message: 'No menu option passes screening. Kitchen alternative needed (requirements not relaxed).' } }, { from: ev.currentTarget, fallback: `h-${per.period}` })}>
              <MessageSquare aria-hidden />Record a request for an alternative
            </Button>
          ) : null}
        </Notice>
      ) : null}
      {sc?.reviewOnly && !sc.noSuitable && ['none', 'cancelled'].includes(s) ? (
        <Notice tone="warn" title="Every option needs admin review.">{sc.review[0]?.evaluation.reviewReasons[0]?.message ?? ''}</Notice>
      ) : null}
      <ChangesBlock per={per} />
      <OrderBlock per={per} />
      {primary || secondary.length ? (
        <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-background p-3">
          {primary ? <div className="flex flex-col sm:flex-row">{primary}</div> : null}
          {secondary.length ? <div role="group" aria-label={`More actions for ${per.label.toLowerCase()}`} className="flex flex-wrap gap-2">{secondary}</div> : null}
        </div>
      ) : null}
      {o ? (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><Activity className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Intake: {o.accepted ? `${amountLabel(o.amount).toLowerCase()} eaten (${o.amountSource === 'staff' ? 'staff observation' : 'patient report'})` : 'refused'}{o.satisfaction ? ` · satisfaction ${o.satisfaction}/5` : ''}{o.measuredWasteG != null ? ` · ${o.measuredWasteG} g weighed waste` : ''}.</span>
        </p>
      ) : null}
      {sc && !per.npo ? (
        <Accordion key={s} defaultOpen={Boolean(showLists && ['none', 'cancelled', 'on-hold'].includes(s))} className="rounded-[14px] border border-border bg-background"
          headClassName="px-4 py-3 font-display text-[.95rem] font-semibold text-heading"
          title={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden />Screening results for this period</span>}>
          <div className="flex flex-col gap-5 px-3 pb-4 sm:px-4">
            {sc.eligible.length ? (
              <div className="flex flex-col gap-2.5">
                <h3 className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" aria-hidden />Eligible, ranked by preferences, appetite and feedback ({sc.eligible.length})</h3>
                {sc.eligible.map((m: any) => <MealRow key={m.id} m={m} href={mealHref(m.id)} />)}
              </div>
            ) : null}
            {sc.review.length ? (
              <div className="flex flex-col gap-2.5">
                <h3 className="flex items-center gap-2 text-base text-warning"><TriangleAlert className="size-4" aria-hidden />Needs admin review before it can be offered ({sc.review.length})</h3>
                {sc.review.map((m: any) => <MealRow key={m.id} m={m} href={mealHref(m.id)} reviewNote={e?.offers.find((x: any) => x.mealId === m.id)?.reviewNote ?? null} />)}
              </div>
            ) : null}
            {sc.excluded.length ? (
              <Accordion className="rounded-[14px] border border-[#F3C9D3] bg-destructive-soft/30" headClassName="px-4 py-3 font-display text-sm font-semibold text-heading"
                title={<span className="inline-flex items-center gap-2"><ShieldX className="size-4" aria-hidden />Excluded for this patient ({sc.excluded.length})</span>}>
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <p className="text-sm text-muted-foreground">Excluded meals can never be offered or confirmed. Preferences do not change this.</p>
                  <ul className="flex flex-col gap-2.5">
                    {sc.excluded.map((m: any) => (
                      <li key={m.id}>
                        <b><Link href={mealHref(m.id)}>{m.name}</Link></b>
                        <ul className="list-disc pl-5">{m.evaluation.exclusions.map((x: any, i: number) => <li key={i} className="text-sm">{x.message} <span className="text-muted-foreground">({x.ruleId})</span></li>)}</ul>
                      </li>
                    ))}
                  </ul>
                </div>
              </Accordion>
            ) : null}
            {sc.unavailable.length ? (
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><X className="mt-0.5 size-4 shrink-0" aria-hidden /> Unavailable today (kitchen): {sc.unavailable.filter(Boolean).map((m: any) => `${m.name}${m.unavailableReason ? ` (${m.unavailableReason})` : ''}`).join(', ')}.</p>
            ) : null}
            {!sc.eligible.length && !sc.review.length && !sc.excluded.length ? <p className="text-sm text-muted-foreground">No meals are on the menu for this period.</p> : null}
          </div>
        </Accordion>
      ) : null}
    </section>
  );
}

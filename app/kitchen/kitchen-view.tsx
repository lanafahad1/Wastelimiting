'use client';
import * as React from 'react';
import Link from 'next/link';
import { Calendar, TriangleAlert, Check, List, FileText, Scale, Leaf, RefreshCw, Info, Undo2 } from 'lucide-react';
import { useApi, apiPath, apiSend } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { DateNav } from '@/components/cb/date-nav';
import { EntryChip } from '@/components/cb/status';
import { DietCodes } from '@/components/cb/diet';
import { Pid, Stat, EmptyState } from '@/components/cb/misc';
import { periodLabel, portionLabel } from '@/components/cb/labels';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { NativeSelect, Label } from '@/components/ui/input';
import { Table, Th, Td } from '@/components/ui/table';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { formatDate, formatLongDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Panel, When } from '@/components/staff/ui';
import { PERIODS } from '@/domain/constants.js';
import { formatGrams } from '@/domain/production.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Kitchen = any;

export function KitchenView({ initial, initialPeriod, permissions }: { initial: Kitchen; initialPeriod: string; permissions: string[] }) {
  const [date, setDate] = React.useState<string>(initial.date);
  const [period, setPeriod] = React.useState(initialPeriod);
  const key = apiPath('/api/kitchen', { date, period });
  const { data, error, isLoading, mutate } = useApi<Kitchen>(key, key === apiPath('/api/kitchen', { date: initial.date, period: initialPeriod }) ? initial : undefined);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [focusTarget, setFocusTarget] = React.useState<string | null>(null);
  const k = data ?? initial;
  const canProgress = permissions.includes('kitchen:progress') && k.canProgress;

  const update = (next: { date?: string; period?: string }) => {
    const d = next.date ?? date; const p = next.period ?? period;
    setDate(d); setPeriod(p);
    window.history.replaceState(null, '', apiPath('/kitchen', { date: d === initial.today ? '' : d, period: p }));
  };

  /** Run a kitchen step, refresh, then move focus to the tray's next action (or the tray). */
  const run = async (id: string, path: string, body: unknown, done: string, focusId: string) => {
    setBusy(id);
    try {
      await apiSend('POST', path, body);
      toast(done);
      await mutate();
    } catch (err) {
      toast((err as Error).message, { tone: 'error', timeout: 9000 });
      await mutate();
    } finally {
      setBusy(null);
      setFocusTarget(focusId);
    }
  };
  // After the refreshed tray renders (and its buttons are enabled again), move focus to its next step.
  React.useEffect(() => {
    if (!focusTarget || busy) return;
    const el = document.getElementById(focusTarget);
    ((el?.querySelector('[data-next]:not(:disabled)') as HTMLElement | null) ?? el)?.focus();
    setFocusTarget(null);
  }, [focusTarget, busy, data]);

  const n = k.notIncluded;
  const count = (s: string) => k.trays.filter((t: any) => t.status === s).length;

  return (
    <>
      <PageHead eyebrow="Hospital kitchen" title="Kitchen Summary" className="max-w-[1320px]">
        <p>{formatLongDate(k.date)}: confirmed meals only, with quantities, portions, dietary instructions and change alerts. Mark each tray prepared, then delivered. Delivered does not mean eaten: intake is recorded separately.</p>
      </PageHead>
      <PageBody className="max-w-[1320px]">
        <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-card p-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-col gap-1.5"><span className="font-display text-sm font-medium text-heading">Service date</span><DateNav date={date} onChange={(d) => update({ date: d })} id="k-date" label="Service date" /></div>
          <div className="flex flex-col gap-1.5 md:w-56">
            <Label htmlFor="k-period">Meal period</Label>
            <NativeSelect id="k-period" value={period} onChange={(e) => update({ period: e.target.value })}>
              <option value="">All periods</option>
              {PERIODS.map((p: { id: string; label: string }) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </NativeSelect>
          </div>
          <Link href={apiPath('/schedule', { date })} className={buttonVariants({ variant: 'outline', size: 'sm' })}><Calendar aria-hidden />Meal schedule</Link>
        </div>
        {error ? <Notice tone="danger" title="We couldn’t load the kitchen summary.">{error.message} Check your connection and try again.</Notice> : null}

        <div aria-busy={isLoading} className="flex flex-col gap-6">
          {k.alerts.length ? (
            <Panel id="k-alerts" icon={TriangleAlert} tone="alert" title={`Changes after confirmation (${k.alerts.length})`}>
              <p className="text-sm">These orders changed after they reached the kitchen list. Acknowledge each one once the team on the line knows.</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {k.alerts.map((a: any) => {
                  const id = `ack-${a.entryId}-${a.changeId}`;
                  return (
                    <li key={id} className={cn('flex flex-col gap-3 rounded-[14px] border bg-card p-3 sm:flex-row sm:items-center sm:justify-between', a.outcome === 'hold' || a.outcome === 'cancelled' ? 'border-[#F3C9D3] border-l-4 border-l-destructive' : 'border-[#F1DFB8] border-l-4 border-l-warning')}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <b className="flex items-start gap-1.5">{a.outcome === 'hold' || a.outcome === 'cancelled' ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden /> : <RefreshCw className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />}{a.instruction}</b>
                        <span className="text-sm">{formatDate(a.date)} · {periodLabel(a.period)} · Ward {a.ward} Bed {a.bed} ({a.demoId}) · {a.cause}: {a.change}</span>
                        <span className="text-sm text-muted-foreground">{a.resolution ? `Outcome: ${a.resolution}` : 'Waiting for the nutrition team to review.'}</span>
                      </div>
                      {permissions.includes('kitchen:progress') ? (
                        <Button size="sm" variant="outline" className="shrink-0" disabled={busy === id} id={id}
                          onClick={() => run(id, `/api/entries/${a.entryId}/changes/${a.changeId}/ack`, {}, 'Alert acknowledged.', 'k-alerts-region')}>
                          <Check aria-hidden />{busy === id ? 'Saving…' : 'Acknowledge'}<span className="sr-only">: {a.instruction}</span>
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ) : null}
          <span id="k-alerts-region" tabIndex={-1} className="sr-only">Kitchen alerts updated.</span>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Stat value={count('confirmed')} label="To prepare" />
            <Stat value={count('prepared')} label="Prepared, to deliver" />
            <Stat value={count('delivered')} label="Delivered" />
            <Stat value={k.trays.filter((t: any) => t.allergyAlerts.length || t.intoleranceAlerts.length).length} label="Trays with allergy or intolerance alerts" />
            <Stat value={k.held.length} label="On hold: do not prepare" tone={k.held.length ? 'danger' : 'default'} />
          </div>
          {n.awaitingConfirmation + n.optionsOffered + n.onHold ? (
            <Notice tone="warn">Not included yet: {n.awaitingConfirmation} choice{n.awaitingConfirmation === 1 ? '' : 's'} waiting for confirmation, {n.optionsOffered} meal period{n.optionsOffered === 1 ? '' : 's'} with options offered, {n.onHold} on hold. Quantities update when the nutrition team confirms. Discharged patients are never listed.</Notice>
          ) : <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Info className="size-4" aria-hidden />Discharged patients are never listed.</p>}
          {k.held.length ? (
            <Notice tone="danger" title="On hold: do not prepare or deliver">
              <ul className="m-0 list-disc pl-5">{k.held.map((h: any) => <li key={h.entryId}>{periodLabel(h.period)} · Ward {h.ward} Bed {h.bed} ({h.demoId}): {h.meal} ({h.portion}, was {h.holdFrom}). {h.reason}</li>)}</ul>
            </Notice>
          ) : null}

          <Panel id="k-prod" icon={List} title="Meal quantities and approved portions">
            {k.production.map((p: any) => (
              <div key={p.period} className="flex flex-col gap-2">
                <h3 className="text-base">{p.label} · {p.trays} tray{p.trays === 1 ? '' : 's'} <span className="font-sans text-sm font-normal text-muted-foreground">({p.toPrepare} to prepare, {p.prepared} prepared, {p.delivered} delivered)</span></h3>
                {p.meals.length ? (
                  <Table caption={`${p.label} quantities`}>
                    <thead><tr><Th scope="col">Meal</Th><Th scope="col" className="text-right">Small (½)</Th><Th scope="col" className="text-right">Regular (1)</Th><Th scope="col" className="text-right">Large (1½)</Th><Th scope="col" className="text-right">Trays</Th><Th scope="col" className="text-right">Standard servings</Th><Th scope="col" className="text-right">Special trays</Th></tr></thead>
                    <tbody>
                      {p.meals.map((m: any) => (
                        <tr key={m.mealId}>
                          <Td className="min-w-44"><Link href={`/meal/${m.mealId}`}>{m.meal}</Link>{m.type === 'complete' ? <><br /><span className="text-xs text-muted-foreground">{m.components.join(' + ')}</span></> : null}</Td>
                          <Td className="text-right tabular">{m.portions.small || '–'}</Td><Td className="text-right tabular">{m.portions.regular || '–'}</Td><Td className="text-right tabular">{m.portions.large || '–'}</Td>
                          <Td className="text-right tabular"><b>{m.trays}</b></Td><Td className="text-right tabular">{m.standardServings}</Td><Td className="text-right tabular">{m.specialTrays || '–'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">No confirmed meals for {p.label.toLowerCase()}.</p>}
              </div>
            ))}
          </Panel>

          <section aria-labelledby="k-trays" className="flex flex-col gap-3">
            <h2 id="k-trays" className="flex items-center gap-2 text-xl"><FileText className="size-5" aria-hidden />Tray tickets</h2>
            <p className="text-sm text-muted-foreground">Only the information needed to prepare and deliver each meal: ward, bed, demonstration ID, diet, allergy alerts and instructions.</p>
            {!canProgress && permissions.includes('kitchen:progress') && k.trays.length ? <p className="text-sm text-muted-foreground">Preparation and delivery can be recorded for today (or late for yesterday) only.</p> : null}
            {k.trays.length ? (
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
                {k.trays.map((t: any) => {
                  const pid = `p-${t.entryId}`; const uid = `u-${t.entryId}`;
                  const trayId = `tray-${t.entryId}`;
                  const alert = t.allergyAlerts.length > 0;
                  return (
                    <article key={t.entryId} id={trayId} tabIndex={-1} aria-label={`${periodLabel(t.period)} tray, Ward ${t.ward} Bed ${t.bed}, ${t.meal}`}
                      className={cn('flex flex-col gap-2 rounded-[16px] border border-t-[5px] border-border bg-card p-3.5 outline-none focus-visible:ring-3 focus-visible:ring-primary/30', alert ? 'border-t-destructive' : 'border-t-sage', t.replaces && 'bg-warning-soft/40')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-blush px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wide text-rose-ink">{periodLabel(t.period)}</span>
                        <span className="text-sm font-bold">Ward {t.ward} · Bed {t.bed}</span>
                      </div>
                      <Pid>{t.demoId}</Pid>
                      {t.replaces ? <p className="flex items-start gap-1.5 text-sm text-warning"><RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden /><span><b>Replacement order</b>: replaces {t.replaces.mealName} ({t.replaces.portion}){t.replaces.status === 'prepared' ? '. That tray was already prepared: do not deliver it.' : '.'}</span></p> : null}
                      <b className="font-display text-base font-semibold text-heading">{t.meal}</b>
                      <span className="text-sm">{portionLabel(t.portion)} portion{t.type === 'complete' ? ` · ${t.components.map((c: any) => `${c.name} ${c.grams} g`).join(' + ')}` : t.components[0] ? ` · ${t.components[0].grams} g` : ''}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EntryChip status={t.status} />
                        {t.preparedAt ? <span className="text-xs text-muted-foreground">prepared <When iso={t.preparedAt} format="time" /></span> : null}
                        {t.deliveredAt ? <span className="text-xs text-muted-foreground">delivered <When iso={t.deliveredAt} format="time" /></span> : null}
                      </div>
                      <DietCodes codes={t.dietCodes} labels={t.dietLabels} />
                      {alert ? <Badge variant="danger" className="w-fit whitespace-normal"><TriangleAlert aria-hidden />Allergy: {t.allergyAlerts.join(', ')}</Badge> : null}
                      {t.intoleranceAlerts.length ? <Badge variant="warn" className="w-fit whitespace-normal">Intolerance: {t.intoleranceAlerts.join(', ')}</Badge> : null}
                      {t.instructions.length ? <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-[.86rem]">{t.instructions.map((x: string) => <li key={x}>{x}</li>)}</ul> : null}
                      {t.versionChanged ? <p className="flex items-start gap-1.5 text-sm text-warning"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />The recipe was updated after this order was confirmed; prepare the current version.</p> : null}
                      {canProgress && ['confirmed', 'prepared', 'delivered'].includes(t.status) ? (
                        <div className="mt-auto flex flex-wrap gap-2 pt-1">
                          {t.status === 'confirmed' ? <Button size="sm" data-next disabled={busy === pid} onClick={() => run(pid, `/api/entries/${t.entryId}/progress`, { to: 'prepared' }, 'Marked prepared.', trayId)}><Check aria-hidden />{busy === pid ? 'Saving…' : 'Mark prepared'}</Button> : null}
                          {t.status === 'prepared' ? <Button size="sm" data-next disabled={busy === pid} onClick={() => run(pid, `/api/entries/${t.entryId}/progress`, { to: 'delivered' }, 'Marked delivered.', trayId)}><Check aria-hidden />{busy === pid ? 'Saving…' : 'Mark delivered'}</Button> : null}
                          {date === k.today && ['prepared', 'delivered'].includes(t.status) ? <Button size="sm" variant="ghost" disabled={busy === uid} onClick={() => run(uid, `/api/entries/${t.entryId}/undo`, {}, 'Step undone.', trayId)}><Undo2 aria-hidden />Undo “{t.statusLabel}”</Button> : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : <EmptyState title="No confirmed meals">Tray tickets appear here when the nutrition team confirms meals for this date.</EmptyState>}
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Panel id="k-ing" icon={Scale} title="Ingredient requirements">
              <p className="text-sm text-muted-foreground">Standard-portion grams × portion factor for confirmed trays. Water is not listed.</p>
              {k.ingredients.groups.length ? k.ingredients.groups.map((c: any) => (
                <div key={c.id} className="flex flex-col gap-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{c.label}</h3>
                  <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
                    {c.items.map((i: any) => (
                      <li key={i.ingredientId} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                        <span>{i.name}{i.labelCheck ? <> <Badge variant="warn">check label</Badge></> : null}</span>
                        <span className="shrink-0 text-right tabular">{formatGrams(i.grams)}{i.optionalGrams ? <span className="text-xs text-muted-foreground"> + {formatGrams(i.optionalGrams)} optional</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )) : <p className="text-muted-foreground">Nothing to prepare yet.</p>}
            </Panel>
            <Panel id="k-local" icon={Leaf} title="Local Saudi produce in these meals" tone="mint">
              <p className="text-sm">Supporting MEWA’s campaigns to choose local produce. National self-sufficiency (production ÷ consumption, 2024):</p>
              {k.local.length ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {k.local.map((l: any) => (
                    <li key={l.group} className="flex items-center justify-between gap-3 rounded-[12px] bg-card px-3 py-2">
                      <span className="min-w-0"><b>{l.label}</b><br /><span className="text-sm text-muted-foreground">{l.ingredients.join(', ')}</span></span>
                      <span className="flex shrink-0 flex-col items-end"><b className="font-display text-lg text-heading tabular">{l.selfSufficiency}%</b><small className="text-xs text-muted-foreground">self-sufficiency {l.year}</small></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No locally produced ingredient groups in the confirmed meals.</p>}
              <p className="text-sm text-muted-foreground">A ratio of 100% or more means national production meets demand; it does not show where a particular product was grown. Sources: {k.localSources.map((s: any, i: number) => <React.Fragment key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer" title={s.publisher}>{s.id}</a>{i < k.localSources.length - 1 ? ', ' : ''}</React.Fragment>)}.</p>
            </Panel>
          </div>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">{k.notes.map((x: string) => <li key={x}>{x}</li>)}</ul>
        </div>
      </PageBody>
    </>
  );
}

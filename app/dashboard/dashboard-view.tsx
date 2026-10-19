'use client';
import * as React from 'react';
import Link from 'next/link';
import { Info, Calendar, TriangleAlert, Activity, ThumbsUp, Scale, MessageSquare, Leaf } from 'lucide-react';
import { useApi, apiPath } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { FlagChips, AppetiteChip } from '@/components/cb/status';
import { Pid } from '@/components/cb/misc';
import { periodLabel } from '@/components/cb/labels';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Accordion } from '@/components/ui/accordion';
import { formatDate, formatLongDate, plural } from '@/lib/format';
import { Panel, KpiTile, KpiRow } from '@/components/staff/ui';
import { Figure, Legend, LineChart, ColumnChart, HBarChart, StackedChart, VIZ, type Series } from '@/components/staff/charts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Dashboard = any;

// Ordinal ramp (one hue, light → dark), validated with the dataviz palette checker.
const STATES: Series[] = [
  { key: 'none', label: 'Not scheduled', color: VIZ.o1 },
  { key: 'offered', label: 'Options offered', color: VIZ.o2 },
  { key: 'selected', label: 'Choice submitted', color: VIZ.o3, ink: 'light' },
  { key: 'confirmedPlus', label: 'Confirmed, prepared or delivered', color: VIZ.o4, ink: 'light' },
];
const pct = (v: number) => `${Math.round(v)}%`;

function AttentionList({ children }: { children: React.ReactNode }) {
  return <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">{children}</ul>;
}
function AttentionItem({ children }: { children: React.ReactNode }) {
  return <li className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">{children}</li>;
}

export function DashboardView({ initial, requestedDate }: { initial: Dashboard; requestedDate: string | null }) {
  const key = apiPath('/api/dashboard', { date: requestedDate });
  const { data, error } = useApi<Dashboard>(key, initial);
  const d = data ?? initial;
  const t = d.today;
  const w = d.week;
  const byPeriod = t.byPeriod.map((p: any) => ({ ...p, confirmedPlus: p.confirmed + p.prepared + p.delivered }));
  const range = `${formatDate(w.from, { month: 'short', day: 'numeric' })}–${formatDate(w.to, { month: 'short', day: 'numeric' })}`;
  const days = d.trends.map((x: any) => ({ ...x, label: formatDate(x.date, { weekday: 'long', month: 'short', day: 'numeric' }), short: formatDate(x.date, { weekday: 'short' }) }));
  const wmax = Math.max(100, ...days.map((x: any) => x.measuredWasteG ?? 0));
  const [generated, setGenerated] = React.useState<string>('');
  React.useEffect(() => { setGenerated(new Date(d.generatedAt).toLocaleString()); }, [d.generatedAt]);

  return (
    <>
      <PageHead eyebrow="Hospital nutrition team" title="Nutrition Team Dashboard" className="max-w-[1320px]">
        <p>Today’s meal workflow, changes waiting for review, appetite and refusal, and acceptance, satisfaction and waste for the last 7 days ({range}).</p>
      </PageHead>
      <PageBody className="max-w-[1320px]">
        {error ? <Notice tone="danger" title="We couldn’t refresh the dashboard.">{error.message} The figures below may be out of date. Check your connection and try again.</Notice> : null}
        <Notice tone="info" title="Indicators for review" role="note">{d.notice}</Notice>
        {requestedDate && requestedDate !== w.to ? <p className="text-sm text-muted-foreground">Meal workflow for {formatLongDate(d.date)}. The 7-day trends always end today.</p> : null}

        <KpiRow>
          <KpiTile label="Meal periods confirmed today" value={t.confirmed} of={`of ${t.mealPeriods}`} sub={`${t.delivered} delivered · ${t.fed} patients receiving meals · ${t.npo} NPO`} />
          <KpiTile label="Waiting on the patient or the team" value={t.awaitingChoice + t.awaitingConfirmation} sub={`${t.awaitingChoice} options offered · ${t.awaitingConfirmation} choices to confirm`} />
          <KpiTile tone="danger" href="/patients?filter=hold" label="Meals on hold or changed" value={d.counts.hold} sub={`patients · ${t.hold} meal period${t.hold === 1 ? '' : 's'} on hold today`} />
          <KpiTile tone="warn" href="/patients?filter=review" label="Patients needing admin review" value={d.counts.review} sub={`${plural(d.awaitingReview.length, 'meal period')} with review-only options`} />
          <KpiTile tone="danger" href="/patients?filter=no-options" label="No suitable options" value={d.counts.noOptions} sub="patients" />
          <KpiTile href="/requests" label="Pending patient requests" value={d.requests.open} sub={`${d.requests.clinical} about allergies or diet`} />
        </KpiRow>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <Panel id="sel-h" icon={Calendar} title="Today’s meal selections" className="lg:col-span-7"
            action={<Link href={apiPath('/schedule', { date: requestedDate })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Meal schedule</Link>}>
            <Figure title="Meal periods by selection status"
              caption={`Patients receiving meals, ${formatLongDate(d.date)}. Meal periods on hold or cancelled are listed in the table.`}
              legend={<Legend series={STATES} />}
              headers={['Meal period', ...STATES.map((s) => s.label), 'On hold', 'Cancelled']}
              rows={byPeriod.map((p: any) => [p.label, p.none, p.offered, p.selected, p.confirmedPlus, p.hold, p.cancelled])}>
              <StackedChart unit="Meal periods" series={STATES} rows={byPeriod.map((p: any) => ({ label: p.label, segments: Object.fromEntries(STATES.map((s) => [s.key, p[s.key]])) }))} />
            </Figure>
          </Panel>

          <Panel id="att-h" icon={TriangleAlert} title="Changes after an order" className="lg:col-span-5">
            {d.changes.length ? (
              <AttentionList>
                {d.changes.map((c: any) => (
                  <AttentionItem key={`${c.entryId}-${c.id}`}>
                    <Link href={`/patients/${c.patientId}?date=${c.date}`} className="font-semibold">{periodLabel(c.period)} {formatDate(c.date)}: {c.mealName ?? 'offered options'}</Link>
                    <span className="text-sm">{c.causeLabel}: {c.change}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {c.entryStatus === 'on-hold' ? <Badge variant="danger"><TriangleAlert aria-hidden />On hold</Badge> : <Badge variant="warn">Not reviewed</Badge>}
                      {c.kitchenAffected ? <Badge variant="outline">{c.kitchenAck ? 'Kitchen acknowledged' : 'Kitchen alerted'}</Badge> : null}
                    </span>
                  </AttentionItem>
                ))}
              </AttentionList>
            ) : <p className="text-muted-foreground">No changes waiting for review.</p>}
            {d.attention.length ? (
              <>
                <h3 className="mt-1 text-base">Patients needing review</h3>
                <AttentionList>
                  {d.attention.map((a: any) => (
                    <AttentionItem key={a.id}>
                      <Link href={`/patients/${a.id}`} className="font-semibold"><Pid>{a.demoId}</Pid> {a.preferredName}</Link>
                      <span className="text-sm text-muted-foreground">Ward {a.ward} · Bed {a.bed}</span>
                      <FlagChips flags={a.flags} />
                    </AttentionItem>
                  ))}
                </AttentionList>
              </>
            ) : null}
          </Panel>

          <Panel id="app-h" icon={Activity} title="Low appetite or repeated refusal" className="lg:col-span-5">
            {d.intakeConcerns.length ? (
              <AttentionList>
                {d.intakeConcerns.map((a: any) => (
                  <AttentionItem key={a.id}>
                    <Link href={`/patients/${a.id}?tab=intake`} className="font-semibold"><Pid>{a.demoId}</Pid> {a.preferredName}</Link>
                    <span className="text-sm text-muted-foreground">Ward {a.ward} · Bed {a.bed}</span>
                    <span className="flex flex-wrap gap-1.5"><AppetiteChip level={a.appetite} /><FlagChips flags={a.flags} /></span>
                  </AttentionItem>
                ))}
              </AttentionList>
            ) : <p className="text-muted-foreground">No patients flagged.</p>}
            <p className="text-sm text-muted-foreground">Flags: 2 or more refusals, or 3 or more meals with none or some eaten, among the last 6 recorded meals (prototype thresholds for prompting review).</p>
            <dl className="grid grid-cols-3 gap-2" aria-label="Admitted patients by appetite">
              {d.appetite.map((a: any) => (
                <div key={a.id} className="flex flex-col rounded-[14px] border border-border bg-background px-3 py-2">
                  <dd className="order-1 font-display text-xl font-semibold text-heading tabular">{a.count}</dd>
                  <dt className="order-2 text-xs text-muted-foreground">{a.label}</dt>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel id="acc-h" icon={ThumbsUp} title="Meal acceptance and satisfaction" className="lg:col-span-7"
            action={<span className="text-sm text-muted-foreground">{w.recorded} meals with intake, {range}</span>}>
            <Accordion className="rounded-[14px] border border-border bg-background/60" headClassName="min-h-11 px-3.5 py-2.5 font-display text-sm font-medium text-heading"
              title={<span className="inline-flex items-center gap-2"><Info className="size-4" aria-hidden />How meals are counted ({w.records} records → {w.recorded} meals)</span>}>
              <div className="flex flex-col gap-2 px-3.5 pb-3.5 text-sm">
                <ul className="m-0 list-disc pl-5">{d.outcomeRule.map((x: string) => <li key={x}>{x}</li>)}</ul>
                <p>Last 7 days: {w.both} meals recorded by both the patient and staff, {w.patientOnly} by the patient only, {w.staffOnly} by staff only. {w.notRecorded ? `${w.notRecorded} delivered meal${w.notRecorded === 1 ? ' has' : 's have'} no intake record yet (missing data, not counted).` : 'Every delivered meal has an intake record.'}</p>
              </div>
            </Accordion>
            <KpiRow>
              <KpiTile label="Meals accepted (7 days)" value={w.acceptanceRate == null ? '—' : pct(w.acceptanceRate)} sub={`of ${w.recorded} meals with intake`} />
              <KpiTile label="Mean satisfaction (1–5)" value={w.satisfaction ?? '—'} of="/ 5" sub={`${w.rated} meals rated`} />
            </KpiRow>
            <div className="grid gap-5 xl:grid-cols-2">
              <Figure title="Meals accepted (% of meals with intake)" caption="Per day, admitted patients. Each meal counted once. Days without records show a gap."
                headers={['Day', 'Meals recorded', 'Accepted', 'Accepted %']} rows={days.map((x: any) => [x.label, x.recorded, x.accepted, x.acceptanceRate == null ? '—' : `${x.acceptanceRate}%`])}>
                <LineChart unit="Accepted" yMax={100} fmt={pct} points={days.map((x: any) => ({ label: x.label, short: x.short, value: x.acceptanceRate, detail: `${x.accepted} of ${x.recorded} meals` }))} />
              </Figure>
              <Figure title="Mean satisfaction (scale 1–5)" caption="Per day, meals with a rating (patient’s own rating first)."
                headers={['Day', 'Ratings', 'Mean']} rows={days.map((x: any) => [x.label, x.rated, x.satisfaction ?? '—'])}>
                <LineChart unit="Mean satisfaction" yMax={5} ticks={5} fmt={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} points={days.map((x: any) => ({ label: x.label, short: x.short, value: x.satisfaction, detail: `${x.rated} ratings` }))} />
              </Figure>
            </div>
          </Panel>

          <Panel id="waste-h" icon={Scale} title="Leftovers: estimated and measured, kept separate" className="lg:col-span-12">
            <p className="text-sm"><b>Estimated leftovers</b> come from how much was eaten as estimated by staff or reported by the patient (none, some, most, all); they are an estimate, not a weight. <b>Measured food waste</b> is plate waste weighed by staff in grams, recorded only for some trays. They are different measurements and are never combined or converted into each other.</p>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><Leaf className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span>Tracking plate waste supports the National Program to Reduce Food Loss and Waste led by the General Food Security Authority (GFSA). <Link href="/diets?section=waste">About GFSA and food waste</Link></span></p>
            <KpiRow>
              <KpiTile label="Estimated leftovers (7 days)" value={w.estimatedLeftoverShare == null ? '—' : pct(w.estimatedLeftoverShare)} sub="average share of the portion not eaten (estimate)" />
              <KpiTile label="Measured plate waste (7 days)" value={w.measuredWasteG == null ? '—' : `${(w.measuredWasteG / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`} sub={`total weight from ${plural(w.measuredTrays, 'weighed tray')} only; other trays were not weighed`} />
            </KpiRow>
            <div className="grid gap-5 lg:grid-cols-2">
              <Figure title="Estimated leftovers (% of portion, estimate)" caption="Per day: average share of the served portion not eaten, from estimates. Not a weight."
                headers={['Day', 'Meals with intake', 'None eaten', 'Some', 'Most', 'All', 'Estimated leftovers']}
                rows={days.map((x: any) => [x.label, x.recorded, x.amounts.none, x.amounts.some, x.amounts.most, x.amounts.all, x.estimatedLeftoverShare == null ? 'no data' : `${x.estimatedLeftoverShare}%`])}>
                <LineChart unit="Estimated leftovers" yMax={100} fmt={pct} points={days.map((x: any) => ({ label: x.label, short: x.short, value: x.estimatedLeftoverShare, detail: `${x.recorded} meals with intake` }))} />
              </Figure>
              <Figure title="Measured food waste (grams, weighed)" caption="Per day: total grams from weighed trays only. A day without weighing shows no bar (no data, not zero)."
                headers={['Day', 'Trays weighed', 'Total measured waste']} rows={days.map((x: any) => [x.label, x.measuredTrays, x.measuredWasteG == null ? 'not measured' : `${x.measuredWasteG} g`])}>
                <ColumnChart unit="Measured waste" color={VIZ.c2} yMax={Math.ceil(wmax / 100) * 100} fmt={(v) => `${Math.round(v)} g`}
                  points={days.map((x: any) => ({ label: x.label, short: x.short, value: x.measuredWasteG, detail: `${x.measuredTrays} tray${x.measuredTrays === 1 ? '' : 's'} weighed` }))} />
              </Figure>
            </div>
          </Panel>

          <Panel id="rs-h" icon={MessageSquare} title="Reasons given for refusal or leftovers" className="lg:col-span-12" action={<span className="text-sm text-muted-foreground">last 7 days</span>}>
            {w.reasons.length ? (
              <Figure title="Times each reason was given" caption="A meal can have more than one reason." headers={['Reason', 'Times given']} rows={w.reasons.map((r: any) => [r.label, r.count])}>
                <HBarChart unit="Times given" fmt={(v) => String(v)} items={[...w.reasons].sort((a: any, b: any) => b.count - a.count).map((r: any) => ({ label: r.label, value: r.count }))} />
              </Figure>
            ) : <p className="text-muted-foreground">No reasons recorded.</p>}
          </Panel>
        </div>
        <p className="text-sm text-muted-foreground">Generated {generated || d.generatedAt.slice(0, 16).replace('T', ' ')}. {periodLabel('breakfast')}, lunch, dinner and snack are counted as separate meal periods.</p>
      </PageBody>
    </>
  );
}

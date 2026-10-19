'use client';
import * as React from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, X, TriangleAlert, Info } from 'lucide-react';
import { useApi, apiPath } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { DateNav } from '@/components/cb/date-nav';
import { DietNames } from '@/components/cb/diet';
import { AllergyChips, AppetiteChip, FlagChips, PeriodStrip } from '@/components/cb/status';
import { PatientHeader, EmptyState } from '@/components/cb/misc';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, NativeSelect, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { WARDS } from '@/domain/constants.js';
import { todayIso, addDays } from '@/domain/dates.js';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CellLabel, FreshCache } from './common';
import { FILTERS } from './filters';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Overview = any;
type Row = any;

// One filtering system: a single "Show" control (with counts), plus admission status, date, ward and search.
const match = (row: Row, f: string) => {
  const codes: string[] = row.flags.map((x: { code: string }) => x.code);
  if (f === 'all') return true;
  if (f === 'attention') return codes.some((c) => ['hold', 'changes', 'review', 'no-options', 'refusal', 'low-intake'].includes(c));
  if (f === 'hold') return codes.includes('hold') || codes.includes('changes');
  if (f === 'intake') return codes.includes('refusal') || codes.includes('low-intake');
  return codes.includes(f);
};

type Query = { date: string; ward: string; include: 'admitted' | 'discharged'; filter: string; q: string };

type ViewProps = { initial: Overview; initialQuery: Query; canCreate: boolean };

/** Patient Overview. A page-scoped SWR cache means the server's data is always the starting point. */
export function PatientsView(props: ViewProps) {
  return <FreshCache><OverviewList {...props} /></FreshCache>;
}

function OverviewList({ initial, initialQuery, canCreate }: ViewProps) {
  const [query, setQueryState] = React.useState<Query>(initialQuery);
  const { date, ward, include, filter, q } = query;
  const key = apiPath('/api/patients', { date, include, ward });
  const initialKey = apiPath('/api/patients', { date: initialQuery.date, include: initialQuery.include, ward: initialQuery.ward });
  const { data, error, isValidating } = useApi<Overview>(key, key === initialKey ? initial : undefined);
  const d = data ?? initial;
  const loadingOther = isValidating && (d.date !== date || d.include !== include);

  const setQuery = (next: Partial<Query>) => {
    const merged = { ...query, ...next };
    setQueryState(merged);
    window.history.replaceState(null, '', apiPath('/patients', {
      date: merged.date === todayIso() ? '' : merged.date, ward: merged.ward, include: merged.include === 'admitted' ? '' : merged.include,
      filter: merged.filter === 'all' ? '' : merged.filter, q: merged.q,
    }));
  };

  const term = q.trim().toLowerCase();
  const rows: Row[] = d.patients.filter((r: Row) => match(r, filter) && (!term || `${r.demoId} ${r.preferredName} ${r.bed} ${r.wardLabel}`.toLowerCase().includes(term)));
  const c = d.counts;
  const today = todayIso();

  return (
    <>
      <PageHead eyebrow="Hospital nutrition team" title="Patient Overview"
        actions={canCreate ? <Link href="/patients/new" className={buttonVariants({ className: 'w-full sm:w-auto' })}><Plus aria-hidden />New patient profile</Link> : null}>
        <p>Prescribed diets, recorded allergies, appetite and meal status. Patients whose meals are on hold, need review or have no suitable option are listed first.</p>
      </PageHead>
      <PageBody>
        <div className="grid gap-4 rounded-[20px] border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,.8fr)_auto_minmax(11rem,.9fr)_minmax(12rem,1fr)] lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-show">Show</Label>
            <NativeSelect id="pt-show" value={filter} onChange={(e) => setQuery({ filter: e.target.value })}>
              {FILTERS.map(([f, l, k]) => <option key={f} value={f}>{l} ({c[k] ?? 0})</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-adm">Admission status</Label>
            <NativeSelect id="pt-adm" value={include} onChange={(e) => setQuery({ include: e.target.value as Query['include'], filter: 'all' })}>
              <option value="admitted">Admitted ({d.admitted})</option>
              <option value="discharged">Discharged ({d.discharged})</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <span className="font-display text-sm font-medium text-heading">Date</span>
            <DateNav date={date} onChange={(x) => setQuery({ date: x })} min={addDays(today, -13)} max={addDays(today, 6)} id="pt-date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-ward">Ward</Label>
            <NativeSelect id="pt-ward" value={ward} onChange={(e) => setQuery({ ward: e.target.value })}>
              <option value="">All wards</option>
              {WARDS.map((w: { id: string; label: string }) => <option key={w.id} value={w.id}>{w.label}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-q">Find a patient</Label>
            <Input id="pt-q" type="search" placeholder="CB-1001, name or bed" value={q} onChange={(e) => setQuery({ q: e.target.value })} autoComplete="off" />
          </div>
        </div>

        {error ? <Notice tone="danger" title="We couldn’t load the patient list.">{error.message} Check your connection and try again.</Notice> : null}

        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p aria-live="polite">{loadingOther ? 'Loading patients…' : `${plural(rows.length, 'patient')} shown`}</p>
          <p>Meal periods: B breakfast, L lunch, D dinner, S snack. Each shows its status in words; tap a diet code to see what it means.</p>
        </div>

        <div aria-busy={loadingOther} className={cn('transition-opacity', loadingOther && 'opacity-60')}>
          {rows.length ? (
            <ul aria-label="Patients" className="flex flex-col gap-2.5">
              {rows.map((r: Row) => <PatientRow key={r.id} r={r} date={d.date} isToday={d.date === today} />)}
            </ul>
          ) : (
            <EmptyState title="No patients match" action={<Button variant="outline" onClick={() => setQuery({ filter: 'all', q: '', ward: '' })}>Clear filters</Button>}>
              <p>{q ? `Nobody matches “${q}”. ` : ''}Try “All”, another ward, or {include === 'admitted' ? 'the discharged list' : 'the admitted list'}.</p>
            </EmptyState>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Flags are prompts for the nutrition team. They come from the patient record, today’s menu screening, changes after an order and recorded intake, and never change a diet order automatically.</p>
      </PageBody>
    </>
  );
}

function PatientRow({ r, date, isToday }: { r: Row; date: string; isToday: boolean }) {
  const flagged = r.flags.some((f: { code: string }) => ['review', 'no-options', 'hold'].includes(f.code));
  return (
    <li className={cn(
      'grid grid-cols-2 gap-x-4 gap-y-3 rounded-[18px] border border-border bg-card p-4 [&>div]:flex [&>div]:min-w-0 [&>div]:flex-col [&>div]:gap-1',
      'md:grid-cols-3 xl:grid-cols-[minmax(150px,1fr)_minmax(180px,1.3fr)_minmax(150px,1.1fr)_auto_auto_minmax(150px,1.1fr)_auto] xl:items-center',
      flagged && 'border-l-[5px] border-l-[#E2A7B6]',
    )}>
      <div className="col-span-2 md:col-span-1">
        <PatientHeader b={r} link={false} />
        {r.status === 'discharged' ? <Badge variant="outline" className="w-fit"><X aria-hidden />Discharged {r.dischargedOn ?? ''}</Badge> : null}
      </div>
      <div>
        <CellLabel>Diet</CellLabel>
        <DietNames codes={r.dietCodes} labels={r.dietLabels} />
        {r.textureLevel ? <span className="text-sm text-muted-foreground">{r.textureLevel}</span> : null}
      </div>
      <div>
        <CellLabel>Allergies</CellLabel>
        <AllergyChips b={r} />
        {r.reportedAllergies?.length ? <Badge variant="warn" className="w-fit whitespace-normal"><TriangleAlert aria-hidden />Reported: {r.reportedAllergies.join(', ')} (pending)</Badge> : null}
      </div>
      <div>
        <CellLabel>Appetite</CellLabel>
        <span><AppetiteChip level={r.appetite} /></span>
      </div>
      <div>
        <CellLabel>{isToday ? 'Today' : 'Meals'}</CellLabel>
        <PeriodStrip periods={r.periods} />
      </div>
      <div className="col-span-2 md:col-span-1">
        <CellLabel>Flags</CellLabel>
        {r.flags.length ? <FlagChips flags={r.flags} /> : <span className="text-sm text-muted-foreground">No flags</span>}
      </div>
      <div className="col-span-2 md:col-span-3 md:items-end xl:col-span-1">
        <Link href={apiPath(`/patients/${r.id}`, { date })} aria-label={`Open ${r.demoId}${r.preferredName ? ` (${r.preferredName})` : ''}`}
          className={buttonVariants({ variant: 'outline', className: 'w-full md:w-auto' })}>
          Open<ChevronRight aria-hidden />
        </Link>
      </div>
    </li>
  );
}

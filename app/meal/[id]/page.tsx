import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Scale, Layers, Check, X, Shield, TriangleAlert, Leaf, List } from 'lucide-react';
import { publicMetadata } from '@/components/public/seo';
import { SITE_URL } from '@/lib/site';
import { serviceCall, publicCall, param } from '@/lib/server/data';
import { getActor } from '@/lib/server/session';
import { withQuery } from '@/components/public/url';
import { isoDate, formatDate } from '@/lib/format';
import { MealArt, WhyThisMeal } from '@/components/cb/meal';
import { ScreenChip } from '@/components/cb/status';
import { periodLabel, portionLabel, allergenName } from '@/components/cb/labels';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/notice';
import { Accordion } from '@/components/ui/accordion';
import { Table, Th, Td } from '@/components/ui/table';
import { Panel, ExtLink } from '@/components/public/blocks';
import { CompatChip, type Compat } from '@/components/public/compat';
import { JsonLd } from '@/components/public/json-ld';
import { PERIODS, PORTIONS } from '@/domain/constants.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The public view of a meal (no patient), shared by metadata and the page. */
const loadPublic = cache(async (id: string) => publicCall((s) => s.getMealDetail(null, id, {})));

const fmt = (v: number | null | undefined, d: number) => (v == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }));
const FRACTION: Record<number, string> = { 0.5: '½', 1: '1', 1.5: '1½' };

function describe(m: any) {
  const kind = m.type === 'complete' ? `Complete meal: ${m.components.map((c: { name: string }) => c.name).join(' + ')}.` : 'Individual dish.';
  return `${m.description ? `${m.description} ` : ''}${kind} Ingredients, portions, nutrition (SFDA values where they exist), the 14 SFDA allergens and fit with each hospital diet category.`.slice(0, 300);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const { meal } = await loadPublic(id);
  // Patient-specific views are private; the canonical page is the public one.
  return publicMetadata({ title: meal.name, description: describe(meal), path: `/meal/${meal.id}`, noindex: Boolean(param(sp.patient)) });
}

export default async function MealPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const signedIn = await getActor();
  const actor = signedIn && signedIn.status === 'active' ? signedIn : null;
  const role = actor?.role ?? null;
  const staff = role === 'admin' || role === 'staff';
  const period = PERIODS.some((p: { id: string }) => p.id === param(sp.period)) ? param(sp.period)! : null;
  const date = isoDate(param(sp.date));
  const patientId = role === 'patient' ? actor!.patientId : staff ? param(sp.patient) ?? null : null;
  const d = actor ? await serviceCall((s) => s.getMealDetail(actor, id, { patientId, date, period })) : await loadPublic(id);

  const m = d.meal;
  const n = m.nutrition;
  const portions: string[] = m.portions;
  const complete = m.type === 'complete';
  const ev = d.evaluation;
  const back: [string, string] = d.patient && role !== 'patient'
    ? [withQuery(`/patients/${d.patient.id}`, { date }), `Back to ${d.patient.demoId}`]
    : role === 'patient' ? [withQuery('/my-meals', { date, period }), 'My meals']
      : [withQuery('/menu', { date, period }), 'Hospital menu'];
  const cell = (row: any, key: string, decimals: number) => (row.complete[key] != null ? fmt(row.complete[key], decimals) : row.partial[key] != null ? `≥ ${fmt(row.partial[key], decimals)}` : '—');
  const factors = portions.map((p) => FRACTION[(PORTIONS as { id: string; factor: number }[]).find((x) => x.id === p)?.factor ?? 1] ?? '1');

  // Structured data: a menu item with nutrition only when every dish has SFDA values (never estimated or partial).
  const url = `${SITE_URL}/meal/${m.id}`;
  const ps = n.perServing ?? {};
  const g = (k: string, unit: string) => (ps[k] != null ? `${ps[k]} ${unit}` : undefined);
  const nutrition = n.allAvailable && ps.kcal != null ? {
    '@type': 'NutritionInformation', servingSize: m.servingSize, calories: g('kcal', 'kcal'), proteinContent: g('protein', 'g'), carbohydrateContent: g('carbs', 'g'),
    fiberContent: g('fiber', 'g'), sugarContent: g('sugar', 'g'), fatContent: g('fat', 'g'), saturatedFatContent: g('satFat', 'g'), cholesterolContent: g('cholesterol', 'mg'), sodiumContent: g('sodium', 'mg'),
  } : undefined;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'MenuItem', '@id': `${url}#meal`, name: m.name, url, description: m.description || undefined, ...(nutrition ? { nutrition } : {}) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Hospital Meal Menu', item: `${SITE_URL}/menu` },
        { '@type': 'ListItem', position: 3, name: m.name, item: url },
      ] },
    ],
  };

  return (
    <>
      <JsonLd data={ld} />
      <div className="container-page grid items-start gap-6 pb-8 pt-6 sm:pt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
        <MealArt meal={m} label className="aspect-[4/3] w-full rounded-[24px] shadow-lift" />
        <div className="flex min-w-0 flex-col gap-4">
          <Link href={back[0]} className="inline-flex w-fit items-center gap-1 text-sm"><ChevronLeft className="size-4" aria-hidden />{back[1]}</Link>
          <span className="eyebrow">{complete ? `Complete meal · ${m.components.length} components` : 'Individual dish'} · {m.cuisine} · usually served at {periodLabel(m.category).toLowerCase()}</span>
          <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">{m.name}</h1>
          {m.description ? <p className="text-[1.1rem]">{m.description}</p> : null}
          {complete ? (
            <ol className="flex list-decimal flex-col gap-1 pl-5">
              {m.components.map((c: any) => <li key={c.dishId}><b className="text-heading">{c.name}</b>{c.nameAr ? <> <span lang="ar" dir="rtl">{c.nameAr}</span></> : null} <span className="text-sm text-muted-foreground">· {c.kindLabel} · {c.grams} g</span></li>)}
            </ol>
          ) : null}
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="inline-flex items-start gap-1.5"><Scale className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Standard serving: {m.servingSize}</span>
            <span className="inline-flex items-start gap-1.5"><Layers className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Portions: {portions.map(portionLabel).join(', ')} ({factors.join(', ')} of {complete ? 'every component' : 'the standard serving'})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.available ? <Badge variant="ok"><Check aria-hidden />Available</Badge> : <Badge variant="danger" className="whitespace-normal"><X aria-hidden />Unavailable{m.unavailableReason ? `: ${m.unavailableReason}` : ''}</Badge>}
            {m.infoReview?.status === 'verified'
              ? <Badge variant="ok" className="whitespace-normal"><Shield aria-hidden />Dietary information verified{m.infoReview.by ? ` by ${m.infoReview.by}` : ''}</Badge>
              : <Badge variant="warn" className="whitespace-normal"><TriangleAlert aria-hidden />Dietary information changed{m.infoReview?.changedBy ? ` by ${m.infoReview.changedBy}` : ''}; not yet verified by an admin</Badge>}
            <Badge variant="outline">Version {m.version}</Badge>
          </div>
          {m.onMenu.length
            ? <p className="text-sm"><b className="text-heading">On the menu in the next 7 days:</b> {m.onMenu.map((x: any) => `${x.name} (${x.periods.map(periodLabel).join(', ').toLowerCase()})`).join(' · ')}</p>
            : <p className="text-sm text-muted-foreground">Not on the menu in the next 7 days.</p>}
          {m.local.length ? <p className="flex items-start gap-1.5 text-sm text-success"><Leaf className="mt-0.5 size-4 shrink-0" aria-hidden /><span>Local Saudi produce (MEWA / GASTAT 2024 self-sufficiency): {m.local.map((l: any) => `${l.ingredient} (${l.label}, ${l.selfSufficiency}%)`).join(' · ')}</span></p> : null}
          {ev && d.patient ? (
            <Panel tone={ev.status === 'excluded' ? 'blush' : 'mint'} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">{role === 'patient' ? 'For you' : `For ${d.patient.demoId} (${d.patient.preferredName})`} · {periodLabel(d.patient.period)}</h2>
                <ScreenChip status={ev.status} />
              </div>
              {ev.portion ? <p className="text-sm">{ev.portion.explanation}</p> : null}
              <WhyThisMeal ev={ev} open audience={role === 'patient' ? 'patient' : 'staff'} />
            </Panel>
          ) : null}
        </div>
      </div>

      <div className="container-page grid items-start gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="flex min-w-0 flex-col gap-10">
          {m.components.map((c: any) => (
            <section key={c.dishId} aria-labelledby={`cmp-${c.dishId}`} className="flex flex-col gap-3">
              <h2 id={`cmp-${c.dishId}`} className="text-[1.4rem] sm:text-[1.6rem]">{complete ? `${c.kindLabel}: ` : 'Ingredients: '}{c.name}{c.nameAr ? <> <span className="font-sans text-base font-normal text-muted-foreground" lang="ar" dir="rtl">{c.nameAr}</span></> : null}</h2>
              <p className="text-sm text-muted-foreground">{c.grams} g per standard serving ({c.servingSize}). Ingredient grams are per standard portion and are used to scale kitchen quantities.{c.sfct ? ` Prepared to the SFDA Saudi Food Composition Tables standard recipe “${c.sfct.name}” (${c.sfct.region} region, recipe p. ${c.sfct.recipePage}, nutrient table p. ${c.sfct.page}).` : ''}</p>
              <ul className="flex flex-col rounded-[16px] border border-border bg-card px-4">
                {c.ingredients.map((i: any) => (
                  <li key={i.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-dashed border-border py-2.5 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <span className="font-display font-medium text-heading tabular">{fmt(i.grams, 1)} g</span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span><b className="text-heading">{i.name}</b>{i.prep ? `, ${i.prep}` : ''}{i.optional ? <> <Badge variant="outline">optional</Badge></> : null}</span>
                      {(i.allergens.length || i.mayContain.length || i.labelCheck || i.local) ? (
                        <span className="flex flex-wrap gap-1.5">
                          {i.allergens.length ? <Badge variant="danger" className="whitespace-normal"><TriangleAlert aria-hidden />Contains {i.allergens.map(allergenName).join(', ')}</Badge> : null}
                          {i.mayContain.length ? <Badge variant="warn" className="whitespace-normal"><TriangleAlert aria-hidden />May contain {i.mayContain.map(allergenName).join(', ')}</Badge> : null}
                          {i.labelCheck ? <Badge variant="outline">Kitchen checks label</Badge> : null}
                          {i.local ? <Badge variant="ok"><Leaf aria-hidden />Local: {i.local.label}</Badge> : null}
                        </span>
                      ) : null}
                      {i.note ? <span className="text-sm text-muted-foreground">{i.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {staff && c.steps.length ? (
                <Accordion className="rounded-[16px] border border-border bg-card" headClassName="min-h-11 px-4 py-3 font-display text-sm font-semibold text-heading"
                  title={<span className="inline-flex items-center gap-2"><List className="size-4" aria-hidden />Kitchen preparation{c.batchPortions ? ` (method written for a batch of ${c.batchPortions})` : ''}</span>}>
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    <ol className="flex list-decimal flex-col gap-1.5 pl-5">{c.steps.map((s: string, k: number) => <li key={k}>{s}</li>)}</ol>
                    {c.notes.length ? <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">{c.notes.map((x: string, k: number) => <li key={k}>{x}</li>)}</ul> : null}
                  </div>
                </Accordion>
              ) : null}
            </section>
          ))}

          <section aria-labelledby="cmpt-h" className="flex flex-col gap-3">
            <h2 id="cmpt-h" className="text-[1.4rem] sm:text-[1.6rem]">Fit with hospital diet categories</h2>
            <p className="text-sm text-muted-foreground">Screened with each category’s documented rules and default limits. Individual patients are screened against their own diet order. Tap a result to see why.</p>
            <ul className="flex flex-col rounded-[16px] border border-border bg-card">
              {(m.compatibility as Compat[]).map((c) => (
                <li key={c.id} className="grid gap-2 border-b border-border px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span><b className="text-heading">{c.label}</b> <span className="text-sm text-muted-foreground">({c.code})</span></span>
                    <span className="text-sm">{c.note}</span>
                    <span className="text-sm text-muted-foreground">Portions passing: {c.portions.map(portionLabel).join(', ') || '—'}</span>
                  </div>
                  <div className="md:justify-self-end"><CompatChip c={c} /></div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24" aria-label="Nutrition, allergens and sources">
          <Panel className="p-4 sm:p-5">
            <h2 id="nu-h" className="text-xl">Nutrition{complete ? ' for the full meal' : ''}</h2>
            {n.available ? (
              <>
                {complete ? (
                  <Table caption="Nutrition per component, standard serving">
                    <thead><tr><Th scope="col" className="px-2.5">Component</Th><Th scope="col" className="px-2.5 text-right">kcal</Th><Th scope="col" className="px-2.5 text-right">Carbs g</Th><Th scope="col" className="px-2.5 text-right">Sodium mg</Th></tr></thead>
                    <tbody>
                      {m.components.map((c: any) => (
                        <tr key={c.dishId}>
                          <Th scope="row" className="bg-transparent px-2.5 text-[.85rem] normal-case tracking-normal">{c.name}</Th>
                          {c.nutrition.available
                            ? <><Td className="px-2.5 text-right tabular">{fmt(c.nutrition.perPortion.kcal, 0)}</Td><Td className="px-2.5 text-right tabular">{fmt(c.nutrition.perPortion.carbs, 1)}</Td><Td className="px-2.5 text-right tabular">{fmt(c.nutrition.perPortion.sodium, 0)}</Td></>
                            : <Td colSpan={3} className="text-right text-muted-foreground">no SFDA values</Td>}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : null}
                <Table caption={complete ? 'Meal totals by portion' : 'Nutrition by portion'}>
                  <thead><tr><Th scope="col" className="px-2.5">Nutrient</Th>{portions.map((p) => <Th key={p} scope="col" className="px-2.5 text-right">{portionLabel(p)}</Th>)}</tr></thead>
                  <tbody>
                    {n.nutrients.map((x: any) => (
                      <tr key={x.key}>
                        <Th scope="row" className="bg-transparent px-2.5 text-[.85rem] normal-case tracking-normal">{x.label} <span className="font-sans font-normal text-muted-foreground">({x.unit})</span></Th>
                        {portions.map((p) => <Td key={p} className="whitespace-nowrap px-2.5 text-right tabular">{cell(n.byPortion[p], x.key, x.decimals)}</Td>)}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <p className="text-sm text-muted-foreground">{n.method} “—” means not reported; “≥” is a partial total that leaves out components without SFDA values. Nothing is estimated.</p>
              </>
            ) : (
              <>
                <Notice tone="warn" title="No nutrition values">{n.method}</Notice>
                <p className="text-sm text-muted-foreground">Diets with nutrient limits (sodium, carbohydrate, potassium, phosphorus) need admin review for this meal.</p>
              </>
            )}
          </Panel>

          <Panel>
            <h2 className="text-xl">Allergens (SFDA 14)</h2>
            <p><b className="text-heading">Contains:</b> {m.allergens.contains.length ? m.allergens.contains.map(allergenName).join(', ') : 'none of the 14 declarable allergens'}</p>
            {m.allergens.mayContain.length ? <p><b className="text-heading">May contain:</b> {m.allergens.mayContain.map(allergenName).join(', ')}</p> : null}
            {m.allergens.labelCheck.length ? <p className="text-sm">The kitchen checks labels of: {m.allergens.labelCheck.join(', ')}.</p> : null}
            <p className="text-sm text-muted-foreground">Worked out from every component’s ingredients. CareBite never labels a meal “allergy-safe”.</p>
          </Panel>

          <Panel tone="blush">
            <h2 className="text-xl">Sources and limitations</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">{m.limitations.map((x: string) => <li key={x}>{x}</li>)}</ul>
            <ul className="flex flex-col gap-1.5 border-t border-rose pt-3 text-sm">
              {m.components.filter((c: any) => c.sfct).map((c: any) => <li key={c.dishId}>SFCT: <ExtLink href={m.dataSources.sfct.links[0].url}>{c.sfct.name}</ExtLink>, {c.sfct.region}, p. {c.sfct.page} ({c.sfct.yield})</li>)}
              <li><ExtLink href={m.dataSources.sfct.url}>{m.dataSources.sfct.title}</ExtLink></li>
              <li><ExtLink href={m.dataSources.allergens.url}>SFDA allergen disclosure (14 allergens)</ExtLink></li>
              <li><ExtLink href={m.dataSources.local.url}>MEWA local produce</ExtLink></li>
              <li><Link href="/sources">All data sources and limitations</Link></li>
            </ul>
            {m.updatedAt ? <p className="text-sm text-muted-foreground">Last changed {formatDate(m.updatedAt, { month: 'short', day: 'numeric', year: 'numeric' })}{m.updatedBy ? ` by ${m.updatedBy}` : ''}.</p> : null}
          </Panel>
        </aside>
      </div>
    </>
  );
}

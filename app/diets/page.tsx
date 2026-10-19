import type { ReactNode } from 'react';
import Link from 'next/link';
import { Shield, HeartPulse, ShieldX, TriangleAlert, ChefHat, Flag, ListChecks, FlaskConical, ArrowUpDown, type LucideIcon } from 'lucide-react';
import { publicMetadata } from '@/components/public/seo';
import { SITE_URL } from '@/lib/site';
import { AboutNav } from '@/components/cb/misc';
import { PageHead } from '@/components/site/page-head';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/ui/notice';
import { Table, Th, Td } from '@/components/ui/table';
import { ExtLink } from '@/components/public/blocks';
import { JsonLd } from '@/components/public/json-ld';
import { DIET_CATEGORIES, DIET_SUPPORT, MEDICAL_RULES, SAFETY_RULES, INTAKE_FLAG_RULES, SOURCES, MEAL_SHARE, RULESET_VERSION, RULESET_REVIEW } from '@/domain/rules.js';
import { ALLERGENS, PERIODS } from '@/domain/constants.js';
import { TEXTURE_LEVELS } from '@/domain/patient.js';
import { LOCAL_PRODUCTION, LOCAL_PRODUCTION_SOURCES } from '@/data/local-production.js';
import { SFCT_META } from '@/data/sfct-dishes.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
const DESCRIPTION = 'Every hospital diet category and screening rule CareBite applies, with its exact logic and Saudi government source (MOH, SFDA, MEWA, GFSA): nutrient limits, allergy and review rules, intake flags, the 14 SFDA allergens and IDDSI texture levels.';
export const metadata = publicMetadata({ title: 'Hospital Diets & Screening Rules', description: DESCRIPTION, path: '/diets' });

type Variant = 'danger' | 'warn' | 'outline' | 'rose';
const OUTCOME: Record<string, [Variant, string, LucideIcon]> = {
  exclude: ['danger', 'Excludes', ShieldX], review: ['warn', 'Sends to review', TriangleAlert], kitchen: ['outline', 'Kitchen instruction', ChefHat], flag: ['rose', 'Flags for the team', Flag],
};
const SUPPORT: Record<string, [Variant, LucideIcon]> = { ingredient: ['outline', ListChecks], nutrient: ['rose', FlaskConical], ranking: ['outline', ArrowUpDown], review: ['warn', TriangleAlert] };
const REQUIRES: Record<string, string> = { potassiumMgPerDay: 'potassium limit', phosphorusMgPerDay: 'phosphorus limit', textureLevel: 'IDDSI texture level', carbsGPerMeal: 'carbohydrate amount per meal' };
const ruleTitle = (id: string) => [...MEDICAL_RULES, ...SAFETY_RULES].find((r: any) => r.id === id)?.title ?? id;
const TOC: [string, string][] = [['categories', 'Diet categories'], ['medical', 'Nutrient rules'], ['safety', 'Safety and review rules'], ['intake', 'Intake flags'], ['allocation', 'Daily limits per meal'], ['allergens', 'SFDA allergens'], ['texture', 'Texture levels'], ['local', 'Local produce (MEWA)'], ['waste', 'Food security & waste (GFSA)'], ['sources', 'Sources & limitations']];

function SourceLinks({ ids }: { ids?: string[] }) {
  if (!ids?.length) return <span className="text-sm text-muted-foreground">CareBite safety design (no external threshold)</span>;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {ids.map((id) => { const s = (SOURCES as any)[id]; return <li key={id}>{s.url ? <ExtLink href={s.url}>{s.title}</ExtLink> : s.title} · <span className="text-muted-foreground">{s.publisher}</span></li>; })}
    </ul>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-24 flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <h2 id={`${id}-h`} className="text-[1.5rem] sm:text-[1.75rem]">{title}</h2>
      {children}
    </section>
  );
}

function RuleCard({ r, outcome }: { r: any; outcome?: string }) {
  const o = outcome ? OUTCOME[outcome] : null;
  const OIcon = o?.[2];
  return (
    <li className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-[1.05rem]">{r.title}</h3>
          <span className="font-mono text-xs text-muted-foreground">{r.id}{r.kind ? ` · ${String(r.kind).startsWith('rank') ? 'ranking only' : 'limit'}` : ''}</span>
        </div>
        {o && OIcon ? <Badge variant={o[0]}><OIcon aria-hidden />{o[1]}</Badge> : null}
      </div>
      <p className="text-[.95rem]">{r.logic}</p>
      <div className="border-t border-dashed border-border pt-2"><span className="sr-only">Sources: </span><SourceLinks ids={r.sources} /></div>
    </li>
  );
}

export default function DietsPage() {
  const active = DIET_CATEGORIES.filter((d: any) => d.status !== 'retired');
  const retired = DIET_CATEGORIES.filter((d: any) => d.status === 'retired');
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Hospital Diets & Screening Rules', url: `${SITE_URL}/diets`, description: DESCRIPTION, version: RULESET_VERSION, isPartOf: { '@id': `${SITE_URL}/#website` } };
  return (
    <>
      <JsonLd data={ld} />
      <AboutNav current="/diets" />
      <PageHead eyebrow={`Knowledge base · ruleset ${RULESET_VERSION}`} title="Hospital Diets & Screening Rules">
        <p>Every diet category and rule CareBite applies, with its exact logic and source. Nothing else is used to screen meals.</p>
      </PageHead>
      <div className="container-page grid items-start gap-8 pb-16 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">On this page</h2>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
            {TOC.map(([id, l]) => <li key={id}><a href={`#${id}`} className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-foreground no-underline hover:bg-mint hover:text-heading lg:w-full lg:rounded-[10px] lg:border-0 lg:bg-transparent">{l}</a></li>)}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Notice tone="info" icon={<Shield aria-hidden />} title="Saudi rules">CareBite is used in Saudi Arabia, so every food and health rule is based on Saudi government guidance: the Ministry of Health, the Saudi National Diabetes Center, the Saudi Food &amp; Drug Authority, the Ministry of Environment, Water and Agriculture and the General Food Security Authority.</Notice>
            <Notice tone="rose" icon={<HeartPulse aria-hidden />} title="Governance">Reviewed by: {RULESET_REVIEW.reviewedBy} on {RULESET_REVIEW.reviewedOn}. {RULESET_REVIEW.clinicalValidation}</Notice>
          </div>

          <Section id="categories" title="Documented hospital diet categories">
            <p>A diet order combines one or more categories. Plain names are used on screens; the short code appears on schedules and tray tickets (tap a code anywhere to see its meaning). Each category says how completely CareBite can screen it, so cases that need professional review are visible.</p>
            <h3 className="text-[1.1rem]">How each active category is supported</h3>
            <dl className="grid gap-3 md:grid-cols-2">
              {Object.entries(DIET_SUPPORT as Record<string, { label: string; text: string }>).map(([key, sup]) => {
                const [variant, Icon] = SUPPORT[key] ?? SUPPORT.ingredient;
                const diets = active.filter((d: any) => d.support === key);
                if (!diets.length) return null;
                return (
                  <div key={key} className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4">
                    <dt><Badge variant={variant}><Icon aria-hidden />{sup.label}</Badge></dt>
                    <dd className="text-sm">{sup.text}</dd>
                    <dd className="flex flex-wrap gap-x-3 gap-y-1 text-sm"><span className="sr-only">Diets: </span>{diets.map((d: any) => <a key={d.id} href={`#${d.id}`} className="font-semibold">{d.plain} <span className="font-normal text-muted-foreground">({d.code})</span></a>)}</dd>
                  </div>
                );
              })}
            </dl>
            <ul className="flex flex-col gap-3">
              {active.map((d: any) => {
                const [variant, Icon] = SUPPORT[d.support] ?? SUPPORT.ingredient;
                return (
                  <li key={d.id} id={d.id} className="flex scroll-mt-24 flex-col gap-2 rounded-[16px] border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="flex flex-wrap items-center gap-2 text-[1.1rem]">{d.plain} <Badge variant="outline" className="font-mono">{d.code}</Badge></h3>
                      <Badge variant={variant}><Icon aria-hidden />{(DIET_SUPPORT as any)[d.support].label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Clinical name: {d.label}</p>
                    <p>{d.description}</p>
                    {d.rules.length ? <p className="text-sm"><b className="text-heading">Rules:</b> {d.rules.map((r: string) => `${ruleTitle(r)} (${r})`).join(' · ')}</p> : <p className="text-sm text-muted-foreground">No nutrient limits. Allergy, intolerance and exclusion screening still applies.</p>}
                    {d.defaults ? <p className="text-sm"><b className="text-heading">Default:</b> sodium {d.defaults.sodiumMgPerDay.toLocaleString('en-US')} mg a day unless the diet order sets another limit.</p> : null}
                    {d.requires ? <p className="text-sm"><b className="text-heading">Required in the diet order:</b> {d.requires.map((x: string) => REQUIRES[x] ?? x).join(', ')}. Until set, meals need admin review.</p> : null}
                  </li>
                );
              })}
            </ul>
            <h3 className="text-[1.1rem]">Retired categories</h3>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">{retired.map((d: any) => <li key={d.id}><b className="text-heading">{d.plain} ({d.code}):</b> {d.retiredReason}</li>)}</ul>
          </Section>

          <Section id="medical" title="Nutrient rules">
            <p>Limits are checked for each permitted portion using SFDA Saudi Food Composition Table dish values; ranking rules only change the order of eligible meals. Hospital dishes prepared to an SFDA Saudi Food Composition Tables recipe ({SFCT_META.dishes} dishes in the first edition) are screened automatically; meals with any dish outside the SFCT go to admin review for these limits.</p>
            <ul className="flex flex-col gap-3">{MEDICAL_RULES.map((r: any) => <RuleCard key={r.id} r={r} />)}</ul>
          </Section>

          <Section id="safety" title="Safety and review rules">
            <ul className="flex flex-col gap-3">{SAFETY_RULES.map((r: any) => <RuleCard key={r.id} r={{ ...r, kind: undefined }} outcome={r.outcome} />)}</ul>
          </Section>

          <Section id="intake" title="Intake flags">
            <p>Prompts for a professional review, raised from recorded meals. They never change a diet order or screening result.</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">{INTAKE_FLAG_RULES.map((r: any) => <li key={r.id}><b className="text-heading">{r.title} ({r.id}):</b> {r.logic}</li>)}</ul>
            <SourceLinks ids={['CAREBITE-FLAGS']} />
          </Section>

          <Section id="allocation" title="Daily limits per meal">
            <p>To screen a single meal against a daily limit, the limit is shared across the day:</p>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERIODS.map((p: { id: string; label: string }) => (
                <div key={p.id} className="flex flex-col gap-1 rounded-[16px] border border-border bg-card px-4 py-3">
                  <dd className="order-1 font-display text-2xl font-semibold text-heading tabular">{Math.round((MEAL_SHARE as Record<string, number>)[p.id] * 100)}%</dd>
                  <dt className="order-2 text-sm text-muted-foreground">{p.label}</dt>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">{(SOURCES as any)['CAREBITE-ALLOC'].summary} This is a prototype assumption; a hospital would set its own distribution.</p>
          </Section>

          <Section id="allergens" title="The 14 SFDA allergens">
            <p>{(SOURCES as any)['SFDA-ALLERGENS'].summary}</p>
            <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3">
              {ALLERGENS.map((a: { id: string; label: string; hint?: string }) => (
                <li key={a.id} className="flex flex-col rounded-[12px] border border-border bg-card px-3 py-2">
                  <b className="text-heading">{a.label}</b>
                  {a.hint ? <span className="text-xs text-muted-foreground">{a.hint}</span> : null}
                </li>
              ))}
            </ul>
            <p className="text-sm">Meals are never called “allergy-safe”. Ingredients that may contain an allergen through cross-contact or varying formulations exclude the meal for a confirmed allergy, and the kitchen is told which packaged labels to check.</p>
            <SourceLinks ids={['SFDA-ALLERGENS']} />
          </Section>

          <Section id="texture" title="Texture-modified diets (IDDSI)">
            <p>The care team sets the texture level. Menu items do not have a recorded IDDSI level, so every meal for a texture-modified diet needs admin review and preparation by the kitchen at that level.</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">{TEXTURE_LEVELS.map((t: { id: string; label: string }) => <li key={t.id}>{t.label}</li>)}</ul>
            <SourceLinks ids={['IDDSI']} />
          </Section>

          <Section id="local" title="Local produce (MEWA)">
            <p>{(SOURCES as any)['MEWA-LOCAL'].summary} CareBite marks ingredients from these groups on the menu and the kitchen summary.</p>
            <Table caption="National self-sufficiency by food group" className="sm:w-auto">
              <thead><tr><Th scope="col">Group</Th><Th scope="col" className="text-right">Self-sufficiency</Th><Th scope="col" className="text-right">Year</Th></tr></thead>
              <tbody>{Object.entries(LOCAL_PRODUCTION).map(([k, l]: [string, any]) => <tr key={k}><Td>{l.label}</Td><Td className="text-right tabular">{l.selfSufficiency}%</Td><Td className="text-right tabular">{l.year}</Td></tr>)}</tbody>
            </Table>
            <p className="text-sm text-muted-foreground">Self-sufficiency = domestic production ÷ consumption. It does not show where a particular product was grown.</p>
            <ul className="flex flex-col gap-1 text-sm">{LOCAL_PRODUCTION_SOURCES.map((s: { url: string; publisher: string }) => <li key={s.url}><ExtLink href={s.url}>{s.publisher}</ExtLink></li>)}</ul>
          </Section>

          <Section id="waste" title="Food security and food waste (GFSA)">
            <p>{(SOURCES as any).GFSA.summary}</p>
            <p>{(SOURCES as any)['GFSA-WASTE'].summary}</p>
            <p className="text-sm">In CareBite, estimated leftovers (how much was eaten, as estimated by staff or reported by the patient) and weighed plate waste are recorded separately for every meal, and the nutrition team dashboard shows both as indicators. Meals ranked by preference and portions matched to appetite are intended to reduce avoidable hospital food waste; the prototype does not measure that effect.</p>
            <ul className="flex flex-col gap-1 text-sm">
              {['GFSA', 'GFSA-WASTE'].flatMap((id) => {
                const s = (SOURCES as any)[id];
                return [<li key={id}><ExtLink href={s.url}>{s.title}</ExtLink> · <span className="text-muted-foreground">{s.publisher}</span></li>, ...(s.links ?? []).map((l: { url: string; label: string }) => <li key={l.url}><ExtLink href={l.url}>{l.label}</ExtLink></li>)];
              })}
            </ul>
          </Section>

          <Section id="sources" title="Sources and limitations">
            <p>Every source behind these rules, the SFDA food composition data and the project’s limitations are listed on <Link href="/sources">Data sources &amp; limitations</Link>.</p>
          </Section>
        </div>
      </div>
    </>
  );
}

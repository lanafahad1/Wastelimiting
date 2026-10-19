import type { ReactNode } from 'react';
import { publicMetadata } from '@/components/public/seo';
import { SITE_URL, TEAM } from '@/lib/site';
import { AboutNav } from '@/components/cb/misc';
import { PageHead } from '@/components/site/page-head';
import { ExtLink } from '@/components/public/blocks';
import { Citation } from '@/components/public/citation';
import { JsonLd } from '@/components/public/json-ld';
import { SOURCES, RULESET_VERSION, RULESET_REVIEW } from '@/domain/rules.js';
import { OUTCOME_RULE } from '@/domain/indicators.js';
import { sfctConsistencyIssue } from '@/domain/nutrition.js';
import { SFCT_META, SFCT_LIBRARY } from '@/data/sfct-dishes.js';
import { SFCT_HOSPITAL_DISHES } from '@/data/sfct-hospital-dishes.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
const DESCRIPTION = 'Where CareBite’s food, health and nutrition information comes from (SFDA Saudi Food Composition Tables, MOH, SFDA, MEWA, GFSA), how it is used, and what the prototype cannot do.';
export const metadata = publicMetadata({ title: 'Data Sources & Limitations', description: DESCRIPTION, path: '/sources' });

type Source = { authority: string; saudi?: boolean; title: string; publisher: string; url?: string; summary: string; links?: { label: string; url: string }[] };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="flex flex-col gap-3"><h2 id={id} className="text-[1.375rem]">{title}</h2>{children}</section>;
}

export default function SourcesPage() {
  const library = SFCT_LIBRARY as Record<string, any>;
  const flagged = Object.entries(library).filter(([, e]) => sfctConsistencyIssue(e)).sort(([a], [b]) => (a === 'ruwakah' ? -1 : b === 'ruwakah' ? 1 : 0));
  const example = flagged[0] ? `${flagged[0][1].name}: ${String(sfctConsistencyIssue(flagged[0][1])).replace(/^The published table is internally inconsistent \(per 100 g: /, '').replace(/\)\.$/, '')}` : '';
  const sources = Object.entries(SOURCES as unknown as Record<string, Source>);
  const groups: [string, string, (x: Source) => boolean][] = [
    ['src-saudi', 'Saudi government sources', (x) => Boolean(x.saudi)],
    ['src-intl', 'International framework (no Saudi government equivalent found)', (x) => !x.saudi && x.authority !== 'CareBite'],
    ['src-carebite', 'CareBite prototype assumptions', (x) => x.authority === 'CareBite'],
  ];
  const ld = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: 'Data Sources & Limitations', url: `${SITE_URL}/sources`, description: DESCRIPTION,
    citation: sources.filter(([, x]) => x.url).map(([, x]) => ({ '@type': 'CreativeWork', name: x.title, url: x.url, publisher: { '@type': 'Organization', name: x.publisher } })),
    author: TEAM.map((name) => ({ '@type': 'Person', name })),
  };

  return (
    <>
      <JsonLd data={ld} />
      <AboutNav current="/sources" />
      <PageHead eyebrow="About & Sources" title="Data Sources & Limitations">
        <p>Where CareBite’s food, health and nutrition information comes from, how it is used, and what the prototype cannot do.</p>
      </PageHead>
      <div className="container-page pb-16">
        <div className="prose-cb max-w-[72ch] gap-10">
          <Section id="sf-h" title="SFDA Saudi Food Composition Tables (the only nutrient source)">
            <p>{SFCT_META.publisher}, <i>{SFCT_META.title}</i>, {SFCT_META.edition} (released {SFCT_META.released}). Laboratory analysis of {SFCT_META.dishes} traditional dishes from the 13 regions of the Kingdom, {SFCT_META.basis}.</p>
            <ul>
              <li>A hospital dish is linked to an SFCT entry only when the kitchen prepares it to that standard recipe. {SFCT_HOSPITAL_DISHES.length} demonstration dishes are linked: {SFCT_HOSPITAL_DISHES.map((d: any) => `${d.name} (${library[d.nutrition.sfctId].region}, p. ${library[d.nutrition.sfctId].tablePage})`).join('; ')}.</li>
              <li>Per-portion values = SFCT value per 100 g × the hospital’s standard portion weight. A complete meal adds its components; if any component has no SFCT entry, totals are shown as partial (“≥”) and are never used for a limit.</li>
              <li>The other dishes are the project team’s synthetic recipes. The SFCT does not cover them, so they have no nutrient values. Nothing is estimated.</li>
              <li>Carbohydrate limits use the SFCT “Total Carbohydrates” value (which includes dietary fibre); available carbohydrate is shown alongside.</li>
              <li>Portion weights and the ingredient grams derived from SFCT recipes are demonstration kitchen values, not SFDA data.</li>
              <li>Every table was checked for internal consistency (energy against protein, fat, carbohydrate and fibre; kJ against kcal; total against available carbohydrate). {flagged.length} of {SFCT_META.dishes} published tables fail it{example ? `, for example ${example}` : ''}. They are kept exactly as published, marked in the library, and cannot be linked to a hospital dish until the project team confirms the values with SFDA: {flagged.map(([, e]) => e.name).join(', ')}.</li>
            </ul>
            <p><ExtLink href={SFCT_META.news}>SFDA announcement</ExtLink> · <ExtLink href={SFCT_META.url}>English PDF</ExtLink> · <ExtLink href={SFCT_META.urlAr}>Arabic PDF</ExtLink> · The full library can be browsed in Menu Management (staff).</p>
          </Section>

          {groups.map(([id, heading, keep]) => (
            <Section key={id} id={id} title={heading}>
              <ul>
                {sources.filter(([, x]) => keep(x)).map(([sid, x]) => (
                  <li key={sid} className="break-words">
                    <b className="font-mono text-[.85rem] text-heading">{sid}</b> ({x.authority}): {x.url ? <ExtLink href={x.url}>{x.title}</ExtLink> : x.title} · {x.publisher}. {x.summary}
                    {(x.links ?? []).map((l) => <span key={l.url}> <ExtLink href={l.url}>{l.label}</ExtLink>.</span>)}
                  </li>
                ))}
              </ul>
            </Section>
          ))}

          <Section id="outcome-h" title="How intake and feedback are summarised">
            <ul>{(OUTCOME_RULE as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
          </Section>

          <Section id="lim-h" title="Limitations">
            <ul>
              <li>Rules (ruleset {RULESET_VERSION}) follow cited Saudi government guidance. Where no Saudi source sets a number (carbohydrate per meal, potassium, phosphorus), the admin sets it. The meal-share allocation, portion sizes, the protein ranking level and intake flags are CareBite prototype assumptions. {RULESET_REVIEW.clinicalValidation}</li>
              <li>No Saudi government texture standard was found, so texture levels use the IDDSI framework promoted by the Saudi Arabia IDDSI Reference Group. Menu items have no recorded texture level, so texture-modified diets always need admin review.</li>
              <li>Allergens come from ingredient data and SFDA’s 14 declarable allergens. Packaged products vary by brand; the kitchen checks labels. Meals are never called “allergy-safe”.</li>
              <li>Alerts appear inside CareBite only. It does not send emails, text messages or pager alerts, and it is not connected to any hospital system (electronic health record, admission system, pharmacy or kitchen equipment).</li>
              <li>Staff and patient accounts are demonstration access: no identity is verified. Roles are assigned by the demo admin.</li>
              <li>Data is kept in a local SQLite database on the CareBite server, with hashed passwords and HttpOnly sessions.</li>
              <li>All patients, staff and records are fictional. The dashboard shows indicators from recorded meals; it does not show cause and effect.</li>
            </ul>
          </Section>

          <Section id="cite-h" title="How to cite this project">
            <Citation id="sources-cite" />
          </Section>
        </div>
      </div>
    </>
  );
}

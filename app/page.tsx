import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Sparkles, Shield, HeartPulse, Leaf, User, Users, Lock, Scale } from 'lucide-react';
import { publicMetadata } from '@/components/public/seo';
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site';
import { heroArt, botanical } from '@/lib/art.js';
import { getActor, homeFor } from '@/lib/server/session';
import { serviceCall } from '@/lib/server/data';
import { buttonVariants } from '@/components/ui/button';
import { Band, SectionHead, CheckList, CheckItem, Benefit, Journey, CtaBand, Panel } from '@/components/public/blocks';
import { MEDICAL_RULES, SAFETY_RULES, ACTIVE_DIET_CATEGORIES } from '@/domain/rules.js';
import { LOCAL_PRODUCTION } from '@/data/local-production.js';

const HOME_TITLE = `${SITE_NAME}: Personalized Hospital Meals`;
const base = publicMetadata({ description: SITE_DESCRIPTION, path: '/' });
export const metadata: Metadata = { ...base, title: { absolute: HOME_TITLE }, openGraph: { ...base.openGraph, title: HOME_TITLE }, twitter: { ...base.twitter, title: HOME_TITLE } };

type Diet = { id: string; code: string; label: string; description: string };

export default async function Home() {
  const actor = await getActor();
  const start = actor ? homeFor(actor) : '/login';
  const startLabel = actor ? 'Go to my start page' : 'Try the demonstration hospital';
  const mealCount = await serviceCall((s) => s.catalog().list.length as number);
  const counts = { meals: mealCount, diets: ACTIVE_DIET_CATEGORIES.length, rules: MEDICAL_RULES.length + SAFETY_RULES.length };

  return (
    <>
      <section className="overflow-hidden bg-[radial-gradient(1200px_500px_at_85%_10%,var(--cb-rose),transparent_60%),radial-gradient(900px_500px_at_0%_100%,var(--cb-mint),transparent_60%)] py-10 sm:py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="flex flex-col gap-5">
            <span className="eyebrow">Personalized Hospital Meal Recommendation Platform</span>
            <h1 className="text-display">Hospital meals that <em className="not-italic text-rose-ink">fit</em> every patient.</h1>
            <p className="text-[1.15rem]">CareBite helps hospital nutrition teams recommend meals that match each patient’s prescribed diet, medical restrictions, food allergies, personal preferences and appetite.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={start} className={buttonVariants({ size: 'lg' })}>{actor ? <ChevronRight aria-hidden /> : <Sparkles aria-hidden />}{startLabel}</Link>
              <Link href="/how-it-works" className={buttonVariants({ variant: 'outline', size: 'lg' })}>How It Works</Link>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[.9rem] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5"><Shield className="size-4 text-heading" aria-hidden />Allergies and diet orders screened first</li>
              <li className="inline-flex items-center gap-1.5"><HeartPulse className="size-4 text-heading" aria-hidden />Admins decide; CareBite supports</li>
              <li className="inline-flex items-center gap-1.5"><Leaf className="size-4 text-heading" aria-hidden />SFDA and MEWA guidance</li>
            </ul>
          </div>
          <div className="relative aspect-[5/4] w-full overflow-hidden rounded-[28px] bg-rose shadow-lift">
            <div className="h-full w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: heroArt() }} />
            <p className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5 rounded-[16px] bg-card/95 px-3.5 py-2.5 text-[.85rem] shadow-soft sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-[calc(100%-2rem)]">
              <Leaf className="size-6 shrink-0 text-heading" aria-hidden />
              <span><b>{counts.meals} menu items</b> screened against <b>{counts.diets} hospital diet categories</b> and <b>{counts.rules} documented rules</b></span>
            </p>
          </div>
        </div>
      </section>

      <Band tone="white" aria-labelledby="ov">
        <div className="container-page grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">Project overview</span>
            <h2 id="ov" className="text-[1.6rem] leading-tight sm:text-[2rem]">Connecting patient information with the hospital’s meals</h2>
            <p className="text-[1.1rem]">The platform connects structured patient health information with the hospital’s available meals and nutritional data. It screens meals against recorded dietary requirements, then ranks eligible options according to the patient’s preferences and appetite.</p>
            <p className="text-muted-foreground">The goal is to support appropriate nutritional intake, reduce meal rejection and food waste, and improve patient satisfaction during hospitalization. Admins define and review dietary requirements; the platform supports their decisions.</p>
          </div>
          <Panel tone="mint">
            <CheckList>
              <CheckItem title="Preferences never override restrictions.">A favourite food that conflicts with an allergy or the diet order is still excluded.</CheckItem>
              <CheckItem title="No suitable meal? Flag it.">CareBite never relaxes requirements; it flags the case for the nutrition team.</CheckItem>
              <CheckItem title="Incomplete information goes to an admin.">Unassessed allergies, uncoded entries, texture-modified diets and missing nutrient data are marked for review.</CheckItem>
              <CheckItem title="Every suggestion explains itself.">“Why This Meal?” lists the checks passed, the preferences matched and the suggested portion.</CheckItem>
            </CheckList>
          </Panel>
        </div>
      </Band>

      <Band aria-labelledby="jr">
        <div className="container-page">
          <SectionHead center eyebrow="Core user journey" title="From the diet order to the next meal decision" id="jr" />
          <Journey />
          <div className="mt-8 flex justify-center">
            <Link href="/how-it-works" className={buttonVariants({ variant: 'outline' })}>See the screening rules in detail <ChevronRight aria-hidden /></Link>
          </div>
        </div>
      </Band>

      <Band tone="white" aria-labelledby="rl">
        <div className="container-page">
          <SectionHead eyebrow="Hospital management and patient participation" title="Managed by the hospital, with patients involved in their meals" id="rl">
            <p>Each person sees only what their role needs. The nutrition team stays responsible for dietary oversight; patients have a voice in their daily meals.</p>
          </SectionHead>
          <div className="grid gap-4 md:grid-cols-3">
            <Benefit icon={User} title="Patient">Views their meals, chooses from approved options, updates preferences and appetite, gives feedback and sends requests.</Benefit>
            <Benefit icon={Users} title="Staff">Run daily meal service: offer approved options, confirm choices, prepare and deliver trays, record intake, keep the menu up to date and answer requests.</Benefit>
            <Benefit icon={Lock} title="Admin">Controls the whole platform: diet orders, allergies and restrictions, meals that need review, menu verification, staff access, and every staff task.</Benefit>
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground"><Lock className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Changes to clinical dietary restrictions always require review by authorised healthcare staff.</p>
        </div>
      </Band>

      <Band tone="blush" aria-labelledby="sa">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">Saudi food and agriculture guidance</span>
            <h2 id="sa" className="text-[1.6rem] leading-tight sm:text-[2rem]">Built on Saudi government guidance</h2>
            <p>Every food and health rule in CareBite comes from Saudi government sources: the Ministry of Health and the Saudi National Diabetes Center for diets, the Saudi Food &amp; Drug Authority for food safety and nutrition, the Ministry of Environment, Water and Agriculture for local produce, and the General Food Security Authority for food security and food-waste reduction. Where no Saudi source sets a number, the admin sets it.</p>
            <Link href="/sources" className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-fit' })}>All sources and limitations <ChevronRight aria-hidden /></Link>
          </div>
          <div className="flex flex-col gap-3">
            <Panel>
              <h3 className="flex items-center gap-2 text-lg"><HeartPulse className="size-5" aria-hidden />Ministry of Health</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[.95rem]">
                <li>Salt: no more than 5 g a day (2,000 mg sodium) sets the default limit for sodium-restricted, cardiac and renal diets.</li>
                <li>Diabetes: no added sugar, regular meals and complex carbohydrates; the carbohydrate amount is set by the admin (Saudi Diabetes Clinical Practice Guidelines).</li>
                <li>Kidney disease: reduced salt, with potassium and phosphorus limits set for the stage of disease. Gluten-free diets for coeliac patients, as MOH provides in hospitals.</li>
              </ul>
            </Panel>
            <Panel>
              <h3 className="flex items-center gap-2 text-lg"><Shield className="size-5" aria-hidden />SFDA</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[.95rem]">
                <li>The 14 allergens food services must declare (SFDA.FD 56) are used for every allergy record and meal label.</li>
                <li>Salt guidance (5 g a day) ranks lower-salt meals for everyone; SFDA’s “high in fibre” definition ranks meals for diabetes; meat and poultry are halal-certified (Saudi Halal Center).</li>
                <li>Nutrition comes only from SFDA Saudi Food Composition Tables laboratory values, for the Saudi dishes the kitchen prepares to SFCT standard recipes. Nothing is estimated.</li>
              </ul>
            </Panel>
            <Panel>
              <h3 className="flex items-center gap-2 text-lg"><Leaf className="size-5" aria-hidden />MEWA</h3>
              <p className="text-[.95rem]">Ingredients the Kingdom produces widely are highlighted on menus and the kitchen summary, supporting MEWA’s local-produce campaigns: dates {LOCAL_PRODUCTION.dates.selfSufficiency}%, dairy {LOCAL_PRODUCTION.dairy.selfSufficiency}%, table eggs {LOCAL_PRODUCTION.eggs.selfSufficiency}% self-sufficiency (2024).</p>
            </Panel>
            <Panel>
              <h3 className="flex items-center gap-2 text-lg"><Scale className="size-5" aria-hidden />GFSA</h3>
              <p className="text-[.95rem]">The General Food Security Authority (formerly the Saudi Grains Organization) leads the national programme to reduce food loss and waste; its field study estimated that a third (33.1%) of targeted food commodities are wasted each year. CareBite records reported leftovers and weighed plate waste for every meal so the hospital can act on avoidable waste.</p>
            </Panel>
          </div>
        </div>
      </Band>

      <Band tone="white" aria-labelledby="dc">
        <div className="container-page">
          <SectionHead eyebrow="Documented hospital diet categories" title="Every meal is checked against the diet order" id="dc" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(ACTIVE_DIET_CATEGORIES as Diet[]).map((d, i) => (
              <li key={d.id}>
                <Link href={`/diets#${d.id}`} className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 text-foreground no-underline transition-shadow hover:shadow-lift">
                  <span aria-hidden className={`grid size-11 place-items-center rounded-[14px] font-mono text-[.8rem] font-bold ${i % 2 ? 'bg-mint text-heading' : 'bg-rose text-rose-ink'}`}>{d.code}</span>
                  <b className="font-display text-[1.05rem] font-medium text-heading">{d.label} <span className="sr-only">(code {d.code})</span></b>
                  <small className="text-[.9rem] text-muted-foreground">{d.description}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band className="pt-8 sm:pt-12">
        <div className="container-page">
          <CtaBand title="Explore the demonstration hospital"
            action={<Link href={start} className={buttonVariants({ size: 'lg' })}><Sparkles aria-hidden />{actor ? 'Go to my start page' : 'Choose a demo account'}</Link>}>
            <p>Log in as a patient, a staff member or an admin. Every patient and record is fictional.</p>
          </CtaBand>
          <div className="mt-8 flex justify-center"><span className="w-40" dangerouslySetInnerHTML={{ __html: botanical('w-full h-auto') }} /></div>
        </div>
      </Band>
    </>
  );
}

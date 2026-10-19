'use client';
import * as React from 'react';
import Link from 'next/link';
import { Pencil, Database, ChevronRight, Search } from 'lucide-react';
import { useApi, apiPath } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { DateNav } from '@/components/cb/date-nav';
import { EmptyState } from '@/components/cb/misc';
import { buttonVariants } from '@/components/ui/button';
import { Input, NativeSelect, Label } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { Accordion } from '@/components/ui/accordion';
import { MenuMealCard, type MenuMeal } from '@/components/public/menu-card';
import { plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PERIODS } from '@/domain/constants.js';
import { ACTIVE_DIET_CATEGORIES } from '@/domain/rules.js';

export type MenuFilters = { date: string; period: string; q: string; diet: string; type: string };
type Menu = { date: string; weekday: string; cycleDay: number; nutritionNote: string; periods: { id: string; label: string; meals: MenuMeal[] }[] };

const DIETS = (ACTIVE_DIET_CATEGORIES as { id: string; code: string; plain: string }[]).filter((d) => d.id !== 'regular');
const menuKey = (f: MenuFilters) => apiPath('/api/menu', { date: f.date, period: f.period, q: f.q.trim(), diet: f.diet, type: f.type });

export function MenuView({ initial, filters: start, today, canManage }: { initial: Menu; filters: MenuFilters; today: string; canManage: boolean }) {
  const [f, setF] = React.useState<MenuFilters>(start);
  const [qInput, setQInput] = React.useState(start.q);
  const key = menuKey(f);
  const initialKey = menuKey(start);
  const { data, error, isLoading } = useApi<Menu>(key, key === initialKey ? initial : undefined);
  const m = data ?? initial;
  const count = m.periods.reduce((s, p) => s + p.meals.length, 0);

  const update = (next: Partial<MenuFilters>) => setF((prev) => ({ ...prev, ...next }));
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.history.replaceState(null, '', apiPath('/menu', { date: f.date === today ? '' : f.date, period: f.period, q: f.q.trim(), diet: f.diet, type: f.type }));
  }, [f, today]);
  // Search updates after a short pause so typing stays smooth.
  React.useEffect(() => {
    const t = setTimeout(() => setF((prev) => (prev.q === qInput ? prev : { ...prev, q: qInput })), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const pill = 'min-h-11 rounded-full border px-4 py-2 font-display text-sm font-medium transition-colors aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground border-border bg-card text-heading hover:bg-mint';

  return (
    <>
      <PageHead eyebrow="Hospital kitchen" title="Hospital Meal Menu"
        actions={canManage ? <Link href="/menu/manage" className={buttonVariants({ variant: 'outline', size: 'sm' })}><Pencil aria-hidden />Menu management</Link> : null}>
        <p>Meals from the hospital kitchen by date and meal period. A <b>complete meal</b> combines several dishes; an <b>individual dish</b> is served on its own. Each shows its components, portions, nutrition (SFDA values where they exist), allergens and fit with the hospital diet categories.</p>
      </PageHead>
      <PageBody>
        <div className="grid gap-4 rounded-[20px] border border-border bg-card p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
          <div className="flex flex-col gap-1.5"><span className="font-display text-sm font-medium text-heading">Menu date</span><DateNav date={f.date} onChange={(d) => update({ date: d })} id="mn-date" label="Menu date" /></div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mn-q">Search</Label>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="mn-q" type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Meal, ingredient or cuisine" className="pl-9" maxLength={60} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 lg:grid-cols-[minmax(0,24rem)_minmax(0,16rem)]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mn-diet">Fits diet</Label>
              <NativeSelect id="mn-diet" value={f.diet} onChange={(e) => update({ diet: e.target.value })}>
                <option value="">All meals</option>
                {DIETS.map((d) => <option key={d.id} value={d.id}>{d.plain} ({d.code})</option>)}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mn-type">Type</Label>
              <NativeSelect id="mn-type" value={f.type} onChange={(e) => update({ type: e.target.value })}>
                <option value="">All</option>
                <option value="complete">Complete meals</option>
                <option value="single">Individual dishes</option>
              </NativeSelect>
            </div>
          </div>
        </div>

        <div role="group" aria-label="Meal period" className="flex flex-wrap gap-2">
          <button type="button" className={pill} aria-pressed={!f.period} onClick={() => update({ period: '' })}>All periods</button>
          {PERIODS.map((p: { id: string; label: string }) => <button key={p.id} type="button" className={pill} aria-pressed={f.period === p.id} onClick={() => update({ period: p.id })}>{p.label}</button>)}
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">{isLoading ? 'Updating the menu…' : `${plural(count, 'meal')} on the ${m.weekday} menu (cycle day ${m.cycleDay})`}</p>

        <Accordion className="rounded-[16px] border border-border bg-card" headClassName="min-h-11 px-4 py-3 font-display text-sm font-semibold text-heading"
          title={<span className="inline-flex items-center gap-2"><Database className="size-4" aria-hidden />Sources and limitations of this information</span>}>
          <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li><b>Nutrition:</b> {m.nutritionNote} Values are per standard serving; small is ½ and large 1½ of it.</li>
              <li><b>Allergens:</b> from ingredient data, using the 14 allergens SFDA requires food services to declare (SFDA.FD 56). Packaged products vary by brand, so the kitchen checks labels.</li>
              <li><b>Halal:</b> all meat and poultry are halal-certified, as overseen by the SFDA Saudi Halal Center.</li>
              <li><b>Calories on menus:</b> SFDA requires food service menus to show calories; CareBite shows energy first wherever SFDA values exist. “≥” marks a partial total for a complete meal where one component has no SFDA values.</li>
              <li><b>Diet compatibility:</b> each meal is screened against the documented rules with default limits. “Depends on limits” means potassium and phosphorus limits are set per patient. Patient-specific screening happens on each patient’s profile.</li>
              <li><b>Texture:</b> no IDDSI texture level is recorded for menu items, so texture-modified diets always need admin review.</li>
              <li><b>Local produce:</b> marked when an ingredient group has national self-sufficiency data (MEWA, GASTAT 2024).</li>
            </ul>
            <Link href="/diets" className="inline-flex w-fit items-center gap-1">See every diet category, rule and source <ChevronRight className="size-4" aria-hidden /></Link>
          </div>
        </Accordion>

        {error ? <Notice tone="danger" title="We couldn’t load the menu.">{error.message} Check your connection and try again.</Notice> : null}

        <div aria-busy={isLoading} className={cn('flex flex-col gap-10 transition-opacity', isLoading && 'opacity-60')}>
          {count > 0 ? m.periods.map((p) => (
            <section key={p.id} aria-labelledby={`mp-${p.id}`} className="flex flex-col gap-4">
              <h2 id={`mp-${p.id}`} className="flex flex-wrap items-baseline gap-x-3 border-b border-border pb-2 text-[1.5rem]">{p.label} <span className="font-sans text-sm font-normal text-muted-foreground">{plural(p.meals.length, 'meal')}</span></h2>
              {p.meals.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {p.meals.map((meal) => <MenuMealCard key={meal.id} meal={meal} href={apiPath(`/meal/${meal.id}`, { date: m.date, period: p.id })} />)}
                </div>
              ) : <p className="text-muted-foreground">No {p.label.toLowerCase()} meals match.</p>}
            </section>
          )) : f.q.trim() || f.diet || f.type || f.period ? <EmptyState title="No meals match these filters">Try a different search, diet or type, or choose <button type="button" className="underline" onClick={() => { setQInput(''); update({ q: '', diet: '', type: '', period: '' }); }}>all meals</button>.</EmptyState> : <EmptyState title="No meals on this menu">Choose another date.</EmptyState>}
        </div>
      </PageBody>
    </>
  );
}

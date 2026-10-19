import { publicMetadata } from '@/components/public/seo';
import { publicCall, param } from '@/lib/server/data';
import { getViewer } from '@/lib/server/session';
import { isoDate } from '@/lib/format';
import { SITE_URL } from '@/lib/site';
import { JsonLd } from '@/components/public/json-ld';
import { PERIODS } from '@/domain/constants.js';
import { ACTIVE_DIET_CATEGORIES } from '@/domain/rules.js';
import { MenuView, type MenuFilters } from './menu-view';

export const metadata = publicMetadata({
  title: 'Hospital Meal Menu',
  description: 'The demonstration hospital’s daily menu by meal period: complete meals and individual dishes with components, portions, SFDA nutrition values where they exist, the 14 SFDA allergens and fit with each hospital diet category.',
  path: '/menu',
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MenuPage({ searchParams }: Props) {
  const sp = await searchParams;
  const period = PERIODS.some((p: { id: string }) => p.id === param(sp.period)) ? param(sp.period)! : '';
  const diet = ACTIVE_DIET_CATEGORIES.some((d: { id: string }) => d.id !== 'regular' && d.id === param(sp.diet)) ? param(sp.diet)! : '';
  const type = ['single', 'complete'].includes(param(sp.type) ?? '') ? param(sp.type)! : '';
  const q = (param(sp.q) ?? '').slice(0, 60);
  const date = isoDate(param(sp.date));
  const [initial, viewer, today] = await Promise.all([
    publicCall((s) => s.getMenu({ date, period: period || null, q, diet: diet || null, type: type || null })),
    getViewer(),
    publicCall((s) => s.today() as string),
  ]);
  const filters: MenuFilters = { date: initial.date, period, q, diet, type };
  type Item = { id: string; name: string };
  const meals = [...new Map<string, Item>(initial.periods.flatMap((p: { meals: Item[] }) => p.meals).map((m: Item) => [m.id, m] as [string, Item])).values()];
  const list = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `Hospital meal menu, ${initial.weekday} ${initial.date}`, numberOfItems: meals.length,
    itemListElement: meals.slice(0, 50).map((m: { id: string; name: string }, i: number) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/meal/${m.id}`, name: m.name })),
  };
  return (
    <>
      <JsonLd data={list} />
      <MenuView initial={initial} filters={filters} today={today} canManage={Boolean(viewer?.permissions.includes('menu:manage-view'))} />
    </>
  );
}

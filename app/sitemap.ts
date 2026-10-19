import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { serviceCall } from '@/lib/server/data';

// Built per request from the live catalogue (staff can add meals), never at build time.
export const dynamic = 'force-dynamic';

const PAGES: [string, MetadataRoute.Sitemap[number]['changeFrequency'], number][] = [
  ['/', 'weekly', 1],
  ['/how-it-works', 'monthly', 0.8],
  ['/menu', 'daily', 0.9],
  ['/about', 'monthly', 0.7],
  ['/diets', 'monthly', 0.8],
  ['/sources', 'monthly', 0.7],
  ['/contact', 'yearly', 0.4],
  ['/privacy', 'yearly', 0.4],
  ['/disclaimer', 'yearly', 0.4],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const meals = await serviceCall((s) => s.catalog().list.map((m: { id: string; updatedAt?: string }) => ({ id: m.id, updatedAt: m.updatedAt ?? null })) as { id: string; updatedAt: string | null }[]);
  const now = new Date();
  return [
    ...PAGES.map(([path, changeFrequency, priority]) => ({ url: `${SITE_URL}${path === '/' ? '' : path}`, lastModified: now, changeFrequency, priority })),
    ...meals.map((m) => ({ url: `${SITE_URL}/meal/${encodeURIComponent(m.id)}`, lastModified: m.updatedAt ? new Date(m.updatedAt) : now, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const PRIVATE = ['/api/', '/patients', '/dashboard', '/requests', '/schedule', '/kitchen', '/menu/manage', '/staff-access', '/my-meals', '/my-requests', '/my-profile', '/settings', '/access-pending'];

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE }], sitemap: `${SITE_URL}/sitemap.xml`, host: SITE_URL };
}

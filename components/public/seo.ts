import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// A page that sets its own openGraph/twitter objects replaces the parent's, so
// the file-based app/opengraph-image would be lost below the root. Add it back.
const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'CareBite: personalized hospital meals that fit every patient' };

/** pageMetadata() plus the site's Open Graph / Twitter image. */
export function publicMetadata(opts: Parameters<typeof pageMetadata>[0]): Metadata {
  const m = pageMetadata(opts);
  return { ...m, openGraph: { ...m.openGraph, images: [OG_IMAGE] }, twitter: { ...m.twitter, images: [OG_IMAGE.url] } };
}

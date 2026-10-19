import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from './site';

const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph-image`;

/** Per-page metadata with a canonical URL and Open Graph tags. Private pages pass noindex. */
export function pageMetadata({ title, description = SITE_DESCRIPTION, path = '/', noindex = false, images }: { title?: string; description?: string; path?: string; noindex?: boolean; images?: string[] }): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Pages that set their own openGraph lose the file-based image, so it is added explicitly.
    openGraph: { type: 'website', siteName: SITE_NAME, title: title ? `${title} · ${SITE_NAME}` : SITE_NAME, description, url, locale: 'en_US', images: images ?? [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: title ? `${title} · ${SITE_NAME}` : SITE_NAME, description, images: images ?? [DEFAULT_OG_IMAGE] },
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/** Private, signed-in pages: never indexed, never cached by shared caches. */
export const privateMetadata = (title: string): Metadata => ({ title, robots: { index: false, follow: false, nocache: true } });

/** Serialise JSON-LD safely inside a <script> tag. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

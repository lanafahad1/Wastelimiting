import 'server-only';
import { headers } from 'next/headers';
import { jsonLd } from '@/lib/seo';

/** JSON-LD script with the per-request CSP nonce. */
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

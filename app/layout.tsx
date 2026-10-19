import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import './globals.css';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { Providers } from '@/components/site/providers';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, TEAM } from '@/lib/site';
import { jsonLd } from '@/lib/seo';

const poppins = localFont({
  variable: '--font-poppins',
  display: 'swap',
  src: [
    { path: './fonts/poppins-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/poppins-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/poppins-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/poppins-latin-700-normal.woff2', weight: '700' },
  ],
});
const nunito = localFont({
  variable: '--font-nunito',
  display: 'swap',
  src: [
    { path: './fonts/nunito-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/nunito-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/nunito-latin-700-normal.woff2', weight: '700' },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Personalized Hospital Meals`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: TEAM.map((name) => ({ name })),
  keywords: ['hospital nutrition', 'clinical nutrition', 'diet order', 'food allergies', 'patient meals', 'Saudi Arabia', 'SFDA', 'Health Informatics'],
  openGraph: { type: 'website', siteName: SITE_NAME, title: `${SITE_NAME}: Personalized Hospital Meals`, description: SITE_DESCRIPTION, url: SITE_URL, locale: 'en_US' },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME}: Personalized Hospital Meals`, description: SITE_DESCRIPTION },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFF9F7',
  colorScheme: 'light',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const org = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: 'en' },
      { '@type': 'EducationalOrganization', '@id': `${SITE_URL}/#project`, name: `${SITE_NAME} project team`, url: SITE_URL, member: TEAM.map((name) => ({ '@type': 'Person', name })) },
    ],
  };
  return (
    <html lang="en" className={`${poppins.variable} ${nunito.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only z-[70] rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <Providers nonce={nonce}>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">{children}</main>
          <SiteFooter />
        </Providers>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: jsonLd(org) }} />
      </body>
    </html>
  );
}

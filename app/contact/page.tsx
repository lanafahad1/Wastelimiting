import Link from 'next/link';
import { publicMetadata } from '@/components/public/seo';
import { TEAM, SITE_URL } from '@/lib/site';
import { AboutNav } from '@/components/cb/misc';
import { PageHead } from '@/components/site/page-head';
import { Notice } from '@/components/ui/notice';
import { JsonLd } from '@/components/public/json-ld';

const DESCRIPTION = 'CareBite was developed as a university Health Informatics project. How to reach the project team: through the course’s official channels. CareBite is not a medical service.';
export const metadata = publicMetadata({ title: 'Contact', description: DESCRIPTION, path: '/contact' });

export default function ContactPage() {
  const ld = { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact the project team', url: `${SITE_URL}/contact`, description: DESCRIPTION, about: { '@id': `${SITE_URL}/#project` } };
  return (
    <>
      <JsonLd data={ld} />
      <AboutNav current="/contact" />
      <PageHead eyebrow="Contact" title="Contact the project team" narrow>
        <p>CareBite was developed as a university Health Informatics project by:</p>
      </PageHead>
      <div className="container-page container-narrow pb-16">
        <div className="prose-cb">
          <ul className="!list-none !pl-0 grid gap-2 sm:grid-cols-2">
            {TEAM.map((n) => <li key={n} className="rounded-[14px] border border-border bg-card px-4 py-3 font-display font-medium text-heading">{n}</li>)}
          </ul>
          <h2>How to reach the team</h2>
          <p>The team has not published an email address, phone number or contact form on this site, so this page does not offer one and does not send messages. If you are reviewing CareBite as part of the university course, please contact the team through the course’s official channels (for example your course instructor or the course’s learning platform).</p>
          <Notice title="Not a medical service">The team cannot provide medical or dietary advice. For health questions, contact a qualified healthcare professional. In an emergency, alert clinical staff or emergency services.</Notice>
          <p className="text-sm text-muted-foreground">Looking for the citation? It is on <Link href="/sources">Data sources &amp; limitations</Link>.</p>
        </div>
      </div>
    </>
  );
}

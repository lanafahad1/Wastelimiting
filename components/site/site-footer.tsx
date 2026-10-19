import Link from 'next/link';
import { Logo } from './logo';
import { DISCLAIMER, TEAM } from '@/lib/site';

const COLS: [string, [string, string][]][] = [
  ['Explore', [['/how-it-works', 'How It Works'], ['/menu', 'Hospital Meal Menu'], ['/login', 'Try the demonstration']]],
  ['About & Sources', [['/about', 'About the project'], ['/diets', 'Diets & rules'], ['/sources', 'Data sources & limitations'], ['/contact', 'Contact']]],
  ['Trust', [['/privacy', 'Privacy Policy'], ['/disclaimer', 'Medical Disclaimer'], ['/settings', 'Your account & data']]],
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-blush pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="text-muted-foreground">Personalized hospital meal recommendations: patient diet orders, allergies and preferences matched to the hospital menu with documented rules based on Saudi government guidance (MOH, SFDA, MEWA, GFSA).</p>
          <p className="rounded-[16px] border border-rose bg-card p-4 text-sm text-muted-foreground"><b className="text-heading">Medical disclaimer.</b> {DISCLAIMER}</p>
        </div>
        {COLS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[.12em] text-rose-ink">{title}</h2>
            <ul className="flex flex-col gap-2">
              {links.map(([href, label]) => <li key={href}><Link href={href} className="text-foreground no-underline hover:text-heading hover:underline">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-page flex flex-col gap-1 border-t border-rose pt-5 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} CareBite · A university Health Informatics project · Fictional hospital and synthetic data only</span>
        <span>Project Development Team: <b className="font-semibold text-heading">{TEAM.join(' · ')}</b></span>
      </div>
    </footer>
  );
}

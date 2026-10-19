import Link from 'next/link';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_ACCOUNTS } from '@/domain/demo-data.js';
import { ROLES, label } from '@/domain/constants.js';
import { DemoAccountList, type DemoAccount } from './demo-accounts';
import { nextQuery } from './nav';

export const DEMO_PASSWORD = 'CareBite#2026';

/** Log in / Create account switch (two pages, so these are links, not ARIA tabs). */
function AuthSwitch({ mode, next }: { mode: 'login' | 'register'; next: string | null }) {
  const qs = nextQuery(next);
  const item = (href: string, active: boolean, text: string) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 flex-1 items-center justify-center rounded-full px-4 font-display text-sm font-medium no-underline transition-colors',
        active ? 'bg-card text-heading shadow-soft' : 'text-muted-foreground hover:text-heading',
      )}
    >
      {text}
    </Link>
  );
  return (
    <nav aria-label="Account" className="flex gap-1 rounded-full bg-blush p-1">
      {item(`/login${qs}`, mode === 'login', 'Log in')}
      {item(`/register${qs}`, mode === 'register', 'Create account')}
    </nav>
  );
}

function demoAccounts(): DemoAccount[] {
  return (DEMO_ACCOUNTS as Array<{ username: string; name: string; role: string; summary: string; patientDemoId?: string }>).map((a) => ({
    username: a.username, name: a.name, role: a.role, roleLabel: label(ROLES, a.role), summary: a.summary, patientDemoId: a.patientDemoId ?? null,
  }));
}

/** Shared frame for /login and /register: the form card and the demonstration panel. */
export function AuthShell({ mode, next, children }: { mode: 'login' | 'register'; next: string | null; children: React.ReactNode }) {
  const isLogin = mode === 'login';
  return (
    <div className="container-page grid items-start gap-6 pb-16 pt-6 sm:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-8">
        <AuthSwitch mode={mode} next={next} />
        <div className="flex flex-col gap-2">
          <span className="eyebrow">{isLogin ? 'Welcome back' : 'Join CareBite'}</span>
          <h1 className="text-[1.75rem] leading-tight sm:text-[2.1rem]">{isLogin ? 'Log in to CareBite' : 'Create your CareBite account'}</h1>
          <p className="text-muted-foreground">
            {isLogin
              ? 'Use your username or the email you registered with.'
              : 'CareBite is managed by the hospital. Patients join with a one-time link code from the nutrition team; staff ask for access, which an admin approves.'}
          </p>
        </div>
        {children}
        <p className="text-muted-foreground">
          {isLogin
            ? <>New to CareBite? <Link href={`/register${nextQuery(next)}`} className="font-semibold">Create an account</Link></>
            : <>Already have an account? <Link href={`/login${nextQuery(next)}`} className="font-semibold">Log in</Link></>}
        </p>
      </section>
      <AuthAside next={next} />
    </div>
  );
}

function AuthAside({ next }: { next: string | null }) {
  const accounts = demoAccounts();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section aria-labelledby="demo-h" className="flex flex-col gap-4 rounded-xl border border-rose bg-blush p-5 sm:p-6">
        <h2 id="demo-h" className="text-xl sm:text-[1.4rem]">Explore the demonstration hospital</h2>
        <p className="text-muted-foreground">
          <strong className="font-semibold text-foreground">Demonstration access:</strong> every patient, staff member and record is fictional, and no identity is verified. Each account shows what that role can see and do. Changes are shared by everyone using the same demo account.
        </p>
        <DemoAccountList accounts={accounts} password={DEMO_PASSWORD} next={next} />
        <p className="text-sm text-muted-foreground">
          Or log in manually with any demo username, for example <code className="rounded bg-card px-1.5 py-0.5 text-[.85em] text-heading">{accounts[0]?.username}</code>, and the shared password <code className="rounded bg-card px-1.5 py-0.5 text-[.85em] text-heading">{DEMO_PASSWORD}</code>.
        </p>
      </section>
      <section aria-labelledby="protect-h" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="protect-h" className="flex items-center gap-2 text-lg"><Lock aria-hidden className="size-5 text-sage-deep" />How accounts are protected</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          <li>Three roles: patients reach only their own meals; staff run daily meal service; admins control everything, including clinical information and staff access.</li>
          <li>Staff roles are assigned by an admin, never chosen at sign-up.</li>
          <li>Only an admin can change diet orders, allergies or medical restrictions. Patients send a request instead.</li>
          <li>Passwords are hashed with scrypt; sessions use an HttpOnly cookie that page scripts cannot read.</li>
        </ul>
      </section>
    </div>
  );
}

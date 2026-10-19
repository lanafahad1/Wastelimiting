import { redirect } from 'next/navigation';
import { getActor, homeFor } from '@/lib/server/session';
import { pageMetadata } from '@/lib/seo';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { safeNext } from '@/components/auth/nav';

export const metadata = pageMetadata({ title: 'Log in', description: 'Log in to CareBite with your username or email.', path: '/login', noindex: true });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext((await searchParams).next);
  const actor = await getActor();
  if (actor) redirect(next ?? homeFor(actor));
  return (
    <AuthShell mode="login" next={next}>
      <LoginForm next={next} />
    </AuthShell>
  );
}

import { redirect } from 'next/navigation';
import { getActor, homeFor } from '@/lib/server/session';
import { pageMetadata } from '@/lib/seo';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';
import { safeNext } from '@/components/auth/nav';

export const metadata = pageMetadata({ title: 'Create account', description: 'Create a CareBite patient account with a link code, or ask for hospital staff access.', path: '/register', noindex: true });

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const actor = await getActor();
  if (actor) redirect(next ?? homeFor(actor));
  const type = (Array.isArray(sp.type) ? sp.type[0] : sp.type) === 'staff' ? 'staff' : 'patient';
  return (
    <AuthShell mode="register" next={next}>
      <RegisterForm next={next} initialType={type} />
    </AuthShell>
  );
}

'use client';
// Shown when a patient account is not linked to a hospital meal profile yet:
// the patient enters the one-time link code the nutrition team gave them.
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { apiSend, ApiError } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';

export function LinkAccount() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const linkCode = String(new FormData(e.currentTarget).get('linkCode') ?? '');
    setBusy(true); setError(null);
    try {
      await apiSend('POST', '/api/account/link', { linkCode });
      toast('Your account is now linked to your meal profile.');
      router.refresh();
    } catch (err) {
      const ae = err as ApiError;
      if (ae.errors?.linkCode) setError(ae.errors.linkCode);
      else toast(ae.message, { tone: 'error' });
    } finally { setBusy(false); }
  }
  return (
    <>
      <PageHead eyebrow="My meals" title="Link your account to your meal profile" narrow>
        <p>Your account is not linked to a hospital meal profile yet. Ask the nutrition team for a one-time link code and enter it here.</p>
      </PageHead>
      <PageBody narrow>
        <Card>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <Field id="lk-code" label="Link code" error={error}>
              <Input name="linkCode" placeholder="ABCD-2345" autoCapitalize="characters" autoComplete="one-time-code" maxLength={12} />
            </Field>
            <Button type="submit" disabled={busy} className="w-full sm:w-fit"><Link2 aria-hidden />{busy ? 'Linking…' : 'Link my account'}</Button>
          </form>
        </Card>
      </PageBody>
    </>
  );
}

/** Other patient pages ask the patient to link their account on My Meals first. */
export function LinkFirst({ title }: { title: string }) {
  return (
    <PageHead title={title} narrow>
      <p>Link your account first on <Link href="/my-meals">My Meals</Link>.</p>
    </PageHead>
  );
}

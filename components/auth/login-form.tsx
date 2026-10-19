'use client';
import * as React from 'react';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ShowPassword, FormError, SubmitButton, focusFirstInvalid, type AuthError } from './form-bits';
import { useAfterSignIn } from './use-after-sign-in';

type Errors = Partial<Record<'identifier' | 'password', string>>;

function loginError(error: AuthError): string {
  // Never say which part was wrong (no account enumeration).
  if (error?.code === 'INVALID_EMAIL') return 'The username, email or password is incorrect.';
  return authErrorMessage(error);
}

export function LoginForm({ next }: { next: string | null }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const after = useAfterSignIn(next);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const id = identifier.trim();
    const errs: Errors = {};
    if (!id) errs.identifier = 'Enter your username or email.';
    if (!password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) { focusFirstInvalid(formRef.current); return; }

    setPending(true);
    const { data, error } = id.includes('@')
      ? await authClient.signIn.email({ email: id, password })
      : await authClient.signIn.username({ username: id, password });
    if (error || !data) {
      setPending(false);
      if (error?.status !== 429) setPassword('');
      setFormError(loginError(error));
      return;
    }
    const user = data.user as { name?: string; role?: string | null; status?: string | null };
    toast(user.name ? `Welcome back, ${user.name}.` : 'Welcome back.');
    after(user);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <Field id="login-identifier" label="Username or email" error={errors.identifier}>
        <Input
          name="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={120} required
        />
      </Field>
      <Field id="login-password" label="Password" error={errors.password}>
        <Input
          name="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" maxLength={128} required
        />
      </Field>
      <ShowPassword id="login-show" checked={show} onChange={setShow} />
      <FormError message={formError} />
      <SubmitButton pending={pending} pendingLabel="Logging in…" size="lg" className="w-full">Log in</SubmitButton>
    </form>
  );
}

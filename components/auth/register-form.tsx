'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { PASSWORD_RULE, USERNAME_RULE, USERNAME_RE, passwordProblem } from '@/lib/password-policy';
import { Field, OptionCard } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import { Notice } from '@/components/ui/notice';
import { Button } from '@/components/ui/button';
import { SuccessCheck } from '@/components/ui/success-check';
import { toast } from '@/components/ui/toast';
import { ShowPassword, FormError, SubmitButton, focusFirstInvalid, type AuthError } from './form-bits';
import { useAfterSignIn } from './use-after-sign-in';

type AccountType = 'patient' | 'staff';
type Key = 'name' | 'username' | 'email' | 'password' | 'confirmPassword' | 'linkCode' | 'requestedRole' | 'requestNote' | 'terms' | 'accountType';
type Errors = Partial<Record<Key, string>>;
type Values = Record<Exclude<Key, 'terms' | 'accountType'>, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MSG = `Usernames use ${USERNAME_RULE.charAt(0).toLowerCase()}${USERNAME_RULE.slice(1)}`;
const EMPTY: Values = { name: '', username: '', email: '', password: '', confirmPassword: '', linkCode: '', requestedRole: '', requestNote: '' };

function validate(v: Values, type: AccountType, terms: boolean): Errors {
  const e: Errors = {};
  const username = v.username.trim();
  const email = v.email.trim();
  if (!username) e.username = 'Please choose a username.';
  else if (!USERNAME_RE.test(username)) e.username = USERNAME_MSG;
  if (!email) e.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(email)) e.email = 'Please enter a valid email address, for example name@example.com.';
  if (!v.password) e.password = 'Please choose a password.';
  else { const p = passwordProblem(v.password, { username, email }); if (p) e.password = p; }
  if (v.confirmPassword !== v.password) e.confirmPassword = 'The two passwords do not match.';
  if (type === 'patient' && !v.linkCode.trim()) e.linkCode = 'Enter the link code the nutrition team gave you.';
  if (type === 'staff') {
    if (!v.name.trim()) e.name = 'Enter your name.';
    if (!v.requestedRole) e.requestedRole = 'Choose the job you are asking access for.';
    if (!v.requestNote.trim()) e.requestNote = 'Tell the admin your department or job title.';
  }
  if (!terms) e.terms = 'Please confirm you have read the Privacy Policy and Medical Disclaimer.';
  return e;
}

/** Map a better-auth sign-up error to field messages (our hook sends `errors`; built-in checks send a code). */
function serverErrors(error: AuthError): { fields: Errors; form: string | null } {
  if (error?.errors && Object.keys(error.errors).length) return { fields: error.errors as Errors, form: null };
  switch (error?.code) {
    case 'USERNAME_IS_ALREADY_TAKEN': return { fields: { username: 'This username is already taken. Please choose another.' }, form: null };
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL': return { fields: { email: 'An account with this email already exists. Try logging in instead.' }, form: null };
    case 'INVALID_USERNAME':
    case 'USERNAME_TOO_SHORT':
    case 'USERNAME_TOO_LONG': return { fields: { username: USERNAME_MSG }, form: null };
    case 'INVALID_EMAIL': return { fields: { email: 'Please enter a valid email address, for example name@example.com.' }, form: null };
    case 'PASSWORD_TOO_SHORT': return { fields: { password: 'Use at least 8 characters.' }, form: null };
    case 'PASSWORD_TOO_LONG': return { fields: { password: 'Passwords can be at most 128 characters.' }, form: null };
    default: return { fields: {}, form: authErrorMessage(error) };
  }
}

export function RegisterForm({ next, initialType }: { next: string | null; initialType: AccountType }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [type, setType] = React.useState<AccountType>(initialType);
  const [v, setV] = React.useState<Values>(EMPTY);
  const [terms, setTerms] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<{ type: AccountType; user: { role?: string | null; status?: string | null } } | null>(null);
  const after = useAfterSignIn(type === 'patient' ? next : null);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => after(done.user), 1600);
    return () => clearTimeout(t);
  }, [done, after]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const errs = validate(v, type, terms);
    setErrors(errs);
    if (Object.keys(errs).length) { focusFirstInvalid(formRef.current); return; }

    setPending(true);
    const username = v.username.trim();
    const body = {
      email: v.email.trim().toLowerCase(),
      password: v.password,
      // The server requires a display name; patients may leave it empty and show their username instead.
      name: (v.name.trim() || username).slice(0, 40),
      username,
      accountType: type,
      ...(type === 'patient'
        ? { linkCode: v.linkCode.trim().toUpperCase() }
        : { requestedRole: v.requestedRole, requestNote: v.requestNote.trim() }),
    };
    const { data, error } = await authClient.signUp.email(body as Parameters<typeof authClient.signUp.email>[0]);
    if (error || !data) {
      setPending(false);
      const { fields, form } = serverErrors(error as AuthError);
      setErrors(fields);
      setFormError(form);
      if (Object.keys(fields).length) focusFirstInvalid(formRef.current);
      return;
    }
    setV(EMPTY);
    const user = data.user as { role?: string | null; status?: string | null };
    toast(user.role === 'patient' ? 'Account created and linked to your meal profile.' : 'Access request sent. An admin will review it.', { timeout: 7000 });
    setDone({ type, user });
  };

  if (done) {
    const patient = done.user.role === 'patient';
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-[18px] border border-sage bg-mint p-5">
        <SuccessCheck />
        <h2 className="text-xl">{patient ? 'Your account is ready' : 'Access request sent'}</h2>
        <p className="text-sage-deep">
          {patient
            ? 'Your account is linked to your hospital meal profile. Taking you to your meals…'
            : 'An admin will review your request and assign your role. Taking you to your request status…'}
        </p>
        <Button onClick={() => after(done.user)}>Continue<ArrowRight aria-hidden /></Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5" aria-busy={pending || undefined}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-sm font-medium text-heading">Account type</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionCard name="accountType" value="patient" checked={type === 'patient'} onChange={() => { setType('patient'); setErrors({}); }} title="Patient" description="Use the link code the nutrition team gave you to reach your own profile." />
          <OptionCard name="accountType" value="staff" checked={type === 'staff'} onChange={() => { setType('staff'); setErrors({}); }} title="Hospital staff" description="Ask for staff access. An admin approves it and assigns your role." />
        </div>
        {errors.accountType ? <p role="alert" className="text-sm font-semibold text-destructive">{errors.accountType}</p> : null}
      </fieldset>

      {type === 'patient' ? (
        <>
          <Field id="reg-link" label="Link code" error={errors.linkCode} hint="A one-time code from the nutrition team (valid for 72 hours). It connects this account to your hospital meal profile.">
            <Input name="linkCode" value={v.linkCode} onChange={set('linkCode')} autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={12} placeholder="ABCD-2345" className="uppercase tracking-wider placeholder:normal-case" />
          </Field>
          <Field id="reg-name" label="Your name" optional error={errors.name} hint="Shown on your meal pages. If you leave it empty, your username is shown.">
            <Input name="name" value={v.name} onChange={set('name')} autoComplete="given-name" maxLength={40} />
          </Field>
        </>
      ) : (
        <>
          <Notice tone="warn" title="Demonstration access.">
            This creates an access request, not a working staff account. An admin approves it and assigns the role. CareBite does not verify identity; a real hospital would issue staff accounts through its own identity system.
          </Notice>
          <Field id="reg-name" label="Your full name" error={errors.name} hint="As the admin will know you. Shown in the audit log next to the changes you make.">
            <Input name="name" value={v.name} onChange={set('name')} autoComplete="name" maxLength={40} />
          </Field>
          <Field id="reg-role" label="Access you are asking for" error={errors.requestedRole} hint="Information for the admin only. It does not grant access.">
            <NativeSelect name="requestedRole" value={v.requestedRole} onChange={set('requestedRole')}>
              <option value="">Choose…</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </NativeSelect>
          </Field>
          <Field id="reg-note" label="Department or job title" error={errors.requestNote} hint="For example: Clinical nutrition, Ward 3A.">
            <Input name="requestNote" value={v.requestNote} onChange={set('requestNote')} autoComplete="organization-title" maxLength={200} />
          </Field>
        </>
      )}

      <Field id="reg-username" label="Username" error={errors.username} hint={USERNAME_RULE}>
        <Input name="username" value={v.username} onChange={set('username')} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} required />
      </Field>
      <Field id="reg-email" label="Email" error={errors.email}>
        <Input name="email" type="email" inputMode="email" value={v.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={120} required />
      </Field>
      <Field id="reg-password" label="Password" error={errors.password} hint={PASSWORD_RULE}>
        <Input name="password" type={show ? 'text' : 'password'} value={v.password} onChange={set('password')} autoComplete="new-password" maxLength={128} required />
      </Field>
      <Field id="reg-confirm" label="Confirm password" error={errors.confirmPassword}>
        <Input name="confirmPassword" type={show ? 'text' : 'password'} value={v.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" maxLength={128} required />
      </Field>
      <ShowPassword id="reg-show" checked={show} onChange={setShow} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-terms" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            id="reg-terms" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)}
            aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? 'reg-terms-error' : undefined}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>I have read the <Link href="/privacy">Privacy Policy</Link> and the <Link href="/disclaimer">Medical Disclaimer</Link>, and I understand CareBite is an educational project using a fictional hospital.</span>
        </label>
        {errors.terms ? <p id="reg-terms-error" role="alert" className="text-sm font-semibold text-destructive">{errors.terms}</p> : null}
      </div>

      <FormError message={formError} />
      <SubmitButton pending={pending} pendingLabel="Creating account…" size="lg" className="w-full">Create account</SubmitButton>
    </form>
  );
}

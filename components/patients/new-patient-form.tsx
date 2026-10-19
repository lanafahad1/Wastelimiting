'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft } from 'lucide-react';
import { apiSend } from '@/lib/api-client';
import { PageHead, PageBody } from '@/components/site/page-head';
import { SectionFields, readSection, type Section } from '@/components/forms/profile-sections';
import { FormErrors } from '@/components/forms/errors';
import { Button, buttonVariants } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { toast } from '@/components/ui/toast';
import { useSubmit, useRevalidate, FormMessage } from './common';

/* eslint-disable @typescript-eslint/no-explicit-any */

const STEPS: [Section, string, string][] = [
  ['details', '1. Patient details', 'Use fictional information only.'],
  ['clinical', '2. Record dietary requirements', 'Conditions, the prescribed diet and restrictions entered by the care team, and allergies and intolerances recorded separately.'],
  ['preferences', '3. Add preferences', 'Preferred cuisines and foods, disliked ingredients and preferred portion.'],
  ['appetite', '4. Current appetite', 'Used with the preferred portion to suggest portions within the prescribed plan.'],
];

export function NewPatientForm({ reference, blank }: { reference: any; blank: any }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const { busy, errors, formError, run } = useSubmit();
  const revalidate = useRevalidate();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    // Field names do not overlap between sections, so each section reads from the whole form.
    const input = { ...readSection('details', form), ...readSection('clinical', form), preferences: readSection('preferences', form), appetite: readSection('appetite', form) };
    run(async () => {
      const res = await apiSend<{ patient: { id: string; demoId: string }; warnings?: string[] }>('POST', '/api/patients', input);
      toast(`Profile ${res.patient.demoId} created.`);
      for (const w of res.warnings ?? []) toast(w, { tone: 'warn', timeout: 8000 });
      void revalidate();
      router.push(`/patients/${res.patient.id}`);
    }, formRef.current);
  };

  return (
    <>
      <div className="container-page container-narrow pt-6">
        <Link href="/patients" className="inline-flex items-center gap-1 text-sm"><ChevronLeft className="size-4" aria-hidden /> Patient Overview</Link>
      </div>
      <PageHead narrow eyebrow="Admin" title="New patient nutrition profile" className="pt-3 sm:pt-4">
        <p>Record the patient’s dietary requirements first. CareBite screens the hospital menu against them before preferences are used.</p>
      </PageHead>
      <PageBody narrow>
        <Notice tone="warn" title="Demonstration only">Never enter real patient names, record numbers or health information. Use a CB-#### identifier.</Notice>
        <FormErrors errors={errors}>
          <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6" aria-describedby={formError ? 'np-error' : undefined}>
            {STEPS.map(([section, title, hint]) => (
              <section key={section} aria-labelledby={`np-${section}`} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
                <div className="flex flex-col gap-1">
                  <h2 id={`np-${section}`} className="text-xl">{title}</h2>
                  <p className="text-sm text-muted-foreground">{hint}</p>
                </div>
                <SectionFields section={section} p={blank} reference={reference} />
              </section>
            ))}
            <div id="np-error"><FormMessage message={formError} /></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto"><Check aria-hidden />{busy ? 'Creating profile…' : 'Create profile and screen meals'}</Button>
              <Link href="/patients" className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'w-full sm:w-auto' })}>Cancel</Link>
            </div>
          </form>
        </FormErrors>
      </PageBody>
    </>
  );
}

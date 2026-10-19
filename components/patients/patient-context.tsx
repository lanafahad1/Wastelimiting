'use client';
import * as React from 'react';
import type { Section } from '@/components/forms/profile-sections';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What a staff intake dialog records: one delivered meal. */
export type IntakeTarget = { date: string; period: string; mealName: string; portion: string | null; deliveredAt?: string | null; existing: any | null; hasPatientRecord: boolean };
export type RequestPrefill = { type?: string; date?: string; period?: string; message?: string };

/** Every dialog the profile can open. `n` identifies one opening, so its form starts fresh. */
export type Dlg =
  | { kind: 'offer'; period: string }
  | { kind: 'confirm'; period: string; mealId?: string | null; replace?: boolean }
  | { kind: 'select'; period: string }
  | { kind: 'hold'; period: string }
  | { kind: 'reason'; title: string; intro: React.ReactNode; label: string; button: string; danger?: boolean; placeholder?: string; onSubmit: (note: string) => Promise<void> }
  | { kind: 'intake'; target: IntakeTarget }
  | { kind: 'request'; prefill?: RequestPrefill }
  | { kind: 'section'; section: Section; prefill?: { patient: any; requestId: string; note: string } }
  | { kind: 'respond'; requestId: string; suggestion?: string }
  | { kind: 'readmit' }
  | { kind: 'linkcode'; code: string; expiresAt: string; hours: number }
  | { kind: 'unlink' }
  | { kind: 'delete' };
export type DlgKind = Dlg['kind'];
export type Opened<K extends DlgKind = DlgKind> = Extract<Dlg, { kind: K }> & { n: number };

export type PatientCtx = {
  id: string;
  record: any;
  day: any;
  date: string;
  reference: any;
  discharged: boolean;
  dayLoading: boolean;
  can: (permission: string) => boolean;
  /**
   * Open a dialog. `from` is the control that opened it (focus returns there on close);
   * `fallback` is the id of the element to focus when that control no longer exists.
   */
  open: (d: Dlg, focus?: { from?: HTMLElement | null; fallback?: string }) => void;
  close: () => void;
  refresh: () => Promise<unknown>;
  setDate: (date: string) => void;
  goToMeal: (date: string, period: string) => void;
};

export const Ctx = React.createContext<PatientCtx | null>(null);
export function usePatient() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('usePatient must be used inside the patient profile.');
  return c;
}

/** Props of every dialog component. */
export type DialogProps<K extends DlgKind> = { a: Opened<K>; open: boolean; finalFocus: () => HTMLElement | boolean | null };

export const P = (id: string, path = '') => `/api/patients/${encodeURIComponent(id)}${path}`;

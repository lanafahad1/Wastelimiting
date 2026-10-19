// Small helpers for the patient pages (wording follows the old SPA).
import * as React from 'react';
import { addDays } from '@/domain/dates.js';
import { formatDate } from '@/lib/format';

/** Rewrite staff-facing engine text ("the patient’s preferred cuisine") for the patient ("your preferred cuisine"). */
export const you = (t: string) => t.replace(/the patient’s|the patient's/g, 'your').replace(/The patient/g, 'You').replace(/the patient/g, 'you');

/** "Today", "Tomorrow", "Yesterday" or the weekday name. */
export const dayName = (d: string, today: string) => (d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : d === addDays(today, -1) ? 'Yesterday' : formatDate(d, { weekday: 'long' }));

export const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** A timestamp shown in the viewer's local time (server and browser time zones may differ). */
export function Time({ iso }: { iso: string }) {
  return <time dateTime={iso} suppressHydrationWarning>{when(iso)}</time>;
}

export const PERMISSION_TEXT = 'You can update your food preferences and appetite. Changes to your prescribed diet or allergies must be reviewed by your nutrition team.';

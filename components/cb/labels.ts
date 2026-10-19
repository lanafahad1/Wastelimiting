// Label helpers shared by server and client components.
import { ALLERGENS, PERIODS, PORTIONS, APPETITE, INTAKE_AMOUNTS, REFUSAL_REASONS, REQUEST_TYPES, REQUEST_STATUS, ENTRY_STATUS, label } from '@/domain/constants.js';

export const allergenName = (id: string) => label(ALLERGENS, id).toLowerCase();
export const periodLabel = (id: string) => label(PERIODS, id);
export const portionLabel = (id?: string | null) => (id ? label(PORTIONS, id) : '');
export const appetiteLabel = (id: string) => label(APPETITE, id);
export const amountLabel = (id: string) => label(INTAKE_AMOUNTS, id);
export const reasonLabel = (id: string) => label(REFUSAL_REASONS, id);
export const requestLabel = (id: string) => label(REQUEST_TYPES, id);
export const requestStatusLabel = (id: string) => label(REQUEST_STATUS, id);
export const entryStatusLabel = (id: string) => label(ENTRY_STATUS, id);
export const ROLE_LABEL: Record<string, string> = { admin: 'Admin', staff: 'Staff', patient: 'Patient', system: 'CareBite' };
export const roleLabel = (r?: string | null) => (r ? ROLE_LABEL[r] ?? r : 'CareBite');

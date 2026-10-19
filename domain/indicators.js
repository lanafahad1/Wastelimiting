// Indicators from recorded intake and feedback. They describe what was
// recorded; they are prompts for the nutrition team, not clinical assessments,
// and they do not show why intake changed.
//
// A meal can have two observations: the patient's own report and a staff
// observation. They are kept as separate records and combined into ONE meal
// outcome for every summary, using this documented rule (OUTCOME_RULE):
//   • accepted / refused and the estimated amount eaten: the staff observation
//     when there is one, otherwise the patient's report;
//   • satisfaction: the patient's own rating when there is one, otherwise a
//     rating staff recorded on the patient's behalf;
//   • measured food waste (grams): weighed by staff only;
//   • reasons: every reason given in either record.

import { INTAKE_AMOUNTS, PERIOD_IDS, REFUSAL_REASONS } from './constants.js';
import { INTAKE_FLAG_RULES } from './rules.js';
import { addDays } from './dates.js';

export const OUTCOME_RULE = [
  'Each meal is counted once, even when both the patient and staff recorded it.',
  'Accepted or refused, and the estimated amount eaten: the staff observation when recorded, otherwise the patient’s report.',
  'Satisfaction: the patient’s own rating when given, otherwise a rating staff recorded on the patient’s behalf.',
  'Measured food waste: weighed by staff only. It is never derived from the estimated amount eaten.',
];

const shareOf = (amount) => INTAKE_AMOUNTS.find((a) => a.id === amount)?.share ?? null;
export const byMealTime = (a, b) => a.date.localeCompare(b.date) || PERIOD_IDS.indexOf(a.period) - PERIOD_IDS.indexOf(b.period);
const mean = (xs) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null);

/** Combine intake records into one outcome per patient meal (see OUTCOME_RULE). */
export function mealOutcomes(records) {
  const groups = new Map();
  for (const r of records) {
    const k = `${r.patientId}|${r.date}|${r.period}`;
    const g = groups.get(k) ?? { patientId: r.patientId, date: r.date, period: r.period, patient: null, staff: null };
    g[r.source === 'staff' ? 'staff' : 'patient'] = r;
    groups.set(k, g);
  }
  return [...groups.values()].map((g) => {
    const obs = g.staff ?? g.patient;
    const rating = g.patient?.satisfaction != null ? g.patient : g.staff?.satisfaction != null ? g.staff : null;
    return {
      patientId: g.patientId, date: g.date, period: g.period,
      mealId: obs.mealId, mealName: obs.mealName ?? null, portion: obs.portion,
      accepted: obs.accepted, amount: obs.amount, amountSource: g.staff ? 'staff' : 'patient',
      appetiteBefore: (g.staff ?? g.patient).appetiteBefore ?? g.patient?.appetiteBefore ?? null,
      satisfaction: rating?.satisfaction ?? null, satisfactionSource: rating ? rating.source : null,
      measuredWasteG: g.staff?.measuredWasteG ?? null,
      reasons: [...new Set([...(g.staff?.reasons ?? []), ...(g.patient?.reasons ?? [])])],
      sources: [g.patient && 'patient', g.staff && 'staff'].filter(Boolean),
      patientRecord: g.patient, staffRecord: g.staff,
    };
  }).sort(byMealTime);
}

/** Review prompts raised from one patient's meal outcomes. */
export function intakeFlags(outcomes, today) {
  const out = [];
  for (const rule of INTAKE_FLAG_RULES) {
    const recent = outcomes.filter((r) => r.date <= today && r.date > addDays(today, -rule.days)).sort(byMealTime).slice(-rule.window);
    const hits = rule.id === 'INTAKE-REFUSAL' ? recent.filter((r) => !r.accepted) : recent.filter((r) => r.amount === 'none' || r.amount === 'some');
    if (hits.length >= rule.min) {
      const what = rule.id === 'INTAKE-REFUSAL' ? 'refused' : 'recorded as none or some eaten';
      out.push({ code: rule.id, ruleId: rule.id, title: rule.title, text: `${hits.length} of the last ${recent.length} recorded meals were ${what}.` });
    }
  }
  return out;
}

/** Day-by-day indicators across many patients' meal outcomes, for `days` days ending today. */
export function intakeTrends(outcomes, today, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const rs = outcomes.filter((r) => r.date === date);
    const accepted = rs.filter((r) => r.accepted);
    const rated = rs.filter((r) => r.satisfaction != null);
    const measured = rs.filter((r) => r.measuredWasteG != null);
    const amounts = Object.fromEntries(INTAKE_AMOUNTS.map((a) => [a.id, rs.filter((r) => r.amount === a.id).length]));
    out.push({
      date,
      recorded: rs.length,
      both: rs.filter((r) => r.sources.length === 2).length,
      accepted: accepted.length,
      acceptanceRate: rs.length ? Math.round((accepted.length / rs.length) * 100) : null,
      satisfaction: mean(rated.map((r) => r.satisfaction)),
      rated: rated.length,
      amounts,
      // Estimated leftovers: share of the served portion not eaten, as estimated by the patient or staff (not weighed).
      estimatedLeftoverShare: rs.length ? Math.round((1 - mean(rs.map((r) => shareOf(r.amount) ?? 0))) * 100) : null,
      // Measured waste: plate waste weighed by staff, kept separate from estimates.
      measuredTrays: measured.length,
      measuredWasteG: measured.length ? Math.round(measured.reduce((s, r) => s + r.measuredWasteG, 0)) : null,
    });
  }
  return out;
}

/** How often each reason was given across refused or partly eaten meals. */
export function reasonCounts(outcomes) {
  return REFUSAL_REASONS.map((r) => ({ id: r.id, label: r.label, count: outcomes.filter((x) => (x.reasons ?? []).includes(r.id)).length })).filter((r) => r.count);
}

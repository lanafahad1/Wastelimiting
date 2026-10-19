// The hospital menu for a calendar date: the 7-day menu cycle, with any
// date-specific changes the kitchen or admin has made for that date.
//   menu = { cycle: [ { breakfast: [mealIds], lunch: [...], ... } × 7 (Monday first) ],
//            dates: { 'YYYY-MM-DD': { lunch: [mealIds], ... } } }

import { weekdayIndex, WEEKDAYS } from './dates.js';
import { PERIODS, PERIOD_IDS } from './constants.js';

/** Meal ids on the menu for a date, by period. */
export function menuFor(menu, iso) {
  const base = menu.cycle[weekdayIndex(iso)] ?? {};
  const over = menu.dates?.[iso] ?? {};
  return Object.fromEntries(PERIOD_IDS.map((p) => [p, [...(over[p] ?? base[p] ?? [])]]));
}

/** True when the date has its own menu for that period (not the cycle). */
export const isDateSpecific = (menu, iso, period) => Boolean(menu.dates?.[iso]?.[period]);

export function menuDay(menu, iso) {
  const day = weekdayIndex(iso);
  const m = menuFor(menu, iso);
  return { date: iso, weekday: WEEKDAYS[day], cycleDay: day + 1, periods: PERIODS.map((p) => ({ ...p, mealIds: m[p.id], dateSpecific: isDateSpecific(menu, iso, p.id) })) };
}

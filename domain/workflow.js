// Meal workflow for one patient meal period (a schedule entry):
//
//   Options offered → Patient choice submitted → Confirmed by nutrition team → Prepared → Delivered
//
// plus two side states: On hold (a change made the meal unsafe or uncertain;
// it cannot move forward until reviewed) and Cancelled. Every step records who
// did it and when (entry.history). Changes after an order are recorded as
// change flags (entry.changes) with what changed, whether the order has been
// reviewed, and whether the kitchen has acknowledged it. Delivered and past
// meals are never changed. Delivery is not intake: intake is recorded
// separately once a meal has been delivered.

import { evaluateMeal } from './engine.js';
import { can } from './rbac.js';
import { mealSummary } from './catalog.js';
import { menuDay, menuFor } from './menu.js';
import { ingredientRequirements } from './production.js';
import { clean } from './patient.js';
import { PERIODS, PERIOD_IDS, PORTIONS, portionFactor, ENTRY_STATUS, CHANGE_CAUSES, SERVICE_TIMES, WARDS, INGREDIENT_GROUPS, label } from './constants.js';
import { addDays, weekdayIndex, WEEKDAYS } from './dates.js';
import { LOCAL_PRODUCTION, LOCAL_PRODUCTION_SOURCES } from '../data/local-production.js';

const OPEN = ['offered', 'selected', 'confirmed', 'prepared', 'on-hold'];
const ON_KITCHEN_LIST = ['confirmed', 'prepared', 'delivered'];
const statusLabel = (s) => label(ENTRY_STATUS, s);
const periodName = (p) => label(PERIODS, p).toLowerCase();

export function createWorkflow(ctx) {
  const { repo, today, stamp, uid, deny, invalid, conflict, requirePermission, catalog, getPatientOr404, accessPatient, assertAdmitted, getMealOr404, assertPeriod, assertDate, scheduleWindow, audit, outcomesOf, onMenu, menuIds, forScreening, screen, brief, withMeal } = ctx;

  // ------------------------------------------------------------ entry helpers
  const mealName = (id) => catalog().byId[id]?.name ?? id;
  function event(entry, actor, action, note = null) {
    entry.history = [...(entry.history ?? []), {
      at: stamp(), by: actor?.name ?? 'CareBite', role: actor?.role ?? 'system', action, status: entry.status,
      mealId: entry.selectedMealId ?? null, mealName: entry.mealName ?? null, portion: entry.portion ?? null, note,
    }];
  }
  const blank = (p, date, period) => ({
    patientId: p.id, date, period, status: null, holdFrom: null, offers: [], selectedMealId: null, mealName: null, mealVersion: null, portion: null,
    selectedBy: null, selectedByRole: null, selectedAt: null, confirmedBy: null, confirmedByRole: null, confirmedAt: null, confirmMode: null,
    preparedBy: null, preparedAt: null, deliveredBy: null, deliveredByRole: null, deliveredAt: null, cancelledReason: null, replaces: null,
    changes: [], history: [], createdAt: stamp(), updatedAt: stamp(),
  });
  const save = (entry) => repo.saveEntry({ ...entry, updatedAt: stamp() });
  const openHoldChanges = (entry) => (entry.changes ?? []).filter((c) => !c.reviewed);
  /** Mark open change flags as reviewed, with what was done. */
  function resolveChanges(entry, actor, resolution) {
    entry.changes = (entry.changes ?? []).map((c) => (c.reviewed ? c : {
      ...c, reviewed: true, reviewedBy: actor.name, reviewedByRole: actor.role, reviewedAt: stamp(), resolution,
      // The kitchen must see the outcome of a change that touched its list.
      kitchenAck: c.kitchenAffected ? null : c.kitchenAck,
    }));
  }
  function addChange(entry, { cause, change, details = [], hold, kitchenAffected, reviewed = false, actor = null, resolution = null }) {
    entry.changes = [...(entry.changes ?? []), {
      id: uid('chg'), at: stamp(), cause, causeLabel: label(CHANGE_CAUSES, cause), change, details,
      mealId: entry.selectedMealId ?? null, mealName: entry.mealName ?? null, portion: entry.portion ?? null,
      previousStatus: entry.status === 'on-hold' ? entry.holdFrom : entry.status, hold: Boolean(hold), kitchenAffected: Boolean(kitchenAffected),
      reviewed, reviewedBy: reviewed ? actor?.name ?? null : null, reviewedByRole: reviewed ? actor?.role ?? null : null, reviewedAt: reviewed ? stamp() : null,
      resolution, kitchenAck: null,
    }];
  }
  const wasOnKitchenList = (entry) => ['confirmed', 'prepared'].includes(entry.status === 'on-hold' ? entry.holdFrom : entry.status)
    || (entry.changes ?? []).some((c) => !c.reviewed && c.kitchenAffected);

  function offerView(o) { return { ...o, meal: withMeal(o.mealId) }; }
  function entryView(entry) {
    if (!entry) return null;
    const s = ENTRY_STATUS.find((x) => x.id === entry.status);
    return {
      ...entry, statusLabel: s?.label ?? entry.status, statusHint: s?.hint ?? '',
      offers: entry.offers.map(offerView),
      selectedMeal: entry.selectedMealId ? withMeal(entry.selectedMealId) : null,
      openChanges: openHoldChanges(entry),
    };
  }

  /** Screen one offer for a patient now. Returns a problem text, or null when it still passes. */
  function offerProblem(p, entry, offer, outcomes, { selected = false } = {}) {
    const meal = catalog().byId[offer.mealId];
    if (!meal) return 'is no longer on the hospital menu';
    if (!meal.available) return `was marked unavailable by the kitchen${meal.unavailableReason ? ` (${meal.unavailableReason})` : ''}`;
    if (!onMenu(entry.date, entry.period, offer.mealId)) return `was removed from the ${periodName(entry.period)} menu for ${entry.date}`;
    const ev = evaluateMeal(meal, forScreening(p), { catalog: catalog(), period: entry.period, intake: outcomes });
    if (ev.status === 'excluded') return `no longer passes screening: ${ev.exclusions[0].message}`;
    if (ev.status === 'review' && offer.screenedAs !== 'review') return `now needs admin review: ${ev.reviewReasons[0].message}`;
    const allowed = offer.screenedAs === 'review' ? ev.portion.permitted : ev.portion.eligible;
    if (selected && entry.portion && !allowed.includes(entry.portion)) return `can no longer be served as a ${entry.portion} portion (permitted: ${allowed.join(', ') || 'none'})`;
    return null;
  }

  /**
   * Screen upcoming entries again after a change. Options that no longer pass
   * are withdrawn; a chosen, confirmed or prepared meal that no longer passes is
   * put on hold. Returns the entries that changed.
   */
  function recheckEntries(actor, entries, { cause, change }) {
    const out = [];
    const patients = new Map();
    for (const e0 of entries) {
      if (!OPEN.includes(e0.status) || e0.date < today()) continue;
      const p = patients.get(e0.patientId) ?? getPatientOr404(e0.patientId);
      patients.set(e0.patientId, p);
      if (p.status !== 'admitted') continue;
      const entry = { ...e0 };
      if (p.dietOrder.npo) { out.push(cancelEntryInternal(actor, entry, { cause: 'npo', reason: 'The diet order changed to nothing by mouth (NPO).' })); continue; }
      const outcomes = outcomesOf(p.id);
      const details = [];
      const keep = [];
      for (const o of entry.offers) {
        const isSelected = o.mealId === entry.selectedMealId;
        const problem = offerProblem(p, entry, o, outcomes, { selected: isSelected });
        if (problem) details.push(`${o.mealName ?? mealName(o.mealId)} ${problem}`);
        if (!problem || isSelected) keep.push(o);
      }
      const selected = entry.selectedMealId ? entry.offers.find((o) => o.mealId === entry.selectedMealId) ?? { mealId: entry.selectedMealId, screenedAs: 'eligible' } : null;
      const selectedProblem = selected ? offerProblem(p, entry, selected, outcomes, { selected: true }) : null;
      if (!details.length && !selectedProblem) continue;
      const withdrawn = entry.offers.filter((o) => !keep.includes(o) || (o.mealId === entry.selectedMealId && selectedProblem));
      entry.offers = keep.filter((o) => !(o.mealId === entry.selectedMealId && selectedProblem && entry.status === 'offered'));
      const hold = Boolean(selectedProblem && ['selected', 'confirmed', 'prepared', 'on-hold'].includes(entry.status)) || (!entry.offers.length && entry.status === 'offered');
      const kitchenAffected = Boolean(selectedProblem) && wasOnKitchenList(entry);
      addChange(entry, { cause, change, details, hold, kitchenAffected });
      if (hold && entry.status !== 'on-hold') { entry.holdFrom = entry.status; entry.status = 'on-hold'; }
      event(entry, null, hold ? 'held' : 'options-withdrawn', `${change}. ${details.join(' ')}`);
      const saved = save(entry);
      out.push({ date: saved.date, period: saved.period, patientId: saved.patientId, status: saved.status, hold, withdrawn: withdrawn.map((o) => o.mealName ?? mealName(o.mealId)), details });
    }
    if (out.length) {
      for (const pid of new Set(out.map((x) => x.patientId))) {
        const mine = out.filter((x) => x.patientId === pid);
        audit(actor, pid, 'schedule.recheck', `Re-screened upcoming meals after a change (${change}): ${mine.length} meal period${mine.length > 1 ? 's' : ''} affected, ${mine.filter((x) => x.hold).length} put on hold.`);
      }
    }
    return out;
  }
  const upcoming = (q = {}) => repo.listEntries({ from: today(), ...q }).filter((e) => OPEN.includes(e.status));
  const recheckPatient = (actor, p, why) => recheckEntries(actor, upcoming({ patientId: p.id }), why);
  /** Re-screen every upcoming entry that offers or has chosen one of these meals. */
  function recheckMeals(actor, mealIds, why) {
    const ids = new Set(mealIds);
    const entries = upcoming().filter((e) => ids.has(e.selectedMealId) || e.offers.some((o) => ids.has(o.mealId)));
    return recheckEntries(actor, entries, why);
  }
  /** Re-screen upcoming entries on given dates (after a menu change). */
  function recheckDates(actor, dates, why) {
    const set = new Set(dates);
    return recheckEntries(actor, upcoming().filter((e) => set.has(e.date)), why);
  }

  function cancelEntryInternal(actor, entry, { cause, reason }) {
    const kitchenAffected = wasOnKitchenList(entry);
    resolveChanges(entry, actor ?? { name: 'CareBite', role: 'system' }, `Cancelled: ${reason}`);
    addChange(entry, { cause, change: reason, details: [], hold: false, kitchenAffected, reviewed: true, actor: actor ?? { name: 'CareBite', role: 'system' }, resolution: 'Meal cancelled' });
    entry.status = 'cancelled';
    entry.holdFrom = null;
    entry.cancelledReason = reason;
    event(entry, actor, 'cancelled', reason);
    const saved = save(entry);
    return { date: saved.date, period: saved.period, patientId: saved.patientId, status: 'cancelled', kitchenAffected, meal: saved.mealName };
  }
  /** Cancel every upcoming, not yet delivered meal (discharge). */
  function cancelUpcoming(actor, p, { cause, reason }) {
    return upcoming({ patientId: p.id }).map((e) => cancelEntryInternal(actor, { ...e }, { cause, reason }));
  }

  /** After an admin resolves an allergy report, release holds caused only by it when the meal now passes. */
  function releaseAfterReport(actor, p, request) {
    const out = [];
    const outcomes = outcomesOf(p.id);
    for (const e0 of upcoming({ patientId: p.id }).filter((e) => e.status === 'on-hold')) {
      const pending = openHoldChanges(e0);
      if (!pending.length || pending.some((c) => c.cause !== 'allergy-report')) continue;
      const entry = { ...e0 };
      const offer = entry.offers.find((o) => o.mealId === entry.selectedMealId) ?? { mealId: entry.selectedMealId, screenedAs: 'eligible' };
      const problem = entry.selectedMealId ? offerProblem(p, entry, offer, outcomes, { selected: true }) : 'has no chosen meal';
      if (problem) continue;
      entry.status = entry.holdFrom ?? 'selected';
      entry.holdFrom = null;
      resolveChanges(entry, actor, `Released: the reported allergy was reviewed by ${actor.name} (request ${request.status}) and the meal passes screening.`);
      event(entry, actor, 'released', 'Allergy report reviewed; meal passes screening.');
      save(entry);
      out.push({ date: entry.date, period: entry.period, status: entry.status });
    }
    if (out.length) audit(actor, p.id, 'schedule.release', `Released ${out.length} meal period${out.length > 1 ? 's' : ''} held for the reported allergy.`);
    return out;
  }

  // ------------------------------------------------------------ change flags for the team and the kitchen
  function openChanges({ patientId = null } = {}) {
    const rows = [];
    for (const e of repo.listEntries({ from: addDays(today(), -1), ...(patientId ? { patientId } : {}) })) {
      for (const c of e.changes ?? []) if (!c.reviewed) rows.push({ ...c, entryId: e.id, patientId: e.patientId, date: e.date, period: e.period, entryStatus: e.status });
    }
    return rows.sort((a, b) => (a.entryStatus === 'on-hold' ? 0 : 1) - (b.entryStatus === 'on-hold' ? 0 : 1) || a.date.localeCompare(b.date) || PERIOD_IDS.indexOf(a.period) - PERIOD_IDS.indexOf(b.period));
  }
  function changeLog({ patientId }) {
    const rows = [];
    for (const e of repo.listEntries({ patientId })) for (const c of e.changes ?? []) rows.push({ ...c, date: e.date, period: e.period, entryStatus: e.status });
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  }

  // ------------------------------------------------------------ offers
  function offerItem(actor, p, date, period, mealId, reviewNote, outcomes) {
    const meal = getMealOr404(mealId);
    if (!meal.available) conflict('meal_unavailable', `${meal.name} is marked unavailable by the kitchen${meal.unavailableReason ? ` (${meal.unavailableReason})` : ''}.`);
    if (!onMenu(date, period, mealId)) conflict('not_on_menu', `${meal.name} is not on the ${period} menu for ${date}.`);
    const ev = evaluateMeal(meal, forScreening(p), { catalog: catalog(), period, intake: outcomes });
    const base = { mealId, mealName: meal.name, approvedBy: actor.id, approvedByName: actor.name, suggestedPortion: ev.portion?.suggested ?? null };
    if (ev.status === 'excluded') {
      conflict('meal_excluded', `${meal.name} cannot be offered: it conflicts with the patient’s diet order, allergies or restrictions.`, { reasons: ev.exclusions.map((x) => x.message) });
    }
    if (ev.status === 'review') {
      if (!can(actor.role, 'meal:approve-review')) throw new ctx.ServiceError(403, 'review_required', `${meal.name} needs admin review before it can be offered or confirmed.`, { reasons: ev.reviewReasons.map((x) => x.message) });
      const note = clean(reviewNote, 300);
      if (!note) invalid(`Add a review note for ${meal.name} explaining why it is suitable.`, { [`reviewNote.${mealId}`]: 'A review note is required for meals that need admin review.', reviewNote: 'A review note is required for meals that need admin review.' });
      return { ...base, screenedAs: 'review', reviewNote: note, reviewReasons: ev.reviewReasons.map((x) => x.message), portions: ev.portion.eligible.length ? ev.portion.eligible : ev.portion.permitted };
    }
    return { ...base, screenedAs: 'eligible', reviewNote: null, reviewReasons: [], portions: ev.portion.eligible };
  }

  function resolveSlotRequests(actor, patientId, date, period, response) {
    for (const r of repo.listRequests({ patientId, status: 'open' })) {
      if (r.type === 'alternative' && r.date === date && r.period === period) repo.updateRequest(r.id, { status: 'resolved', response, resolvedBy: actor.name, resolvedAt: stamp() });
    }
  }
  function ensurePlannable(p, date, period, what) {
    assertPeriod(period);
    assertDate(date, { ...scheduleWindow(), what });
    assertAdmitted(p);
    if (p.dietOrder.npo) conflict('npo', 'The diet order is nothing by mouth (NPO). No meals can be planned.');
  }

  /** The nutrition team offers approved options (at most 4) for one meal period. */
  function offerOptions(actor, id, { date, period, items = [] } = {}) {
    requirePermission(actor, 'meal:offer', 'Only the nutrition team can offer meal options.');
    const p = getPatientOr404(id);
    ensurePlannable(p, date, period, 'Meal options');
    const existing = repo.getEntry(p.id, date, period);
    if (existing && ['confirmed', 'prepared', 'delivered'].includes(existing.status)) {
      conflict('already_confirmed', `This ${periodName(period)} is already ${statusLabel(existing.status).toLowerCase()}. Use “Replace meal” to change it.`);
    }
    const list = (Array.isArray(items) ? items : []).map((x) => (typeof x === 'string' ? { mealId: x } : x)).filter((x) => x?.mealId);
    const unique = [...new Map(list.map((x) => [x.mealId, x])).values()];
    if (!unique.length) invalid('Choose at least one meal to offer.');
    if (unique.length > 4) invalid('Offer at most 4 options so the choice stays simple for the patient.');
    const outcomes = outcomesOf(p.id);
    const offers = unique.map((x) => offerItem(actor, p, date, period, x.mealId, x.reviewNote ?? existing?.offers.find((o) => o.mealId === x.mealId)?.reviewNote, outcomes));
    const entry = existing ? { ...existing } : blank(p, date, period);
    const keep = entry.status === 'selected' && offers.some((o) => o.mealId === entry.selectedMealId);
    if (entry.status === 'on-hold') {
      resolveChanges(entry, actor, `New options offered: ${offers.map((o) => o.mealName).join(', ')}.`);
      if (wasOnKitchenList(entry)) entry.replaces = { mealId: entry.selectedMealId, mealName: entry.mealName, portion: entry.portion, status: entry.holdFrom, at: stamp(), outcome: 'cancelled' };
    }
    Object.assign(entry, {
      offers, status: keep ? 'selected' : 'offered', holdFrom: null,
      ...(keep ? {} : { selectedMealId: null, mealName: null, mealVersion: null, portion: null, selectedBy: null, selectedByRole: null, selectedAt: null }),
      confirmedBy: null, confirmedByRole: null, confirmedAt: null, confirmMode: null, cancelledReason: null,
    });
    event(entry, actor, 'offered', offers.map((o) => o.mealName).join(', '));
    const saved = save(entry);
    resolveSlotRequests(actor, p.id, date, period, `New options were offered: ${offers.map((o) => o.mealName).join(', ')}.`);
    audit(actor, p.id, 'schedule.offer', `Offered ${offers.length} option${offers.length > 1 ? 's' : ''} for ${period} on ${date}: ${offers.map((o) => o.mealName).join(', ')}.`);
    return { entry: entryView(saved) };
  }

  /** Offer the top eligible options for every empty meal period in a date range. Review meals are never auto-offered. */
  function autoSchedule(actor, id, { from = today(), days = 3, perPeriod = 3 } = {}) {
    requirePermission(actor, 'meal:plan', 'Only the nutrition team can create meal schedules.');
    const p = getPatientOr404(id);
    assertDate(from, { ...scheduleWindow(), what: 'The schedule start' });
    assertAdmitted(p);
    if (p.dietOrder.npo) conflict('npo', 'The diet order is nothing by mouth (NPO). No meals can be scheduled.');
    const n = Math.max(1, Math.min(7, Number(days) || 3));
    const k = Math.max(1, Math.min(4, Number(perPeriod) || 3));
    const outcomes = outcomesOf(p.id);
    const created = [];
    const flagged = [];
    for (let i = 0; i < n; i++) {
      const date = addDays(from, i);
      if (date > scheduleWindow().to) break;
      for (const period of PERIOD_IDS) {
        const existing = repo.getEntry(p.id, date, period);
        if (existing && existing.status !== 'cancelled') continue;
        const s = screen(p, date, period, outcomes);
        if (!s.eligible.length) {
          flagged.push({ date, period, reason: s.review.length ? `${s.review.length} option${s.review.length > 1 ? 's need' : ' needs'} admin review; none were offered automatically.` : 'No meal on the menu passes screening. Requirements were not relaxed.' });
          continue;
        }
        const entry = existing ? { ...existing, cancelledReason: null } : blank(p, date, period);
        entry.offers = s.eligible.slice(0, k).map((ev) => ({ mealId: ev.mealId, mealName: mealName(ev.mealId), screenedAs: 'eligible', approvedBy: actor.id, approvedByName: actor.name, reviewNote: null, reviewReasons: [], suggestedPortion: ev.portion.suggested, portions: ev.portion.eligible }));
        entry.status = 'offered';
        Object.assign(entry, { selectedMealId: null, mealName: null, portion: null, selectedBy: null, selectedByRole: null, selectedAt: null });
        event(entry, actor, 'offered', `${entry.offers.map((o) => o.mealName).join(', ')} (top eligible options)`);
        save(entry);
        created.push({ date, period, options: entry.offers.length });
      }
    }
    if (created.length || flagged.length) audit(actor, p.id, 'schedule.auto', `Offered the top eligible options for ${created.length} meal period${created.length === 1 ? '' : 's'} from ${from}${flagged.length ? `; ${flagged.length} flagged for the team` : ''}.`);
    return { created, flagged };
  }

  function validPortion(offer, ev, requested) {
    const allowed = offer?.portions?.length ? offer.portions : ev.portion?.eligible ?? [];
    const portion = requested || offer?.suggestedPortion || ev.portion?.suggested;
    if (!allowed.includes(portion)) conflict('portion_not_permitted', `A ${String(portion)} portion is not available for this meal and diet order. Choose ${allowed.join(' or ')}.`);
    return portion;
  }
  /** Re-screen an offered meal now. Excluded meals and unapproved review meals are refused. */
  function screenOffer(p, offer, period) {
    const ev = ctx.evaluate(p, offer.mealId, period);
    const name = mealName(offer.mealId);
    if (!catalog().byId[offer.mealId].available) conflict('meal_unavailable', `${name} is marked unavailable by the kitchen.`);
    if (ev.status === 'excluded') conflict('meal_excluded', `${name} no longer passes screening and cannot be chosen.`, { reasons: ev.exclusions.map((x) => x.message) });
    if (ev.status === 'review' && offer.screenedAs !== 'review') conflict('review_required', `${name} now needs admin review before it can be chosen.`, { reasons: ev.reviewReasons.map((x) => x.message) });
    return ev;
  }

  /** A patient (or the team on their behalf) chooses one of the approved options. */
  function selectMeal(actor, id, { date, period, mealId, portion } = {}) {
    const p = accessPatient(actor, id);
    assertPeriod(period);
    assertDate(date, { ...scheduleWindow(), what: 'Meal choices' });
    assertAdmitted(p);
    const e0 = repo.getEntry(p.id, date, period);
    if (e0?.status === 'on-hold') conflict('on_hold', 'This meal is on hold while the nutrition team checks it. Please wait for new options.');
    if (e0 && !['offered', 'selected'].includes(e0.status)) conflict('not_choosable', `This ${periodName(period)} is already ${statusLabel(e0.status).toLowerCase()}. To change it, ask for a different meal.`);
    const offer = e0?.offers.find((o) => o.mealId === mealId);
    if (!offer) conflict('not_offered', 'Choose one of the approved options offered by the nutrition team.');
    const ev = screenOffer(p, offer, period);
    const chosen = validPortion(offer, ev, portion);
    const entry = { ...e0, selectedMealId: mealId, mealName: mealName(mealId), mealVersion: catalog().byId[mealId].version, portion: chosen, status: 'selected', selectedBy: actor.name, selectedByRole: actor.role, selectedAt: stamp() };
    event(entry, actor, 'selected', actor.role === 'patient' ? 'Chosen by the patient' : 'Chosen with the patient by the nutrition team');
    const saved = save(entry);
    audit(actor, p.id, 'schedule.select', `${actor.role === 'patient' ? 'Patient chose' : 'Recorded the patient’s choice:'} ${entry.mealName} (${chosen}) for ${period} on ${date}.`);
    return { entry: entryView(saved), note: actor.role === 'patient' ? 'Your choice has been sent to the nutrition team. They will confirm it before it goes to the kitchen.' : 'Choice recorded. Confirm it to send it to the kitchen.' };
  }

  /**
   * The nutrition team confirms a meal: the patient's choice, or a meal chosen
   * directly by staff. Confirming a different meal after confirmation is a
   * replacement: the earlier version is recorded so the kitchen does not
   * prepare or deliver both.
   */
  function confirmMeal(actor, id, { date, period, mealId, portion, reviewNote, reason } = {}) {
    requirePermission(actor, 'meal:confirm', 'Only the nutrition team can confirm meals.');
    const p = getPatientOr404(id);
    ensurePlannable(p, date, period, 'Confirmations');
    const e0 = repo.getEntry(p.id, date, period);
    if (e0?.status === 'delivered') conflict('already_delivered', 'This meal was already delivered and cannot be changed.');
    const target = mealId || e0?.selectedMealId;
    if (!target) invalid('Choose the meal to confirm.');
    const outcomes = outcomesOf(p.id);
    const entry = e0 ? { ...e0 } : blank(p, date, period);
    let offer = entry.offers.find((o) => o.mealId === target);
    if (!offer || offer.screenedAs === 'eligible') {
      const fresh = offerItem(actor, p, date, period, target, reviewNote ?? offer?.reviewNote, outcomes);
      offer = offer && fresh.screenedAs === 'eligible' ? { ...offer, portions: fresh.portions, suggestedPortion: fresh.suggestedPortion } : fresh;
      entry.offers = [...entry.offers.filter((o) => o.mealId !== target), offer];
    }
    const ev = screenOffer(p, offer, period);
    const chosen = validPortion(offer, ev, portion || (entry.selectedMealId === target ? entry.portion : undefined));
    const prevStatus = entry.status === 'on-hold' ? entry.holdFrom : entry.status;
    const replacing = ['confirmed', 'prepared'].includes(prevStatus) && (entry.selectedMealId !== target || entry.portion !== chosen);
    const why = clean(reason, 200);
    if (replacing && entry.status !== 'on-hold' && !why) invalid('Give a short reason for replacing a confirmed meal. The kitchen sees it.', { reason: 'Give a short reason for the replacement.' });
    if (replacing) {
      entry.replaces = { mealId: entry.selectedMealId, mealName: entry.mealName, portion: entry.portion, status: prevStatus, at: stamp(), outcome: 'replaced' };
      if (entry.status !== 'on-hold') {
        addChange(entry, { cause: 'staff-change', change: `Replaced ${entry.mealName} with ${mealName(target)}${why ? `: ${why}` : ''}`, hold: false, kitchenAffected: true, reviewed: true, actor, resolution: `Replaced with ${mealName(target)} (${chosen})` });
      }
    }
    if (entry.status === 'on-hold') resolveChanges(entry, actor, `Replaced with ${mealName(target)} (${chosen})${why ? `: ${why}` : ''}`);
    const patientChoice = entry.status === 'selected' && entry.selectedMealId === target;
    Object.assign(entry, {
      selectedMealId: target, mealName: mealName(target), mealVersion: catalog().byId[target].version, portion: chosen, status: 'confirmed', holdFrom: null,
      selectedBy: patientChoice ? entry.selectedBy : actor.name, selectedByRole: patientChoice ? entry.selectedByRole : actor.role, selectedAt: patientChoice ? entry.selectedAt : stamp(),
      confirmMode: patientChoice ? (entry.selectedByRole === 'patient' ? 'patient-choice' : 'staff-choice') : 'direct',
      confirmedBy: actor.name, confirmedByRole: actor.role, confirmedAt: stamp(), preparedBy: null, preparedAt: null, deliveredBy: null, deliveredByRole: null, deliveredAt: null, cancelledReason: null,
    });
    event(entry, actor, replacing ? 'replaced' : 'confirmed', entry.confirmMode === 'direct' ? 'Confirmed directly by the nutrition team (no patient choice recorded)' : entry.confirmMode === 'patient-choice' ? 'Patient’s choice confirmed' : 'Choice recorded by staff, confirmed');
    const saved = save(entry);
    resolveSlotRequests(actor, p.id, date, period, `Confirmed ${entry.mealName}.`);
    audit(actor, p.id, 'schedule.confirm', `${replacing ? 'Replaced and confirmed' : 'Confirmed'} ${entry.mealName} (${chosen}) for ${period} on ${date}${entry.confirmMode === 'direct' ? ' directly' : ''}${offer.screenedAs === 'review' ? ' after admin review' : ''}.`);
    return { entry: entryView(saved) };
  }

  /** Cancel one meal period (no meal will be prepared). The record and its history are kept. */
  function cancelMeal(actor, id, { date, period, reason } = {}) {
    requirePermission(actor, 'meal:cancel', 'Only the nutrition team can cancel meals.');
    const p = getPatientOr404(id);
    assertPeriod(period);
    assertDate(date, scheduleWindow());
    const e0 = repo.getEntry(p.id, date, period);
    if (!e0 || !OPEN.includes(e0.status)) conflict('not_cancellable', 'There is no open meal to cancel for this period.');
    const why = clean(reason, 200);
    if (!why) invalid('Give a short reason. It is kept in the meal history.', { reason: 'Give a short reason.' });
    const r = cancelEntryInternal(actor, { ...e0 }, { cause: 'staff-change', reason: why });
    audit(actor, p.id, 'schedule.cancel', `Cancelled ${period} on ${date}${e0.mealName ? ` (${e0.mealName})` : ''}: ${why}.`);
    return { entry: entryView(repo.getEntry(p.id, date, period)), kitchenAffected: r.kitchenAffected };
  }

  /** Review a held meal: keep it (release) when it passes again, or an admin approves it with a note. Or mark a change as reviewed. */
  function resolveEntry(actor, id, { date, period, action, note } = {}) {
    requirePermission(actor, 'meal:resolve-hold');
    const p = getPatientOr404(id);
    assertPeriod(period);
    const e0 = repo.getEntry(p.id, date, period);
    if (!e0) conflict('no_entry', 'There is no meal for this period.');
    const entry = { ...e0 };
    const text = clean(note, 300);
    if (action === 'mark-reviewed') {
      if (entry.status === 'on-hold') conflict('on_hold', 'This meal is on hold. Replace it, cancel it, or keep it after review instead.');
      if (!openHoldChanges(entry).length) conflict('nothing_to_review', 'There are no changes waiting for review.');
      resolveChanges(entry, actor, text || 'Reviewed; no further action needed.');
      event(entry, actor, 'reviewed', text || null);
    } else if (action === 'keep') {
      if (entry.status !== 'on-hold') conflict('not_on_hold', 'This meal is not on hold.');
      assertAdmitted(p);
      const offer = entry.offers.find((o) => o.mealId === entry.selectedMealId) ?? { mealId: entry.selectedMealId, mealName: entry.mealName, screenedAs: 'eligible' };
      if (!entry.selectedMealId) conflict('no_meal', 'No meal was chosen. Offer new options instead.');
      const meal = getMealOr404(entry.selectedMealId);
      if (!meal.available) conflict('meal_unavailable', `${meal.name} is still unavailable. Replace it instead.`);
      if (!onMenu(entry.date, entry.period, meal.id)) conflict('not_on_menu', `${meal.name} is no longer on the menu for this period. Replace it instead.`);
      const ev = ctx.evaluate(p, meal.id, period);
      if (ev.status === 'excluded') conflict('meal_excluded', `${meal.name} conflicts with the patient’s record and cannot be kept. Replace or cancel it.`, { reasons: ev.exclusions.map((x) => x.message) });
      const permitted = ev.status === 'review' ? ev.portion.permitted : ev.portion.eligible;
      if (!permitted.includes(entry.portion)) conflict('portion_not_permitted', `The ${entry.portion} portion is no longer permitted. Confirm the meal again with a permitted portion.`);
      if (ev.status === 'review') {
        if (!can(actor.role, 'meal:approve-review')) deny('This meal now needs admin review. Only an admin can keep it, with a review note.');
        if (!text) invalid('Add a review note explaining why the meal is still suitable.', { note: 'A review note is required.' });
        entry.offers = [...entry.offers.filter((o) => o.mealId !== meal.id), { ...offer, mealName: meal.name, screenedAs: 'review', reviewNote: text, reviewReasons: ev.reviewReasons.map((x) => x.message), approvedBy: actor.id, approvedByName: actor.name, portions: permitted }];
      }
      entry.status = entry.holdFrom ?? 'selected';
      entry.holdFrom = null;
      resolveChanges(entry, actor, ev.status === 'review' ? `Kept after admin review: ${text}` : `Kept: ${meal.name} passes screening again${text ? ` (${text})` : ''}.`);
      event(entry, actor, 'released', text || 'Passes screening again');
    } else invalid('Unknown action.');
    const saved = save(entry);
    audit(actor, p.id, 'schedule.review', `${action === 'keep' ? 'Kept the held meal' : 'Marked changes as reviewed'} for ${period} on ${date}${text ? `: ${text}` : ''}.`);
    return { entry: entryView(saved) };
  }

  // ------------------------------------------------------------ kitchen: preparation and delivery
  function progressEntry(actor, entryId, { to } = {}) {
    if (to === 'prepared') requirePermission(actor, 'kitchen:progress', 'Only staff can mark a meal as prepared.');
    else if (to === 'delivered') requirePermission(actor, 'kitchen:progress', 'Only staff can mark a meal as delivered.');
    else invalid('Choose prepared or delivered.');
    const e0 = repo.getEntryById(entryId);
    if (!e0) throw new ctx.ServiceError(404, 'entry_not_found', 'That meal order does not exist.');
    if (e0.date > today() || e0.date < addDays(today(), -1)) conflict('date_out_of_range', 'Preparation and delivery can be recorded for today (or late for yesterday) only.');
    const p = getPatientOr404(e0.patientId);
    if (p.status !== 'admitted') conflict('discharged', 'The patient has been discharged. Do not prepare or deliver this meal.');
    if (e0.status === 'on-hold') conflict('on_hold', 'This meal is on hold for review. Do not prepare or deliver it until the nutrition team resolves the change.');
    const from = to === 'prepared' ? 'confirmed' : 'prepared';
    if (e0.status !== from) conflict('wrong_stage', to === 'prepared' ? `Only confirmed meals can be marked prepared (this one is: ${statusLabel(e0.status)}).` : `Mark the meal as prepared before it is delivered (this one is: ${statusLabel(e0.status)}).`);
    // Defence in depth: screen once more before the tray moves on.
    const offer = e0.offers.find((o) => o.mealId === e0.selectedMealId) ?? { mealId: e0.selectedMealId, screenedAs: 'eligible' };
    const problem = offerProblem(p, e0, offer, outcomesOf(p.id), { selected: true });
    if (problem) {
      recheckEntries(actor, [e0], { cause: 'meal-change', change: `Screening before ${to === 'prepared' ? 'preparation' : 'delivery'} found a problem` });
      conflict('meal_held', `${e0.mealName} ${problem}. It has been put on hold for the nutrition team.`);
    }
    const entry = { ...e0, status: to };
    if (to === 'prepared') Object.assign(entry, { preparedBy: actor.name, preparedAt: stamp() });
    else Object.assign(entry, { deliveredBy: actor.name, deliveredByRole: actor.role, deliveredAt: stamp() });
    event(entry, actor, to);
    const saved = save(entry);
    audit(actor, p.id, `schedule.${to}`, `${e0.mealName} (${e0.portion}) for ${e0.period} on ${e0.date} marked ${to}.`);
    return { entry: { id: saved.id, status: saved.status, statusLabel: statusLabel(saved.status) } };
  }

  function undoProgress(actor, entryId) {
    requirePermission(actor, 'kitchen:progress', 'Only staff can undo a kitchen step.');
    const e0 = repo.getEntryById(entryId);
    if (!e0) throw new ctx.ServiceError(404, 'entry_not_found', 'That meal order does not exist.');
    if (e0.date !== today()) conflict('date_out_of_range', 'Only today’s kitchen steps can be undone.');
    let to;
    if (e0.status === 'prepared') to = 'confirmed';
    else if (e0.status === 'delivered') {
      if (repo.listIntake({ patientId: e0.patientId, date: e0.date }).some((r) => r.period === e0.period)) conflict('has_intake', 'Intake has already been recorded for this meal, so delivery cannot be undone.');
      to = 'prepared';
    } else conflict('wrong_stage', 'There is no kitchen step to undo.');
    const entry = { ...e0, status: to, ...(to === 'confirmed' ? { preparedBy: null, preparedAt: null } : { deliveredBy: null, deliveredByRole: null, deliveredAt: null }) };
    event(entry, actor, 'undo', `Back to ${statusLabel(to).toLowerCase()}`);
    save(entry);
    audit(actor, e0.patientId, 'schedule.undo', `Undid “${statusLabel(e0.status)}” for ${e0.period} on ${e0.date}.`);
    return { entry: { id: entry.id, status: to, statusLabel: statusLabel(to) } };
  }

  function ackChange(actor, entryId, changeId) {
    requirePermission(actor, 'kitchen:progress', 'Only staff acknowledge kitchen alerts.');
    const e0 = repo.getEntryById(entryId);
    if (!e0) throw new ctx.ServiceError(404, 'entry_not_found', 'That meal order does not exist.');
    const c = (e0.changes ?? []).find((x) => x.id === changeId);
    if (!c || !c.kitchenAffected) conflict('no_alert', 'That kitchen alert does not exist.');
    if (c.kitchenAck) conflict('already_acknowledged', `Already acknowledged by ${c.kitchenAck.by}.`);
    const entry = { ...e0, changes: e0.changes.map((x) => (x.id === changeId ? { ...x, kitchenAck: { by: actor.name, at: stamp(), stage: x.reviewed ? 'resolved' : 'hold' } } : x)) };
    event(entry, actor, 'kitchen-ack', c.change);
    save(entry);
    return { ok: true };
  }

  // ------------------------------------------------------------ staff views
  const decorate = (ev) => ({ ...mealSummary(catalog().byId[ev.mealId]), evaluation: ev });

  function getDayPlan(actor, id, { date = today() } = {}) {
    requirePermission(actor, 'meal:plan');
    const p = getPatientOr404(id);
    assertDate(date);
    const outcomes = outcomesOf(p.id);
    const entries = repo.listEntries({ patientId: p.id, date });
    const day = menuDay(ctx.menu(), date);
    const discharged = p.status === 'discharged';
    return {
      date, weekday: day.weekday, cycleDay: day.cycleDay,
      editable: !discharged && date >= today() && date <= scheduleWindow().to,
      discharged, linkedAccount: repo.listUsersByPatient(p.id).length > 0,
      patient: brief(p),
      periods: PERIODS.map(({ id: period, label: periodLabel }) => {
        const entry = entries.find((e) => e.period === period) ?? null;
        const s = discharged ? null : screen(p, date, period, outcomes);
        const outcome = outcomes.find((o) => o.date === date && o.period === period) ?? null;
        return {
          period, label: periodLabel, npo: p.dietOrder.npo, serviceTime: SERVICE_TIMES[period], entry: entryView(entry), outcome,
          screening: s ? {
            eligible: s.eligible.map(decorate), review: s.review.map(decorate), excluded: s.excluded.map(decorate),
            unavailable: s.unavailable.map((mid) => withMeal(mid)), counts: s.counts, noSuitable: s.noSuitable, reviewOnly: s.reviewOnly,
          } : null,
        };
      }),
    };
  }

  /** Several days at once (patient's own week view, or the team). */
  function getPatientSchedule(actor, id, { from = today(), days = 7 } = {}) {
    const p = accessPatient(actor, id);
    assertDate(from);
    const n = Math.max(1, Math.min(14, Number(days) || 7));
    const entries = repo.listEntries({ patientId: p.id, from, to: addDays(from, n - 1) });
    const outcomes = outcomesOf(p.id);
    return {
      from, patient: brief(p),
      days: Array.from({ length: n }, (_, i) => {
        const date = addDays(from, i);
        return {
          date, weekday: WEEKDAYS[weekdayIndex(date)], isToday: date === today(),
          periods: PERIODS.map(({ id: period, label: l }) => {
            const e = entries.find((x) => x.date === date && x.period === period);
            const fed = outcomes.find((o) => o.date === date && o.period === period);
            return { period, label: l, status: p.dietOrder.npo && !e ? 'npo' : e?.status ?? null, statusLabel: e ? statusLabel(e.status) : null, options: e?.offers.length ?? 0, mealName: e?.mealName ?? null, portion: e?.portion ?? null, feedback: Boolean(fed?.patientRecord) };
          }),
        };
      }),
    };
  }

  const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function patientMessage(entry, period, npo) {
    if (npo) return 'Your care team has asked that you have nothing to eat or drink for now. No meals will be brought.';
    if (!entry) return 'The nutrition team has not offered options for this meal yet.';
    const s = ENTRY_STATUS.find((x) => x.id === entry.status);
    if (entry.status === 'offered' && !entry.offers.length) return 'Your nutrition team is preparing new options for you.';
    if (entry.status === 'cancelled') return `This meal was cancelled${entry.cancelledReason ? `: ${entry.cancelledReason}` : '.'}`;
    return s.patient.replace('{period}', periodName(period));
  }

  /** The patient's own screen: next meal, what needs their action, one day in detail and a week overview. */
  function getMyMeals(actor, id, { date = today(), week = null } = {}) {
    const p = accessPatient(actor, id);
    assertDate(date, { from: addDays(today(), -13), to: scheduleWindow().to });
    const outcomes = outcomesOf(p.id);
    const sp = forScreening(p);
    const discharged = p.status === 'discharged';
    const requests = repo.listRequests({ patientId: p.id });
    const nowD = ctx.now();
    const minutes = nowD.getHours() * 60 + nowD.getMinutes();
    const entriesFrom = (d) => repo.listEntries({ patientId: p.id, date: d });

    // Next meal: the first period from now (allowing an hour after the service time) that is not finished.
    let next = null;
    if (!discharged) {
      for (let i = 0; i < 2 && !next; i++) {
        const d = addDays(today(), i);
        const es = entriesFrom(d);
        for (const period of PERIOD_IDS) {
          if (i === 0 && minutes > toMinutes(SERVICE_TIMES[period]) + 60) continue;
          const e = es.find((x) => x.period === period) ?? null;
          if (e?.status === 'cancelled') continue;
          next = { date: d, period, label: label(PERIODS, period), serviceTime: SERVICE_TIMES[period], status: p.dietOrder.npo ? 'npo' : e?.status ?? null, message: patientMessage(e, period, p.dietOrder.npo), mealName: e?.mealName ?? null, portion: e?.portion ?? null, options: e?.offers.length ?? 0 };
          break;
        }
      }
    }
    // Things only the patient can do: choose offered meals, and tell us about delivered meals.
    const todo = [];
    if (!discharged) {
      for (const e of repo.listEntries({ patientId: p.id, from: addDays(today(), -1), to: scheduleWindow().to })) {
        if (e.status === 'offered' && e.offers.length && e.date >= today()) todo.push({ kind: 'choose', date: e.date, period: e.period, text: `Choose your ${periodName(e.period)}` });
        if (e.status === 'delivered' && !outcomes.some((o) => o.date === e.date && o.period === e.period && o.patientRecord)) todo.push({ kind: 'feedback', date: e.date, period: e.period, text: `Tell us how your ${periodName(e.period)} was` });
      }
      todo.sort((a, b) => a.date.localeCompare(b.date) || PERIOD_IDS.indexOf(a.period) - PERIOD_IDS.indexOf(b.period));
    }
    const weekFrom = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : addDays(date, -weekdayIndex(date));
    const entries = entriesFrom(date);
    return {
      date, weekday: WEEKDAYS[weekdayIndex(date)], today: today(), now: nowD.toISOString(),
      discharged, dischargedOn: p.dischargedOn ?? null, npo: p.dietOrder.npo, appetite: p.appetite.level,
      canChoose: !discharged && date >= today() && date <= scheduleWindow().to, canGiveFeedback: date <= today(),
      choiceWindow: scheduleWindow(), next, todo: todo.slice(0, 6),
      pendingRequests: requests.filter((r) => r.status === 'open').length,
      week: getPatientSchedule(actor, id, { from: weekFrom, days: 7 }).days,
      weekFrom,
      periods: PERIODS.map(({ id: period, label: l }) => {
        const e = entries.find((x) => x.period === period) ?? null;
        const options = e?.status === 'offered' || e?.status === 'selected' ? e.offers.map((o) => {
          const meal = catalog().byId[o.mealId];
          if (!meal) return null;
          const ev = evaluateMeal(meal, sp, { catalog: catalog(), period, intake: outcomes });
          return {
            ...mealSummary(meal), offer: o,
            why: { reasons: ev.reasons.filter((r) => r.points > 0 || /portion/i.test(r.text)).map((r) => r.text), checks: ev.checks.map((c) => c.label), reviewed: o.screenedAs === 'review', portionExplanation: ev.portion?.explanation ?? null },
            stillSuitable: meal.available && (ev.status === 'eligible' || (ev.status === 'review' && o.screenedAs === 'review')),
          };
        }).filter(Boolean) : [];
        const outcome = outcomes.find((o) => o.date === date && o.period === period) ?? null;
        return {
          period, label: l, serviceTime: SERVICE_TIMES[period],
          entry: e ? {
            id: e.id, status: e.status, statusLabel: statusLabel(e.status), message: patientMessage(e, period, p.dietOrder.npo), selectedMealId: e.selectedMealId, mealName: e.mealName, portion: e.portion,
            confirmedAt: e.confirmedAt, confirmMode: e.confirmMode, preparedAt: e.preparedAt, deliveredAt: e.deliveredAt, cancelledReason: e.cancelledReason, replaced: Boolean(e.replaces),
            steps: e.history.filter((h) => ['offered', 'selected', 'confirmed', 'replaced', 'prepared', 'delivered', 'held', 'released', 'cancelled'].includes(h.action)).map((h) => ({ action: h.action, at: h.at, role: h.role })),
          } : null,
          message: patientMessage(e, period, p.dietOrder.npo),
          options, selectedMeal: e?.selectedMealId ? withMeal(e.selectedMealId) : null,
          myFeedback: outcome?.patientRecord ?? null, staffObserved: Boolean(outcome?.staffRecord),
          requests: requests.filter((r) => r.date === date && r.period === period).map(ctx.requestView),
        };
      }),
    };
  }

  // ------------------------------------------------------------ schedule and kitchen
  function getSchedule(actor, { date = today(), ward = null } = {}) {
    requirePermission(actor, 'schedule:view');
    assertDate(date);
    const patients = repo.listPatients().filter((p) => p.status === 'admitted' && (!ward || p.ward === ward))
      .sort((a, b) => a.ward.localeCompare(b.ward) || a.bed.localeCompare(b.bed, 'en', { numeric: true }));
    const entries = repo.listEntries({ date });
    const counts = Object.fromEntries([...ENTRY_STATUS.map((s) => s.id), 'none', 'npo'].map((k) => [k, 0]));
    const rows = patients.map((p) => {
      const periods = PERIODS.map(({ id }) => {
        const e = entries.find((x) => x.patientId === p.id && x.period === id);
        const status = p.dietOrder.npo && (!e || e.status === 'cancelled') ? 'npo' : e?.status ?? 'none';
        counts[status] += 1;
        return { period: id, entryId: e?.id, status, statusLabel: status === 'none' ? 'Not scheduled' : status === 'npo' ? 'Nothing by mouth' : statusLabel(status), meal: e?.mealName ?? null, portion: e?.portion ?? null, options: e?.offers.length ?? 0, replaced: Boolean(e?.replaces) };
      });
      const row = { id: p.id, preferredName: p.preferredName, appetite: p.appetite.level, demoId: p.demoId, ward: p.ward, bed: p.bed, dietCodes: ctx.dietCodes(p), dietLabels: ctx.dietPlain(p), allergyAlert: p.allergies.status === 'recorded' || p.allergies.status === 'unknown', periods };
      return row;
    });
    return { date, weekday: WEEKDAYS[weekdayIndex(date)], wards: WARDS, rows, counts, excludedDischarged: repo.listPatients().filter((p) => p.status === 'discharged').length };
  }

  function getKitchenSummary(actor, { date = today(), period = null } = {}) {
    requirePermission(actor, 'kitchen:view');
    assertDate(date);
    if (period) assertPeriod(period);
    const patients = Object.fromEntries(repo.listPatients().filter((p) => p.status === 'admitted').map((p) => [p.id, p]));
    const allDay = repo.listEntries({ date });
    const entries = allDay.filter((e) => patients[e.patientId] && (!period || e.period === period));
    const trays = [];
    const held = [];
    for (const e of entries.filter((x) => ON_KITCHEN_LIST.includes(x.status))) {
      const p = patients[e.patientId];
      const meal = catalog().byId[e.selectedMealId];
      const offer = e.offers.find((o) => o.mealId === e.selectedMealId);
      const ev = meal ? evaluateMeal(meal, forScreening(p), { catalog: catalog(), period: e.period, intake: outcomesOf(p.id) }) : null;
      const instructions = [...(ev?.kitchenInstructions ?? [])];
      if (offer?.reviewNote) instructions.push(`Admin review note: ${offer.reviewNote}`);
      if (p.dietOrder.notes) instructions.push(`Diet order note: ${p.dietOrder.notes}`);
      const factor = portionFactor(e.portion);
      trays.push({
        entryId: e.id, status: e.status, statusLabel: statusLabel(e.status), period: e.period, ward: p.ward, bed: p.bed, demoId: p.demoId,
        mealId: e.selectedMealId, meal: e.mealName, portion: e.portion, type: meal?.type ?? 'single',
        components: (meal?.components ?? []).map((c) => ({ name: c.name, grams: Math.round(c.grams * factor) })),
        dietCodes: ctx.dietCodes(p), dietLabels: ctx.dietPlain(p), allergyAlerts: ctx.allergyLabels(p), intoleranceAlerts: ctx.intoleranceLabels(p), instructions,
        replaces: e.replaces ?? null, preparedBy: e.preparedBy, preparedAt: e.preparedAt, deliveredBy: e.deliveredBy, deliveredAt: e.deliveredAt,
        versionChanged: meal ? meal.version !== e.mealVersion : false,
      });
    }
    for (const e of entries.filter((x) => x.status === 'on-hold' && wasOnKitchenList(x))) {
      const p = patients[e.patientId];
      held.push({ entryId: e.id, period: e.period, ward: p.ward, bed: p.bed, demoId: p.demoId, meal: e.mealName, portion: e.portion, holdFrom: e.holdFrom, reason: openHoldChanges(e).map((c) => c.change).join('; ') });
    }
    // Kitchen alerts: changes to meals that were on the kitchen list, until the kitchen acknowledges the latest state.
    const alerts = [];
    // Alerts cover today and every upcoming day, whichever date is being viewed, so nothing is missed.
    for (const e of repo.listEntries({ from: date < today() ? date : today() }).filter((x) => (!period || x.period === period) && x.date >= date)) {
      const p = repo.getPatient(e.patientId);
      for (const c of e.changes ?? []) {
        if (!c.kitchenAffected || c.kitchenAck) continue;
        const outcome = !c.reviewed ? 'hold' : e.status === 'cancelled' ? 'cancelled' : ON_KITCHEN_LIST.includes(e.status) ? 'replaced-or-kept' : 'reoffered';
        alerts.push({
          entryId: e.id, changeId: c.id, at: c.at, date: e.date, period: e.period, ward: p?.ward, bed: p?.bed, demoId: p?.demoId, cause: c.causeLabel, change: c.change,
          previousMeal: c.mealName, previousPortion: c.portion, previousStatus: c.previousStatus, outcome, resolution: c.resolution, currentMeal: ON_KITCHEN_LIST.includes(e.status) ? e.mealName : null, currentStatus: statusLabel(e.status),
          instruction: outcome === 'hold' ? `STOP: do not ${c.previousStatus === 'prepared' ? 'deliver' : 'prepare'} ${c.mealName}. It is on hold for the nutrition team.`
            : outcome === 'cancelled' ? `Cancelled: do not ${c.previousStatus === 'prepared' ? 'deliver' : 'prepare'} ${c.mealName}.${p?.status === 'discharged' ? ' The patient was discharged.' : ''}`
              : outcome === 'reoffered' ? `${c.mealName} is cancelled. New options were offered; a new order will follow once confirmed.`
                : e.mealName !== c.mealName ? `Replaced: prepare ${e.mealName} (${e.portion}) instead of ${c.mealName}.${c.previousStatus === 'prepared' ? ` ${c.mealName} was already prepared: do not deliver it.` : ''}` : `Continue: ${e.mealName} was reviewed and kept (${c.resolution}).`,
        });
      }
    }
    alerts.sort((a, b) => a.date.localeCompare(b.date) || b.at.localeCompare(a.at));
    trays.sort((a, b) => PERIOD_IDS.indexOf(a.period) - PERIOD_IDS.indexOf(b.period) || a.ward.localeCompare(b.ward) || a.bed.localeCompare(b.bed, 'en', { numeric: true }));
    const production = PERIODS.filter((p) => !period || p.id === period).map(({ id, label: l }) => {
      const list = trays.filter((t) => t.period === id);
      const byMeal = new Map();
      for (const t of list) {
        const m = byMeal.get(t.mealId) ?? { mealId: t.mealId, meal: t.meal, type: t.type, components: t.components.map((c) => c.name), portions: { small: 0, regular: 0, large: 0 }, trays: 0, standardServings: 0, specialTrays: 0, toPrepare: 0, prepared: 0, delivered: 0 };
        m.portions[t.portion] += 1;
        m.trays += 1;
        m.standardServings += portionFactor(t.portion);
        m[t.status === 'confirmed' ? 'toPrepare' : t.status] += 1;
        if (t.allergyAlerts.length || t.intoleranceAlerts.length || t.instructions.some((x) => /texture|IDDSI|Gluten-free/i.test(x))) m.specialTrays += 1;
        byMeal.set(t.mealId, m);
      }
      return { period: id, label: l, trays: list.length, toPrepare: list.filter((t) => t.status === 'confirmed').length, prepared: list.filter((t) => t.status === 'prepared').length, delivered: list.filter((t) => t.status === 'delivered').length, meals: [...byMeal.values()].sort((a, b) => b.trays - a.trays) };
    });
    const req = ingredientRequirements(trays, catalog());
    const localGroups = new Map();
    for (const item of req) {
      const ing = catalog().ingredients[item.ingredientId];
      if (ing?.local && LOCAL_PRODUCTION[ing.local]) {
        const g = localGroups.get(ing.local) ?? { group: ing.local, ...LOCAL_PRODUCTION[ing.local], ingredients: [] };
        g.ingredients.push(item.name);
        localGroups.set(ing.local, g);
      }
    }
    const notIncluded = {
      awaitingConfirmation: entries.filter((e) => e.status === 'selected').length,
      optionsOffered: entries.filter((e) => e.status === 'offered').length,
      onHold: entries.filter((e) => e.status === 'on-hold').length,
      cancelled: entries.filter((e) => e.status === 'cancelled').length,
      notScheduled: Math.max(0, Object.values(patients).filter((p) => !p.dietOrder.npo).length * (period ? 1 : PERIOD_IDS.length) - entries.filter((e) => e.status !== 'cancelled').length),
    };
    return {
      date, weekday: WEEKDAYS[weekdayIndex(date)], period, today: today(), canProgress: date <= today() && date >= addDays(today(), -1),
      production, trays, held, alerts, notIncluded,
      ingredients: { groups: INGREDIENT_GROUPS.map((c) => ({ ...c, items: req.filter((i) => i.group === c.id) })).filter((c) => c.items.length) },
      local: [...localGroups.values()], localSources: LOCAL_PRODUCTION_SOURCES,
      notes: [
        'Only meals confirmed by the nutrition team are included. Meals on hold are listed separately: do not prepare or deliver them.',
        'Quantities are standard-portion grams × portion factor (small ½, regular 1, large 1½).',
        'Tray tickets show the minimum information needed: ward, bed, demonstration ID, diet, allergy alerts and preparation instructions.',
        'Marking a tray delivered does not record what was eaten. Intake is recorded separately by the patient or the nutrition team.',
        'Weigh returned plates when you can and record it with the meal’s intake: measured waste supports the national programme to reduce food loss and waste (GFSA).',
      ],
    };
  }

  return {
    recheckPatient, recheckMeals, recheckDates, cancelUpcoming, releaseAfterReport, openChanges, changeLog, entryView,
    api: {
      getDayPlan, offerOptions, autoSchedule, selectMeal, confirmMeal, cancelMeal, resolveEntry, progressEntry, undoProgress, ackChange,
      getPatientSchedule, getMyMeals, getSchedule, getKitchenSummary,
    },
  };
}

export { menuFor };

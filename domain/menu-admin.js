// Hospital menu: the public menu view, meal details, and menu management for
// authorised staff (dishes, complete meals, ingredients and allergens, nutrition
// source links to SFDA SFCT entries, portions, availability and the menu plan).
//
// Governance: staff and admins maintain the menu. Any change to
// dietary information (ingredients, allergens, portion weights, nutrition
// source, components) marks the affected meals "pending admin
// verification"; until an admin verifies them they need review for every
// patient. Each change bumps the version and re-screens upcoming orders.

import { mealSummary, DEFAULT_PORTIONS } from './catalog.js';
import { can } from './rbac.js';
import { menuDay, menuFor } from './menu.js';
import { NUTRIENTS, scaleNutrition, sfctConsistencyIssue } from './nutrition.js';
import { clean } from './patient.js';
import { PERIODS, PERIOD_IDS, PORTIONS, portionFactor, ALLERGENS, DISH_KINDS, INGREDIENT_FLAGS, INGREDIENT_GROUPS, CUISINES, label } from './constants.js';
import { SOURCES } from './rules.js';
import { addDays, weekdayIndex, WEEKDAYS } from './dates.js';
import { LOCAL_PRODUCTION } from '../data/local-production.js';

const slug = (s) => clean(s, 60).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 48);
const ids = (list) => new Set(list.map((x) => x.id));

export function createMenuAdmin(ctx, workflow) {
  const { repo, today, stamp, deny, invalid, conflict, requirePermission, catalog, menu, reloadCatalog, compatibilityFor, accessPatient, getMealOr404, assertPeriod, assertDate, audit, forScreening, outcomesOf, brief, sfct } = ctx;

  // ------------------------------------------------------------ public menu
  function getMenu({ date = today(), period = null, q = '', diet = null, type = null } = {}) {
    assertDate(date);
    if (period) assertPeriod(period);
    const day = menuDay(menu(), date);
    const term = clean(q, 60).toLowerCase();
    const cat = catalog();
    const matches = (meal) => !term || [meal.name, meal.description, meal.cuisine, ...meal.components.map((c) => c.name), ...meal.ingredients.map((l) => l.ingredient.name)].some((s) => s?.toLowerCase().includes(term));
    const dietOk = (mealId) => !diet || ['eligible', 'depends'].includes(compatibilityFor(mealId).find((c) => c.id === diet)?.status ?? '');
    const typeOk = (meal) => !type || meal.type === type;
    return {
      date, weekday: day.weekday, cycleDay: day.cycleDay,
      periods: day.periods.filter((p) => !period || p.id === period).map((p) => ({
        id: p.id, label: p.label, dateSpecific: p.dateSpecific,
        meals: p.mealIds.map((id) => cat.byId[id]).filter((m) => m && matches(m) && dietOk(m.id) && typeOk(m)).map((m) => ({ ...mealSummary(m), compatibility: compatibilityFor(m.id) })),
      })),
      nutritionNote: 'Nutrition comes only from SFDA Saudi Food Composition Table laboratory values, for dishes the kitchen prepares to the SFCT standard recipe. Other dishes show no values: nothing is estimated.',
    };
  }

  function getMealDetail(actor, mealId, { patientId = null, date = today(), period = null } = {}) {
    const meal = getMealOr404(mealId);
    const staff = actor && ['admin', 'staff'].includes(actor.role);
    const components = meal.components.map((c) => {
      const d = catalog().dishes[c.dishId];
      return {
        dishId: d.id, name: d.name, nameAr: d.nameAr ?? null, kind: d.kind, kindLabel: label(DISH_KINDS, d.kind), cuisine: d.cuisine, description: d.description,
        grams: c.grams, factor: c.factor, servingSize: d.servingSize,
        ingredients: d.lines.map((l) => ({
          id: l.ing, name: l.ingredient.name, grams: Math.round(l.g * c.factor * 10) / 10, prep: l.prep ?? null, optional: Boolean(l.optional),
          allergens: l.ingredient.allergens ?? [], mayContain: (l.ingredient.mayContain ?? []).filter((x) => !(l.ingredient.allergens ?? []).includes(x)),
          labelCheck: Boolean(l.ingredient.labelCheck), note: l.ingredient.note ?? null, local: l.ingredient.local ? { group: l.ingredient.local, ...LOCAL_PRODUCTION[l.ingredient.local] } : null,
        })),
        nutrition: d.nutrition.available ? { available: true, source: d.nutrition.source, perPortion: scaleNutrition(d.nutrition.perPortion, c.factor) } : { available: false, reason: d.nutrition.reason },
        sfct: d.nutrition.entry ? { id: d.nutrition.sfctId ?? d.nutrition.source?.sfctId, name: d.nutrition.entry.name, nameAr: d.nutrition.entry.nameAr ?? null, region: d.nutrition.entry.region, page: d.nutrition.entry.tablePage, recipePage: d.nutrition.entry.recipePage, yield: d.nutrition.entry.yield } : null,
        steps: staff ? d.steps : [], notes: d.notes, batchPortions: d.batchPortions ?? null, version: d.version ?? 1,
      };
    });
    const menuNow = menu();
    const start = today();
    const onMenuDays = Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => ({ date: d, name: WEEKDAYS[weekdayIndex(d)], periods: PERIOD_IDS.filter((p) => menuFor(menuNow, d)[p].includes(meal.id)) })).filter((d) => d.periods.length);
    let evaluation = null;
    let patient = null;
    if (patientId && actor) {
      const p = accessPatient(actor, patientId);
      const per = period ?? meal.category;
      assertPeriod(per);
      evaluation = (catalog().byId[meal.id] && ctx.evaluate(p, meal.id, per));
      patient = { ...brief(p), period: per, date };
      if (actor.role === 'patient') evaluation = { ...evaluation, kitchenInstructions: [] };
    }
    const n = meal.nutrition;
    return {
      meal: {
        ...mealSummary(meal), components,
        infoReview: meal.infoReview, updatedAt: meal.updatedAt ?? null, updatedBy: meal.updatedBy ?? null,
        nutrition: {
          perServing: n.perServing, partial: n.partial, complete: n.complete, missing: n.missing, available: n.available, allAvailable: n.allAvailable, allComplete: n.allComplete,
          method: n.method, source: n.source, sources: n.sources, nutrients: NUTRIENTS,
          byPortion: Object.fromEntries(meal.portions.map((p) => [p, { complete: scaleNutrition(n.perServing, portionFactor(p)), partial: scaleNutrition(n.partial, portionFactor(p)) }])),
        },
        compatibility: compatibilityFor(meal.id),
        local: meal.local,
        onMenu: onMenuDays,
        dataSources: { sfct: SOURCES['SFDA-SFCT'], allergens: SOURCES['SFDA-ALLERGENS'], local: SOURCES['MEWA-LOCAL'] },
        limitations: [
          n.allAvailable ? 'Nutrition comes from SFDA laboratory analysis of the standard recipe for each dish. The kitchen prepares these dishes to that recipe, but real portions and preparation can vary.'
            : n.available ? 'Only some dishes in this meal have SFDA values. Totals that need the others are shown as partial, and diets with nutrient limits need admin review for this meal.'
              : 'No dish in this meal is linked to an SFDA Saudi Food Composition Table entry, so no nutrition is shown. Diets with nutrient limits (sodium, carbohydrate, potassium, phosphorus) need admin review for this meal.',
          'Nothing is estimated: an unavailable value is shown as unavailable and sends the meal to admin review where a rule needs it.',
          'Allergen information comes from ingredient data and SFDA’s 14 declarable allergens. Packaged products vary by brand, so the kitchen checks their labels.',
          'Menu items have no recorded IDDSI texture level; texture-modified diets always need admin review.',
        ],
      },
      evaluation, patient,
    };
  }

  // ------------------------------------------------------------ management views
  const sfctSummary = () => Object.entries(sfct).map(([id, e]) => ({ id, name: e.name, nameAr: e.nameAr ?? null, region: e.region, page: e.tablePage, kcal: e.per100g?.kcal ?? null, sodium: e.per100g?.sodium ?? null, carbs: e.per100g?.totalCarbs ?? null, issue: sfctConsistencyIssue(e) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  function usedIn(dishId) { return catalog().list.filter((m) => m.dishIds.includes(dishId)).map((m) => ({ id: m.id, name: m.name })); }

  function getManageCatalog(actor) {
    requirePermission(actor, 'menu:manage-view', 'Only hospital staff can view menu management.');
    const cat = catalog();
    const raw = repo.getCatalogData();
    return {
      canEdit: can(actor.role, 'menu:edit'), canVerify: can(actor.role, 'menu:verify'),
      meals: raw.meals.map((m) => {
        const e = cat.byId[m.id];
        return e ? { ...mealSummary(e), active: m.active !== false, infoReview: e.infoReview, availabilityChangedBy: m.availabilityChangedBy ?? null, availabilityChangedAt: m.availabilityChangedAt ?? null, updatedAt: m.updatedAt ?? null, updatedBy: m.updatedBy ?? null, raw: m }
          : { id: m.id, name: m.name, active: m.active !== false, archived: true, raw: m };
      }).sort((a, b) => PERIOD_IDS.indexOf(a.category) - PERIOD_IDS.indexOf(b.category) || a.name.localeCompare(b.name)),
      dishes: raw.dishes.map((d) => {
        const e = cat.dishes[d.id];
        return { ...d, nutritionAvailable: e?.nutrition.available ?? false, sfctName: e?.nutrition.entry?.name ?? null, allergens: e?.allergenSummary ?? { contains: [], mayContain: [], labelCheck: [] }, usedIn: usedIn(d.id) };
      }).sort((a, b) => a.name.localeCompare(b.name)),
      ingredients: raw.ingredients.sort((a, b) => a.name.localeCompare(b.name)),
      sfct: sfctSummary(),
      vocab: { dishKinds: DISH_KINDS, ingredientFlags: INGREDIENT_FLAGS, ingredientGroups: INGREDIENT_GROUPS, allergens: ALLERGENS, periods: PERIODS, portions: PORTIONS, cuisines: CUISINES, localGroups: Object.entries(LOCAL_PRODUCTION).map(([id, v]) => ({ id, label: v.label })) },
      recent: repo.listAudit({ scope: 'menu.', limit: 15 }),
    };
  }

  // ------------------------------------------------------------ validation helpers
  const knownIngredients = () => new Set(repo.getCatalogData().ingredients.map((i) => i.id));
  function infoReviewFor(actor, input, previous) {
    if (can(actor.role, 'menu:verify') && input.verify) return { status: 'verified', by: actor.name, at: stamp(), note: clean(input.verifyNote, 200) || 'Verified when saved.' };
    return { status: 'pending', changedBy: actor.name, changedAt: stamp(), previous: previous?.status ?? null };
  }
  function markMealsPending(actor, mealIds, reason, input) {
    const raw = repo.getCatalogData().meals;
    for (const m of raw.filter((x) => mealIds.includes(x.id))) {
      repo.saveMeal({ ...m, infoReview: infoReviewFor(actor, input, m.infoReview), version: (m.version ?? 1) + 1, updatedAt: stamp(), updatedBy: actor.name, lastChange: reason });
    }
  }
  const mealsUsingDish = (dishId) => repo.getCatalogData().meals.filter((m) => m.components.some((c) => c.dish === dishId)).map((m) => m.id);
  const mealsUsingIngredient = (ingId) => {
    const data = repo.getCatalogData();
    const dishes = data.dishes.filter((d) => d.ingredients.some((l) => l.ing === ingId)).map((d) => d.id);
    return data.meals.filter((m) => m.components.some((c) => dishes.includes(c.dish))).map((m) => m.id);
  };
  function afterChange(actor, mealIds, change) {
    reloadCatalog();
    return mealIds.length ? workflow.recheckMeals(actor, mealIds, { cause: 'meal-change', change }) : [];
  }

  // ------------------------------------------------------------ ingredients
  function saveIngredient(actor, input = {}) {
    requirePermission(actor, 'menu:edit', 'Only staff and admins can edit ingredients.');
    const data = repo.getCatalogData();
    const existing = input.id ? data.ingredients.find((i) => i.id === input.id) : null;
    if (input.id && !existing) throw new ctx.ServiceError(404, 'ingredient_not_found', 'That ingredient does not exist.');
    const errors = {};
    const name = clean(input.name, 60);
    if (!name) errors.name = 'Enter the ingredient name.';
    const id = existing?.id ?? slug(name);
    if (!existing && id && data.ingredients.some((i) => i.id === id)) errors.name = 'An ingredient with this name already exists.';
    const pick = (v, set) => [...new Set((Array.isArray(v) ? v : []).filter((x) => set.has(x)))];
    const allergens = pick(input.allergens, ids(ALLERGENS));
    const mayContain = pick(input.mayContain, ids(ALLERGENS)).filter((x) => !allergens.includes(x));
    const flags = pick(input.flags, ids(INGREDIENT_FLAGS));
    const group = INGREDIENT_GROUPS.some((g) => g.id === input.group) ? input.group : null;
    if (!group) errors.group = 'Choose the ingredient group.';
    const local = input.local && LOCAL_PRODUCTION[input.local] ? input.local : undefined;
    if (Object.keys(errors).length) invalid('Some fields need attention.', errors);
    const rec = { ...(existing ?? {}), id, name, group, allergens, mayContain, flags, labelCheck: Boolean(input.labelCheck), note: clean(input.note, 300) || undefined, local, updatedAt: stamp(), updatedBy: actor.name };
    repo.saveIngredient(rec);
    const safetyChanged = !existing || JSON.stringify([existing.allergens ?? [], existing.mayContain ?? [], existing.flags ?? [], Boolean(existing.labelCheck)]) !== JSON.stringify([allergens, mayContain, flags, rec.labelCheck]);
    const affected = existing && safetyChanged ? mealsUsingIngredient(id) : [];
    if (affected.length) markMealsPending(actor, affected, `Ingredient ${name} allergen or diet data changed`, input);
    const recheck = afterChange(actor, affected, `Allergen or diet data of ${name} changed`);
    audit(actor, null, existing ? 'menu.ingredient.update' : 'menu.ingredient.create', `${existing ? 'Updated' : 'Added'} ingredient ${name}${affected.length ? `; ${affected.length} meal${affected.length > 1 ? 's' : ''} need verification` : ''}.`);
    return { ingredient: rec, affectedMeals: affected.length, recheck };
  }

  // ------------------------------------------------------------ dishes (components)
  function saveDish(actor, input = {}) {
    requirePermission(actor, 'menu:edit', 'Only staff and admins can edit dishes.');
    const data = repo.getCatalogData();
    const existing = input.id ? data.dishes.find((d) => d.id === input.id) : null;
    if (input.id && !existing) throw new ctx.ServiceError(404, 'dish_not_found', 'That dish does not exist.');
    const errors = {};
    const name = clean(input.name, 80);
    if (!name) errors.name = 'Enter the dish name.';
    const id = existing?.id ?? slug(name);
    if (!existing && id && data.dishes.some((d) => d.id === id)) errors.name = 'A dish with this name already exists.';
    const kind = DISH_KINDS.some((k) => k.id === input.kind) ? input.kind : null;
    if (!kind) errors.kind = 'Choose what kind of dish this is.';
    const portionG = Number(input.portionG);
    if (!(Number.isFinite(portionG) && portionG >= 10 && portionG <= 1500)) errors.portionG = 'The standard portion must be between 10 and 1,500 g.';
    const known = knownIngredients();
    const lines = (Array.isArray(input.ingredients) ? input.ingredients : []).filter((l) => l && (l.ing || l.g)).map((l, i) => {
      const g = Number(l.g);
      if (!known.has(l.ing)) errors[`ingredients.${i}`] = 'Choose an ingredient from the list (or add it to the ingredient list first).';
      else if (!(Number.isFinite(g) && g > 0 && g <= 1500)) errors[`ingredients.${i}`] = 'Enter the grams per standard portion (more than 0, at most 1,500).';
      return { ing: l.ing, g: Math.round(g * 10) / 10, prep: clean(l.prep, 80) || undefined, optional: Boolean(l.optional) || undefined };
    });
    if (!lines.length) errors.ingredients = 'Add at least one ingredient. Allergens are worked out from the ingredients.';
    const source = input.nutritionSource === 'sfct' ? 'sfct' : 'none';
    const sfctId = source === 'sfct' ? String(input.sfctId ?? '') : undefined;
    if (source === 'sfct' && !sfct[sfctId]) errors.sfctId = 'Choose the SFDA Saudi Food Composition Table entry this dish is prepared to.';
    else if (source === 'sfct' && sfctConsistencyIssue(sfct[sfctId])) errors.sfctId = `${sfctConsistencyIssue(sfct[sfctId])} It cannot be linked until the project team confirms the values with SFDA.`;
    if (Object.keys(errors).length) invalid('Some fields need attention.', errors);
    const rec = {
      ...(existing ?? {}), id, name, nameAr: clean(input.nameAr, 80) || existing?.nameAr || undefined, kind, category: PERIOD_IDS.includes(input.category) ? input.category : existing?.category ?? 'lunch',
      cuisine: CUISINES.includes(input.cuisine) ? input.cuisine : existing?.cuisine ?? 'Saudi', description: clean(input.description, 300),
      portionG: Math.round(portionG), servingSize: clean(input.servingSize, 60) || `${Math.round(portionG)} g`, ingredients: lines,
      steps: Array.isArray(input.steps) ? input.steps.map((s) => clean(s, 300)).filter(Boolean) : existing?.steps ?? [],
      nutrition: { source, sfctId }, version: (existing?.version ?? 0) + 1, updatedAt: stamp(), updatedBy: actor.name,
    };
    repo.saveDish(rec);
    const affected = existing ? mealsUsingDish(id) : [];
    if (affected.length) markMealsPending(actor, affected, `Dish ${name} changed`, input);
    const recheck = afterChange(actor, affected, `Dish ${name} changed (ingredients, portion or nutrition source)`);
    audit(actor, null, existing ? 'menu.dish.update' : 'menu.dish.create', `${existing ? 'Updated' : 'Added'} dish ${name} (version ${rec.version})${source === 'sfct' ? `, nutrition from SFCT “${sfct[sfctId].name}”` : ', no SFCT nutrition link'}.`);
    return { dish: rec, affectedMeals: affected.length, recheck };
  }

  // ------------------------------------------------------------ meals (what is offered)
  function saveMeal(actor, input = {}) {
    requirePermission(actor, 'menu:edit', 'Only staff and admins can edit meals.');
    const data = repo.getCatalogData();
    const existing = input.id ? data.meals.find((m) => m.id === input.id) : null;
    if (input.id && !existing) throw new ctx.ServiceError(404, 'meal_not_found', 'That meal does not exist.');
    const errors = {};
    const name = clean(input.name, 80);
    if (!name) errors.name = 'Enter the meal name.';
    let id = existing?.id ?? slug(name);
    if (!existing && data.meals.some((m) => m.id === id)) id = `${id}-meal`;
    if (!existing && data.meals.some((m) => m.id === id)) errors.name = 'A meal with this name already exists.';
    const category = PERIOD_IDS.includes(input.category) ? input.category : null;
    if (!category) errors.category = 'Choose the usual meal period.';
    const dishIds = new Set(data.dishes.map((d) => d.id));
    const components = (Array.isArray(input.components) ? input.components : []).filter((c) => c?.dish).map((c, i) => {
      const factor = c.factor == null || c.factor === '' ? 1 : Number(c.factor);
      if (!dishIds.has(c.dish)) errors[`components.${i}`] = 'Choose a dish from the list.';
      else if (!(Number.isFinite(factor) && factor >= 0.25 && factor <= 3)) errors[`components.${i}`] = 'The amount is a multiple of the dish’s standard portion, from 0.25 to 3.';
      return { dish: c.dish, factor: Math.round(factor * 100) / 100 };
    });
    if (!components.length) errors.components = 'Add at least one dish. A complete meal has several components; an individual dish has one.';
    if (new Set(components.map((c) => c.dish)).size !== components.length) errors.components = 'Each dish can be added once.';
    const portions = PORTIONS.map((p) => p.id).filter((p) => (Array.isArray(input.portions) ? input.portions : DEFAULT_PORTIONS[category] ?? ['regular']).includes(p));
    if (!portions.length) errors.portions = 'Offer at least one portion size.';
    if (Object.keys(errors).length) invalid('Some fields need attention.', errors);
    const safetyChanged = !existing || JSON.stringify(existing.components) !== JSON.stringify(components);
    const rec = {
      ...(existing ?? {}), id, name, category, description: clean(input.description, 300), cuisine: CUISINES.includes(input.cuisine) ? input.cuisine : undefined,
      components, portions, available: existing?.available ?? true, active: true,
      infoReview: safetyChanged || input.verify ? infoReviewFor(actor, input, existing?.infoReview) : existing.infoReview,
      version: (existing?.version ?? 0) + 1, updatedAt: stamp(), updatedBy: actor.name,
    };
    repo.saveMeal(rec);
    const portionsReduced = existing && (existing.portions ?? []).some((p) => !portions.includes(p));
    const recheck = afterChange(actor, existing && (safetyChanged || portionsReduced) ? [id] : [], `Meal ${name} changed (components or portions)`);
    audit(actor, null, existing ? 'menu.meal.update' : 'menu.meal.create', `${existing ? 'Updated' : 'Added'} meal ${name} (version ${rec.version}, ${components.length > 1 ? `complete meal of ${components.length} dishes` : 'individual dish'}); dietary information ${rec.infoReview.status === 'verified' ? 'verified' : 'pending admin verification'}.`);
    return { meal: mealSummary(catalog().byId[id]), recheck };
  }

  function setAvailability(actor, mealId, input = {}) {
    requirePermission(actor, 'menu:edit', 'Only staff and admins can change meal availability.');
    const raw = repo.getCatalogData().meals.find((m) => m.id === mealId);
    if (!raw) throw new ctx.ServiceError(404, 'meal_not_found', 'That meal does not exist.');
    const available = input.available === true;
    const reason = clean(input.reason, 150);
    if (!available && !reason) invalid('Give a short reason, for example “Out of stock today”.', { reason: 'Give a short reason.' });
    if ((raw.available !== false) === available) conflict('no_change', `${raw.name} is already ${available ? 'available' : 'unavailable'}.`);
    repo.saveMeal({ ...raw, available, unavailableReason: available ? null : reason, availabilityChangedBy: actor.name, availabilityChangedAt: stamp() });
    reloadCatalog();
    const recheck = available ? [] : workflow.recheckMeals(actor, [mealId], { cause: 'meal-unavailable', change: `${raw.name} marked unavailable: ${reason}` });
    audit(actor, null, 'menu.meal.availability', `${raw.name} marked ${available ? 'available' : `unavailable (${reason})`}${recheck.length ? `; ${recheck.filter((r) => r.hold).length} order${recheck.filter((r) => r.hold).length === 1 ? '' : 's'} put on hold, ${recheck.length} affected` : ''}.`);
    return { meal: mealSummary(catalog().byId[mealId]), recheck };
  }

  function verifyMeal(actor, mealId, input = {}) {
    requirePermission(actor, 'menu:verify', 'Only an admin can verify dietary information.');
    const raw = repo.getCatalogData().meals.find((m) => m.id === mealId);
    if (!raw) throw new ctx.ServiceError(404, 'meal_not_found', 'That meal does not exist.');
    if (raw.infoReview?.status === 'verified') conflict('already_verified', `${raw.name} is already verified.`);
    const note = clean(input.note, 200);
    if (!note) invalid('Add a short verification note, for example what you checked.', { note: 'Add a short note.' });
    repo.saveMeal({ ...raw, infoReview: { status: 'verified', by: actor.name, at: stamp(), note } });
    reloadCatalog();
    audit(actor, null, 'menu.meal.verify', `Verified the dietary information of ${raw.name}: ${note}.`);
    return { meal: mealSummary(catalog().byId[mealId]) };
  }

  // ------------------------------------------------------------ menu plan
  function getMenuPlan(actor, { from = today() } = {}) {
    requirePermission(actor, 'menu:manage-view');
    assertDate(from);
    const m = menu();
    return {
      from, canEdit: can(actor.role, 'menu:edit'),
      cycle: m.cycle.map((day, i) => ({ day: i, weekday: WEEKDAYS[i], periods: PERIOD_IDS.map((p) => ({ period: p, mealIds: day[p] ?? [] })) })),
      dates: Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => ({ ...menuDay(m, d), periods: menuDay(m, d).periods.map((p) => ({ ...p, meals: p.mealIds.map((id) => ({ id, name: catalog().byId[id]?.name ?? id, available: catalog().byId[id]?.available ?? false })) })) })),
      meals: catalog().list.map((x) => ({ id: x.id, name: x.name, category: x.category, type: x.type, available: x.available })),
    };
  }

  function setMenu(actor, input = {}) {
    requirePermission(actor, 'menu:edit', 'Only staff and admins can change the menu.');
    const period = input.period;
    assertPeriod(period);
    const valid = new Set(catalog().list.map((m) => m.id));
    const list = input.mealIds == null ? null : [...new Set((Array.isArray(input.mealIds) ? input.mealIds : []).filter((x) => valid.has(x)))];
    if (list && list.length > 10) invalid('A meal period can have at most 10 meals.');
    let dates;
    let what;
    if (input.scope === 'cycle') {
      const day = Number(input.day);
      if (!(Number.isInteger(day) && day >= 0 && day <= 6)) invalid('Choose the weekday.');
      if (!list) invalid('Choose the meals for this weekday.');
      repo.saveMenuCycle(day, period, list);
      dates = Array.from({ length: 7 }, (_, i) => addDays(today(), i)).filter((d) => weekdayIndex(d) === day);
      what = `${WEEKDAYS[day]} ${period} in the 7-day cycle`;
    } else if (input.scope === 'date') {
      assertDate(input.date, { from: today(), to: addDays(today(), 27), what: 'Menu changes' });
      repo.saveMenuDate(input.date, period, list);
      dates = [input.date];
      what = `${period} on ${input.date}${list ? '' : ' (back to the cycle)'}`;
    } else invalid('Choose whether to change the 7-day cycle or one date.');
    reloadCatalog();
    const recheck = workflow.recheckDates(actor, dates, { cause: 'menu-change', change: `Menu changed: ${what}` });
    audit(actor, null, 'menu.plan', `Changed the menu for ${what}${list ? `: ${list.map((id) => catalog().byId[id]?.name ?? id).join(', ')}` : ''}${recheck.length ? `; ${recheck.length} order${recheck.length > 1 ? 's' : ''} affected` : ''}.`);
    return { ok: true, recheck };
  }

  return {
    api: { getMenu, getMealDetail, getManageCatalog, saveIngredient, saveDish, saveMeal, setAvailability, verifyMeal, getMenuPlan, setMenu },
  };
}

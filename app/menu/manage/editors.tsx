'use client';
// Menu management editors (dialogs): meals, dishes, ingredients, the dated menu
// plan, availability and admin verification. Each posts to /api/manage/* and
// reports field errors from the server next to the field.
import * as React from 'react';
import Link from 'next/link';
import { Plus, X as XIcon, Info, ShieldCheck } from 'lucide-react';
import { apiSend } from '@/lib/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Textarea, NativeSelect } from '@/components/ui/input';
import { Field, OptionCard } from '@/components/ui/field';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Fieldset } from '@/components/forms/fieldset';
import { toast } from '@/components/ui/toast';
import { formatDate, plural } from '@/lib/format';
import { periodLabel } from '@/components/cb/labels';
import { useFormErrors, FormMessage, RowError, recheckText } from '@/components/staff/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Catalog = any;
type Plan = any;
export type EditorProps = { catalog: Catalog; canVerify: boolean; onSaved: () => void };

let seq = 0;
const rowId = () => `r${++seq}`;

/** Submit helper: POST, toast the outcome (with re-screening counts), close. */
function useSave(onSaved: () => void) {
  const [busy, setBusy] = React.useState(false);
  const fe = useFormErrors();
  const save = async (url: string, body: unknown, message: (r: any) => string) => {
    setBusy(true); fe.reset();
    try {
      const r = await apiSend<any>('POST', url, body);
      toast(`${message(r)}${recheckText(r?.recheck)}`, { timeout: 8000 });
      onSaved();
    } catch (err) {
      fe.fail(err);
      requestAnimationFrame(() => document.querySelector('[role="dialog"] [data-field-error], [role="dialog"] [aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    } finally { setBusy(false); }
  };
  return { busy, save, ...fe };
}

function VerifyBox({ canVerify, checked, onChange }: { canVerify: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  return canVerify ? (
    <OptionCard type="checkbox" name="verify" value="1" checked={checked} onChange={(e) => onChange(e.target.checked)}
      title="Mark the dietary information verified" description="I have reviewed the dietary information (ingredients, allergens and nutrition source): mark it verified." />
  ) : <p className="flex items-start gap-1.5 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />Saving dietary changes marks affected meals “pending verification” until an admin verifies them.</p>;
}

function Footer({ busy, label, extra }: { busy: boolean; label: string; extra?: React.ReactNode }) {
  return (
    <DialogFooter>
      {extra}
      <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : label}</Button>
    </DialogFooter>
  );
}

const hasFieldErrors = (errors: Record<string, string>) => Object.keys(errors).length > 0;

// ------------------------------------------------------------------ meal
export function MealEditor({ catalog, canVerify, onSaved, mealId }: EditorProps & { mealId: string | null }) {
  const meal = mealId ? catalog.meals.find((x: any) => x.id === mealId) : null;
  const m0 = meal?.raw ?? { components: [{ dish: '', factor: 1 }], portions: ['small', 'regular', 'large'], category: 'lunch' };
  const [name, setName] = React.useState<string>(m0.name ?? '');
  const [category, setCategory] = React.useState<string>(m0.category ?? 'lunch');
  const [description, setDescription] = React.useState<string>(m0.description ?? '');
  const [comps, setComps] = React.useState<{ id: string; dish: string; factor: string }[]>(() => m0.components.map((c: any) => ({ id: rowId(), dish: c.dish ?? '', factor: String(c.factor ?? 1) })));
  const [portions, setPortions] = React.useState<string[]>(m0.portions ?? []);
  const [verify, setVerify] = React.useState(false);
  const { busy, save, errors, formError } = useSave(onSaved);
  const setComp = (i: number, patch: Partial<{ dish: string; factor: string }>) => setComps((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save('/api/manage/meals', { id: mealId || undefined, name, category, description, components: comps.map((c) => ({ dish: c.dish, factor: c.factor })), portions, verify }, (r) => `Saved ${r.meal.name}.`);
  };
  return (
    <DialogContent wide>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>{mealId ? `Edit meal: ${m0.name}` : 'Add a meal'}</DialogTitle><DialogDescription>A meal is what a patient is offered for one meal period: one dish (individual dish) or several dishes (complete meal).</DialogDescription></DialogHeader>
        <DialogBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="me-name" label="Meal name" error={errors.name}><Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
            <Field id="me-cat" label="Usual meal period" error={errors.category}>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>{catalog.vocab.periods.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</NativeSelect>
            </Field>
          </div>
          <Field id="me-desc" label="Description" optional><Textarea maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Fieldset legend="Components" hint="One dish = individual dish. Two or more = complete meal; its nutrition is the sum of the dishes where SFDA values exist for each.">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {comps.map((c, i) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border bg-background/60 p-2">
                  <label className="sr-only" htmlFor={`cd-${c.id}`}>Dish {i + 1}</label>
                  <NativeSelect id={`cd-${c.id}`} className="min-w-0 flex-1 basis-56" value={c.dish} onChange={(e) => setComp(i, { dish: e.target.value })} aria-invalid={errors[`components.${i}`] ? true : undefined} aria-describedby={errors[`components.${i}`] ? `cd-${c.id}-e` : undefined}>
                    <option value="">Choose a dish…</option>
                    {catalog.dishes.map((d: any) => <option key={d.id} value={d.id}>{d.name} ({d.portionG} g{d.nutritionAvailable ? ', SFCT' : ''})</option>)}
                  </NativeSelect>
                  <span className="flex items-center gap-1.5">
                    <label className="sr-only" htmlFor={`cf-${c.id}`}>Amount of dish {i + 1}, as a multiple of its standard portion</label>
                    <Input id={`cf-${c.id}`} type="number" inputMode="decimal" min={0.25} max={3} step={0.25} value={c.factor} onChange={(e) => setComp(i, { factor: e.target.value })} className="w-24" />
                    <span className="text-sm text-muted-foreground">× portion</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Remove dish ${i + 1}`} disabled={comps.length < 2} onClick={() => setComps((cs) => cs.filter((_, j) => j !== i))}><XIcon aria-hidden /></Button>
                  <RowError id={`cd-${c.id}-e`} message={errors[`components.${i}`]} />
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setComps((cs) => [...cs, { id: rowId(), dish: '', factor: '1' }])}><Plus aria-hidden />Add a dish</Button>
            <RowError message={errors.components} />
          </Fieldset>
          <Fieldset legend="Portions offered">
            <div className="grid gap-2 sm:grid-cols-3">
              {catalog.vocab.portions.map((p: any) => <OptionCard key={p.id} type="checkbox" name="portions" value={p.id} checked={portions.includes(p.id)} onChange={(e) => setPortions((ps) => (e.target.checked ? [...ps, p.id] : ps.filter((x) => x !== p.id)))} title={p.label} description={p.short} />)}
            </div>
            <RowError message={errors.portions} />
          </Fieldset>
          <VerifyBox canVerify={canVerify} checked={verify} onChange={setVerify} />
          <FormMessage message={formError} />
        </DialogBody>
        <Footer busy={busy} label="Save meal" />
      </form>
    </DialogContent>
  );
}

// ------------------------------------------------------------------ dish
export function DishEditor({ catalog, canVerify, onSaved, dishId }: EditorProps & { dishId: string | null }) {
  const d0 = (dishId ? catalog.dishes.find((x: any) => x.id === dishId) : null) ?? { kind: 'main', category: 'lunch', cuisine: 'Saudi', ingredients: [{ ing: '', g: '' }], nutrition: { source: 'none' }, portionG: 300 };
  const [v, setV] = React.useState({ name: d0.name ?? '', nameAr: d0.nameAr ?? '', kind: d0.kind, category: d0.category ?? 'lunch', cuisine: d0.cuisine ?? 'Saudi', portionG: String(d0.portionG ?? ''), description: d0.description ?? '' });
  const [lines, setLines] = React.useState<{ id: string; ing: string; g: string; optional: boolean }[]>(() => d0.ingredients.map((l: any) => ({ id: rowId(), ing: l.ing ?? '', g: String(l.g ?? ''), optional: Boolean(l.optional) })));
  const [source, setSource] = React.useState<string>(d0.nutrition?.source === 'sfct' ? 'sfct' : 'none');
  const [sfctId, setSfctId] = React.useState<string>(d0.nutrition?.sfctId ?? '');
  const [verify, setVerify] = React.useState(false);
  const { busy, save, errors, formError } = useSave(onSaved);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const setLine = (i: number, patch: Partial<{ ing: string; g: string; optional: boolean }>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save('/api/manage/dishes', {
      id: dishId || undefined, ...v, servingSize: d0.servingSize, steps: d0.steps, nutritionSource: source, sfctId: source === 'sfct' ? sfctId : '', verify,
      ingredients: lines.map((l) => ({ ing: l.ing, g: l.g, optional: l.optional, prep: d0.ingredients?.find((x: any) => x.ing === l.ing)?.prep })),
    }, (r) => `Saved ${r.dish.name} (version ${r.dish.version}).${r.affectedMeals ? ` ${plural(r.affectedMeals, 'meal')} affected.` : ''}`);
  };
  return (
    <DialogContent wide>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>{dishId ? `Edit dish: ${d0.name}` : 'Add a dish'}</DialogTitle><DialogDescription>A dish is one component. Its ingredients are in grams per standard portion.</DialogDescription></DialogHeader>
        <DialogBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="de-name" label="Dish name" error={errors.name}><Input value={v.name} maxLength={80} onChange={set('name')} /></Field>
            <Field id="de-ar" label="Arabic name" optional><Input value={v.nameAr} maxLength={80} dir="rtl" lang="ar" onChange={set('nameAr')} /></Field>
            <Field id="de-kind" label="Kind" error={errors.kind}><NativeSelect value={v.kind} onChange={set('kind')}>{catalog.vocab.dishKinds.map((k: any) => <option key={k.id} value={k.id}>{k.label}</option>)}</NativeSelect></Field>
            <Field id="de-cat" label="Usual period"><NativeSelect value={v.category} onChange={set('category')}>{catalog.vocab.periods.map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</NativeSelect></Field>
            <Field id="de-cui" label="Cuisine"><NativeSelect value={v.cuisine} onChange={set('cuisine')}>{catalog.vocab.cuisines.map((c: string) => <option key={c} value={c}>{c}</option>)}</NativeSelect></Field>
            <Field id="de-g" label="Standard portion (g, as served)" error={errors.portionG}><Input type="number" inputMode="numeric" min={10} max={1500} value={v.portionG} onChange={set('portionG')} /></Field>
          </div>
          <Field id="de-desc" label="Description"><Textarea maxLength={300} value={v.description} onChange={set('description')} /></Field>
          <Fieldset legend="Ingredients (grams per standard portion)" hint="Allergens and diet attributes are worked out from these ingredients. Add a missing ingredient on the Ingredients tab first.">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {lines.map((l, i) => {
                const err = errors[`ingredients.${i}`];
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-border bg-background/60 p-2">
                    <label className="sr-only" htmlFor={`di-${l.id}`}>Ingredient {i + 1}</label>
                    <NativeSelect id={`di-${l.id}`} className="min-w-0 flex-1 basis-52" value={l.ing} onChange={(e) => setLine(i, { ing: e.target.value })} aria-invalid={err ? true : undefined} aria-describedby={err ? `di-${l.id}-e` : undefined}>
                      <option value="">Choose…</option>
                      {catalog.ingredients.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </NativeSelect>
                    <span className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`dg-${l.id}`}>Grams of ingredient {i + 1}</label>
                      <Input id={`dg-${l.id}`} type="number" inputMode="decimal" min={0.1} max={1500} step={0.1} value={l.g} onChange={(e) => setLine(i, { g: e.target.value })} className="w-24" />
                      <span className="text-sm text-muted-foreground">g</span>
                    </span>
                    <label className="inline-flex min-h-10 items-center gap-1.5 text-sm"><input type="checkbox" className="size-4 accent-[var(--primary)]" checked={l.optional} onChange={(e) => setLine(i, { optional: e.target.checked })} />optional</label>
                    <Button variant="ghost" size="icon" aria-label={`Remove ingredient ${i + 1}`} disabled={lines.length < 2} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><XIcon aria-hidden /></Button>
                    <RowError id={`di-${l.id}-e`} message={err} />
                  </li>
                );
              })}
            </ul>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setLines((ls) => [...ls, { id: rowId(), ing: '', g: '', optional: false }])}><Plus aria-hidden />Add an ingredient</Button>
            <RowError message={errors.ingredients} />
          </Fieldset>
          <Fieldset legend="Nutrition source">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard name="nutritionSource" value="none" checked={source === 'none'} onChange={() => setSource('none')} title="No nutrient values" description="The SFCT does not cover this recipe. Diets with nutrient limits will need admin review." />
              <OptionCard name="nutritionSource" value="sfct" checked={source === 'sfct'} onChange={() => setSource('sfct')} title="SFDA Saudi Food Composition Tables" description="Only if the kitchen prepares this dish to the SFCT standard recipe." />
            </div>
            {source === 'sfct' ? (
              <Field id="de-sfct" label="SFCT entry" error={errors.sfctId} hint="Entries whose published values are inconsistent cannot be linked.">
                <NativeSelect value={sfctId} onChange={(e) => setSfctId(e.target.value)}>
                  <option value="">Choose…</option>
                  {catalog.sfct.map((x: any) => <option key={x.id} value={x.id} disabled={Boolean(x.issue)}>{x.name} · {x.region} · p. {x.page}{x.issue ? ' (published values inconsistent)' : ''}</option>)}
                </NativeSelect>
              </Field>
            ) : null}
          </Fieldset>
          <VerifyBox canVerify={canVerify} checked={verify} onChange={setVerify} />
          <FormMessage message={formError} />
        </DialogBody>
        <Footer busy={busy} label="Save dish" />
      </form>
    </DialogContent>
  );
}

// ------------------------------------------------------------------ ingredient
function Checks({ legend, name, list, selected, onChange }: { legend: string; name: string; list: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return (
    <Fieldset legend={legend}>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
        {list.map((a) => <OptionCard key={a.id} type="checkbox" name={name} value={a.id} checked={selected.includes(a.id)} onChange={(e) => onChange(e.target.checked ? [...selected, a.id] : selected.filter((x) => x !== a.id))} title={a.label} />)}
      </div>
    </Fieldset>
  );
}

export function IngredientEditor({ catalog, canVerify, onSaved, ingredientId }: EditorProps & { ingredientId: string | null }) {
  const i0 = (ingredientId ? catalog.ingredients.find((x: any) => x.id === ingredientId) : null) ?? { group: 'other', allergens: [], mayContain: [], flags: [] };
  const [name, setName] = React.useState<string>(i0.name ?? '');
  const [group, setGroup] = React.useState<string>(i0.group ?? 'other');
  const [local, setLocal] = React.useState<string>(i0.local ?? '');
  const [allergens, setAllergens] = React.useState<string[]>(i0.allergens ?? []);
  const [mayContain, setMayContain] = React.useState<string[]>(i0.mayContain ?? []);
  const [flags, setFlags] = React.useState<string[]>((i0.flags ?? []).filter((f: string) => f !== 'halal_check'));
  const [labelCheck, setLabelCheck] = React.useState<boolean>(Boolean(i0.labelCheck));
  const [note, setNote] = React.useState<string>(i0.note ?? '');
  const [verify, setVerify] = React.useState(false);
  const { busy, save, errors, formError } = useSave(onSaved);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save('/api/manage/ingredients', {
      id: ingredientId || undefined, name, group, local: local || undefined, allergens, mayContain,
      flags: [...flags, ...((i0.flags ?? []).includes('halal_check') ? ['halal_check'] : [])], labelCheck, note, verify,
    }, (r) => `Saved ${r.ingredient.name}.${r.affectedMeals ? ` ${plural(r.affectedMeals, 'meal')} marked for verification.` : ''}`);
  };
  return (
    <DialogContent wide>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>{ingredientId ? `Edit ingredient: ${i0.name}` : 'Add an ingredient'}</DialogTitle><DialogDescription>Allergens use SFDA’s 14 declarable allergens.</DialogDescription></DialogHeader>
        <DialogBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="ie-name" label="Name" error={errors.name}><Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
            <Field id="ie-group" label="Group" error={errors.group}><NativeSelect value={group} onChange={(e) => setGroup(e.target.value)}>{catalog.vocab.ingredientGroups.map((g: any) => <option key={g.id} value={g.id}>{g.label}</option>)}</NativeSelect></Field>
            <Field id="ie-local" label="Local produce group (MEWA)"><NativeSelect value={local} onChange={(e) => setLocal(e.target.value)}><option value="">None</option>{catalog.vocab.localGroups.map((g: any) => <option key={g.id} value={g.id}>{g.label}</option>)}</NativeSelect></Field>
          </div>
          <Checks legend="Contains (SFDA allergens)" name="allergens" list={catalog.vocab.allergens} selected={allergens} onChange={setAllergens} />
          <Checks legend="May contain (cross-contact or varying brands)" name="mayContain" list={catalog.vocab.allergens} selected={mayContain} onChange={setMayContain} />
          <Checks legend="Diet flags" name="flags" list={catalog.vocab.ingredientFlags} selected={flags} onChange={setFlags} />
          <OptionCard type="checkbox" name="labelCheck" value="1" checked={labelCheck} onChange={(e) => setLabelCheck(e.target.checked)} title="Packaged product" description="The kitchen must check the label of the product actually used." />
          <Field id="ie-note" label="Note" optional><Textarea maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <VerifyBox canVerify={canVerify} checked={verify} onChange={setVerify} />
          <FormMessage message={formError} />
        </DialogBody>
        <Footer busy={busy} label="Save ingredient" />
      </form>
    </DialogContent>
  );
}

// ------------------------------------------------------------------ menu plan
export function PlanEditor({ plan, date, period, onSaved }: { plan: Plan; date: string; period: string; onSaved: () => void }) {
  const day = plan.dates.find((x: any) => x.date === date);
  const per = day.periods.find((p: any) => p.id === period);
  const [scope, setScope] = React.useState<'date' | 'cycle'>('date');
  const [ids, setIds] = React.useState<string[]>(per.mealIds);
  const { busy, save, formError, errors } = useSave(onSaved);
  const meals = [...plan.meals].sort((a: any, b: any) => Number(b.category === period) - Number(a.category === period) || a.name.localeCompare(b.name));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save('/api/manage/menu', { scope, period, date, day: day.cycleDay - 1, mealIds: ids }, () => 'Menu saved.');
  };
  return (
    <DialogContent wide>
      <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>{periodLabel(period)} on {day.weekday} {formatDate(date, { month: 'short', day: 'numeric' })}</DialogTitle><DialogDescription>Removing a meal re-screens upcoming orders: chosen or confirmed meals that are no longer on the menu are put on hold.</DialogDescription></DialogHeader>
        <DialogBody>
          <Fieldset legend="Apply to">
            <div className="grid gap-2 sm:grid-cols-2">
              <OptionCard name="scope" value="date" checked={scope === 'date'} onChange={() => setScope('date')} title="This date only" description="For example a kitchen alternative today." />
              <OptionCard name="scope" value="cycle" checked={scope === 'cycle'} onChange={() => setScope('cycle')} title={`Every ${day.weekday} (7-day cycle)`} />
            </div>
          </Fieldset>
          <Fieldset legend={`Meals (up to 10) · ${ids.length} chosen`}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {meals.map((x: any) => (
                <OptionCard key={x.id} type="checkbox" name="meal" value={x.id} checked={ids.includes(x.id)} disabled={!ids.includes(x.id) && ids.length >= 10}
                  onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, x.id] : cur.filter((y) => y !== x.id)))}
                  title={x.name} description={`${periodLabel(x.category)} · ${x.type === 'complete' ? 'complete meal' : 'dish'}${x.available ? '' : ' · unavailable'}`} />
              ))}
            </div>
          </Fieldset>
          <FormMessage message={formError ?? (hasFieldErrors(errors) ? Object.values(errors)[0] : null)} />
        </DialogBody>
        <Footer busy={busy} label="Save menu" extra={per.dateSpecific ? (
          <Button variant="ghost" disabled={busy} onClick={() => save('/api/manage/menu', { scope: 'date', period, date, mealIds: null }, () => 'Menu saved.')}>Use the 7-day cycle for this date</Button>
        ) : null} />
      </form>
    </DialogContent>
  );
}

// ------------------------------------------------------------------ availability and verification
export function UnavailableDialog({ meal, onSaved }: { meal: any; onSaved: () => void }) {
  const [reason, setReason] = React.useState('');
  const { busy, save, errors, formError } = useSave(onSaved);
  return (
    <DialogContent>
      <form onSubmit={(e) => { e.preventDefault(); save(`/api/manage/meals/${meal.id}/availability`, { available: false, reason }, () => `${meal.name} marked unavailable.`); }} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>Mark {meal.name} unavailable</DialogTitle><DialogDescription>Upcoming offers of this meal are withdrawn, and chosen or confirmed orders are put on hold for the nutrition team to replace. The kitchen is alerted about trays already on its list.</DialogDescription></DialogHeader>
        <DialogBody>
          <Field id="av-r" label="Reason" error={errors.reason} hint="Shown to the team, for example “Out of stock today”."><Input maxLength={150} value={reason} placeholder="e.g. Out of stock today" onChange={(e) => setReason(e.target.value)} /></Field>
          <FormMessage message={errors.reason ? null : formError} />
        </DialogBody>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
          <Button type="submit" variant="destructive-solid" disabled={busy}>{busy ? 'Saving…' : 'Mark unavailable'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function VerifyDialog({ meal, onSaved }: { meal: any; onSaved: () => void }) {
  const [note, setNote] = React.useState('');
  const { busy, save, errors, formError } = useSave(onSaved);
  return (
    <DialogContent>
      <form onSubmit={(e) => { e.preventDefault(); save(`/api/manage/meals/${meal.id}/verify`, { note }, () => `${meal.name} verified.`); }} noValidate className="flex min-h-0 flex-col">
        <DialogHeader><DialogTitle>Verify dietary information: {meal.name}</DialogTitle>
          <DialogDescription>Check the ingredients and allergens of every component and the SFCT links on the meal page before verifying. <Link href={`/meal/${meal.id}`} target="_blank">Open the meal page (new tab)</Link></DialogDescription></DialogHeader>
        <DialogBody>
          <Field id="vf-n" label="Verification note" error={errors.note}><Input maxLength={200} value={note} placeholder="e.g. Checked tahini label: contains sesame" onChange={(e) => setNote(e.target.value)} /></Field>
          <FormMessage message={errors.note ? null : formError} />
        </DialogBody>
        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: 'outline' })}>Cancel</DialogClose>
          <Button type="submit" disabled={busy}><ShieldCheck aria-hidden />{busy ? 'Saving…' : 'Verify'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}


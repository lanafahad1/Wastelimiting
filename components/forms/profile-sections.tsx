'use client';
// Fields for each section of a patient nutrition profile, plus readSection()
// to turn the form into the input the server validates (the server checks
// everything again; these fields only collect coded values).
import * as React from 'react';
import { OptionCard } from '@/components/ui/field';
import { Input, NativeSelect, Textarea, Label } from '@/components/ui/input';
import { Fieldset, Options } from './fieldset';
import { IngredientPicker, TextList } from './pickers';
import { FieldError } from './errors';
import { label } from '@/domain/constants.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Reference = any;
export type Patient = any;
export type Section = 'details' | 'clinical' | 'preferences' | 'appetite';

function TextField({ id, name, labelText, defaultValue, hint, errorName, ...rest }: { id: string; name: string; labelText: string; defaultValue?: string | number | null; hint?: string; errorName?: string } & React.ComponentProps<'input'>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{labelText}</Label>
      <Input id={id} name={name} defaultValue={defaultValue ?? ''} aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint ? <span id={`${id}-hint`} className="text-sm text-muted-foreground">{hint}</span> : null}
      <FieldError name={errorName ?? name} />
    </div>
  );
}

function SelectField({ id, name, labelText, value, options, empty = 'Choose', errorName }: { id: string; name: string; labelText: string; value?: string | null; options: { id: string; label: string }[]; empty?: string; errorName?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{labelText}</Label>
      <NativeSelect id={id} name={name} defaultValue={value ?? ''}><option value="">{empty}</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</NativeSelect>
      <FieldError name={errorName ?? name} />
    </div>
  );
}

export function SectionFields({ section, p, reference }: { section: Section; p: Patient; reference: Reference }) {
  const v = reference.vocab;
  const ing = reference.ingredients;
  if (section === 'details') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="f-demo" name="demoId" labelText="Demonstration patient identifier" defaultValue={p.demoId} placeholder="CB-1010" maxLength={7} autoCapitalize="characters" hint="Format CB-1234. Never enter a real medical record number." />
        <TextField id="f-name" name="preferredName" labelText="Preferred name (fictional)" defaultValue={p.preferredName} maxLength={30} />
        <SelectField id="f-age" name="ageRange" labelText="Age range" value={p.ageRange} options={v.ageRanges} />
        <SelectField id="f-ward" name="ward" labelText="Hospital ward" value={p.ward} options={v.wards} />
        <TextField id="f-bed" name="bed" labelText="Bed or room" defaultValue={p.bed} maxLength={8} />
      </div>
    );
  }
  if (section === 'clinical') {
    const o = p.dietOrder;
    return (
      <div className="flex flex-col gap-7">
        <Fieldset legend="Relevant medical conditions">
          <Options>{v.conditions.map((c: any) => <OptionCard key={c.id} type="checkbox" name="conditions" value={c.id} defaultChecked={p.conditions.selected.includes(c.id)} title={c.label} />)}</Options>
          <TextField id="f-other" name="otherText" labelText="Other condition (if selected)" defaultValue={p.conditions.otherText} maxLength={120} errorName="conditions.otherText" />
          <FieldError name="conditions.selected" />
        </Fieldset>
        <Fieldset legend="Prescribed diet (one or more documented categories)">
          <Options wide>
            {reference.dietCategories.filter((d: any) => d.status !== 'retired' || o.categories.includes(d.id)).map((d: any) => (
              <OptionCard key={d.id} type="checkbox" name="categories" value={d.id} defaultChecked={o.categories.includes(d.id)} title={`${d.plain} (${d.code})`} description={`${reference.dietSupport[d.support]?.label ?? ''}. ${d.description}`} />
            ))}
          </Options>
          <p className="text-sm text-muted-foreground">Lactose-free and vegan are no longer separate categories: record a lactose intolerance on the allergy record, or specific exclusions, instead.</p>
          <FieldError name="dietOrder.categories" />
          <OptionCard type="checkbox" name="npo" value="on" defaultChecked={o.npo} title="Nothing by mouth (NPO)" description="No meals are offered or sent to the kitchen while this is set." />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="f-tex" name="textureLevel" labelText="IDDSI texture level (texture-modified diets)" value={o.textureLevel} options={v.textureLevels} empty="Not applicable" errorName="dietOrder.textureLevel" />
            <Fieldset legend={<span className="text-sm">Portions permitted</span>}>
              <div className="grid grid-cols-3 gap-2">{v.portions.map((x: any) => <OptionCard key={x.id} type="checkbox" name="portionsPermitted" value={x.id} defaultChecked={o.portionsPermitted.includes(x.id)} title={x.label} description={x.short} />)}</div>
              <FieldError name="dietOrder.portionsPermitted" />
            </Fieldset>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {v.limitFields.map((f: any) => (
              <TextField key={f.key} id={`f-${f.key}`} name={f.key} type="number" inputMode="numeric" min={f.min} max={f.max} labelText={`${f.label} limit (${f.unit})`} defaultValue={o[f.key] ?? ''}
                placeholder={f.key === 'sodiumMgPerDay' ? '2000 (default)' : 'Set by the admin'} hint={`${f.min}–${f.max}. ${f.hint}`} errorName={`dietOrder.${f.key}`} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-notes">Diet order notes for the team and kitchen</Label>
            <Textarea id="f-notes" name="dietNotes" maxLength={300} defaultValue={o.notes} aria-describedby="f-notes-hint" />
            <span id="f-notes-hint" className="text-sm text-muted-foreground">Shown on kitchen tray tickets. Do not include identifying details.</span>
          </div>
        </Fieldset>
        <Fieldset legend="Food allergies (confirmed)">
          <Options>{v.allergyStatus.map((s: any) => <OptionCard key={s.id} name="allergyStatus" value={s.id} defaultChecked={p.allergies.status === s.id} title={s.label} description={s.hint} />)}</Options>
          <FieldError name="allergies.status" />
          <span className="text-sm font-semibold text-heading">Allergen groups (the 14 allergens SFDA requires food services to declare)</span>
          <Options>{v.allergens.map((a: any) => <OptionCard key={a.id} type="checkbox" name="allergens" value={a.id} defaultChecked={p.allergies.confirmed.includes(a.id)} title={a.label} description={a.hint} />)}</Options>
          <span className="text-sm font-semibold text-heading">Specific ingredients</span>
          <IngredientPicker name="allergyIngredients" initial={p.allergies.ingredients} ingredients={ing} allergens={v.allergens} tone="danger" />
          <span className="text-sm font-semibold text-heading">Allergies that are not in the list</span>
          <TextList name="allergyText" initial={p.allergies.uncoded} placeholder="e.g. kiwi" />
          <span className="text-sm text-muted-foreground">Text that cannot be matched to an allergen group or ingredient is kept, and every meal then needs admin review.</span>
        </Fieldset>
        <Fieldset legend="Intolerances (recorded separately from allergies)">
          <Options>{v.intolerances.map((i: any) => <OptionCard key={i.id} type="checkbox" name="intolerances" value={i.id} defaultChecked={p.intolerances.selected.includes(i.id)} title={i.label} />)}</Options>
          <span className="text-sm font-semibold text-heading">Specific ingredients</span>
          <IngredientPicker name="intoleranceIngredients" initial={p.intolerances.ingredients} ingredients={ing} allergens={v.allergens} tone="warn" />
          <span className="text-sm font-semibold text-heading">Other intolerances</span>
          <TextList name="intoleranceText" initial={p.intolerances.uncoded} placeholder="e.g. high-FODMAP onion" />
        </Fieldset>
        <Fieldset legend="Other medically required restrictions">
          <span className="text-sm font-semibold text-heading">Ingredients the care team has excluded</span>
          <IngredientPicker name="medicalExclusions" initial={p.restrictions.medicalExclusions} ingredients={ing} allergens={v.allergens} tone="danger" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-mnotes">Other restriction notes (not screened automatically)</Label>
            <Textarea id="f-mnotes" name="medicalNotes" maxLength={300} defaultValue={p.restrictions.medicalNotes} />
          </div>
        </Fieldset>
      </div>
    );
  }
  if (section === 'preferences') {
    const pr = p.preferences;
    return (
      <div className="flex flex-col gap-6">
        <Fieldset legend="Preferred cuisines"><Options>{v.cuisines.map((c: string) => <OptionCard key={c} type="checkbox" name="cuisines" value={c} defaultChecked={pr.cuisines.includes(c)} title={c} />)}</Options></Fieldset>
        <Fieldset legend="Preferred foods"><IngredientPicker name="favorites" initial={pr.favorites} ingredients={ing} allergens={v.allergens} tone="pink" hint="Favourites only change the ranking. They never override an allergy or restriction." /></Fieldset>
        <Fieldset legend="Disliked ingredients"><IngredientPicker name="dislikes" initial={pr.dislikes} ingredients={ing} allergens={v.allergens} hint="Meals with disliked ingredients are ranked lower; optional ones are left out by the kitchen." /></Fieldset>
        <Fieldset legend="Preferred portion size" hint="Offered only within the portions the diet order permits.">
          <div className="grid gap-2 sm:grid-cols-3">{v.portions.map((x: any) => <OptionCard key={x.id} name="preferredPortion" value={x.id} defaultChecked={pr.preferredPortion === x.id} title={x.label} description={`${x.short} serving${p.dietOrder.portionsPermitted.includes(x.id) ? '' : ' · not permitted by the diet order'}`} />)}</div>
        </Fieldset>
      </div>
    );
  }
  return (
    <Fieldset legend="Current appetite">
      <div className="grid gap-2 sm:grid-cols-3">{v.appetite.map((a: any) => <OptionCard key={a.id} name="level" value={a.id} defaultChecked={p.appetite.level === a.id} title={a.label} description={a.id === 'poor' ? 'Smaller portions are suggested.' : a.id === 'fair' ? 'Portions are capped at regular.' : 'The preferred portion is suggested.'} />)}</div>
      <FieldError name="level" />
    </Fieldset>
  );
}

/** Read a section form into the input shape the server expects. */
export function readSection(section: Section, form: HTMLFormElement): Record<string, unknown> {
  const fd = new FormData(form);
  const all = (n: string) => fd.getAll(n).map(String);
  const one = (n: string) => (fd.get(n) == null ? '' : String(fd.get(n)));
  if (section === 'details') return { demoId: one('demoId'), preferredName: one('preferredName'), ageRange: one('ageRange'), ward: one('ward'), bed: one('bed') };
  if (section === 'clinical') {
    const dietOrder: Record<string, unknown> = { categories: all('categories'), npo: fd.get('npo') === 'on', textureLevel: one('textureLevel'), portionsPermitted: all('portionsPermitted'), notes: one('dietNotes') };
    for (const k of ['sodiumMgPerDay', 'potassiumMgPerDay', 'phosphorusMgPerDay', 'carbsGPerMeal']) { const x = one(k).trim(); if (x !== '') dietOrder[k] = x; }
    return {
      conditions: { selected: all('conditions'), otherText: one('otherText') },
      dietOrder,
      allergies: { status: one('allergyStatus') || 'unknown', confirmed: all('allergens'), ingredients: all('allergyIngredients'), uncoded: all('allergyText') },
      intolerances: { selected: all('intolerances'), ingredients: all('intoleranceIngredients'), uncoded: all('intoleranceText') },
      restrictions: { medicalExclusions: all('medicalExclusions'), medicalNotes: one('medicalNotes') },
    };
  }
  if (section === 'preferences') return { cuisines: all('cuisines'), favorites: all('favorites'), dislikes: all('dislikes'), preferredPortion: one('preferredPortion') || 'regular' };
  return { level: one('level') };
}

function Kv({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(9rem,auto)_1fr]">
      {rows.map(([k, val], i) => <React.Fragment key={i}><dt className="text-sm font-semibold text-muted-foreground">{k}</dt><dd className="min-w-0">{val}</dd></React.Fragment>)}
    </dl>
  );
}
const List = ({ xs, empty = 'None recorded' }: { xs: string[]; empty?: string }) => (xs.length ? <>{xs.join(', ')}</> : <span className="text-muted-foreground">{empty}</span>);

/** Read-only summary of a profile section. */
export function SectionSummary({ section, p, reference }: { section: Section; p: Patient; reference: Reference }) {
  const v = reference.vocab;
  const ingName = (id: string) => reference.ingredients.find((i: any) => i.id === id)?.name ?? id;
  if (section === 'details') {
    return <Kv rows={[
      ['Identifier', <><b>{p.demoId}</b> <span className="text-sm text-muted-foreground">(demonstration only)</span></>],
      ['Preferred name', p.preferredName || '—'], ['Ward and bed', `${label(v.wards, p.ward)} · Bed ${p.bed}`], ['Age range', label(v.ageRanges, p.ageRange)],
      ['Admission', p.status === 'admitted' ? `Admitted ${p.admittedOn ?? ''}` : `Discharged ${p.dischargedOn ?? ''}`],
    ]} />;
  }
  if (section === 'clinical') {
    const o = p.dietOrder;
    const cats = o.categories.map((c: string) => reference.dietCategories.find((d: any) => d.id === c)).filter(Boolean);
    const limits = v.limitFields.filter((f: any) => o[f.key] != null).map((f: any) => `${f.label} ${Number(o[f.key]).toLocaleString('en-US')} ${f.unit}`);
    const rows: [React.ReactNode, React.ReactNode][] = [
      ['Conditions', <List key="c" xs={p.conditions.selected.map((c: string) => (c === 'other' ? p.conditions.otherText : label(v.conditions, c)))} />],
      ['Prescribed diet', <span key="d" className="flex flex-col">{o.npo ? <span className="font-semibold">NPO · nothing by mouth</span> : null}{cats.map((d: any) => <span key={d.id}>{d.plain} <span className="text-xs font-bold text-muted-foreground">({d.code})</span></span>)}</span>],
      ...(o.textureLevel ? [['Texture', label(v.textureLevels, o.textureLevel)] as [string, string]] : []),
      ['Portions permitted', o.portionsPermitted.map((x: string) => label(v.portions, x)).join(', ')],
      ['Limits', limits.length ? limits.join(' · ') : <span key="l" className="text-muted-foreground">None set; documented defaults apply</span>],
      ...(o.notes ? [['Diet order notes', o.notes] as [string, string]] : []),
      ['Allergies', p.allergies.status === 'unknown' ? <b key="a" className="text-warning">Not yet assessed</b> : p.allergies.status === 'nka' ? 'No known food allergies'
        : <List key="a" xs={[...p.allergies.confirmed.map((a: string) => label(v.allergens, a)), ...p.allergies.ingredients.map(ingName), ...p.allergies.uncoded.map((t: string) => `${t} (not coded)`)]} />],
      ['Intolerances', <List key="i" xs={[...p.intolerances.selected.map((i: string) => label(v.intolerances, i)), ...p.intolerances.ingredients.map(ingName), ...p.intolerances.uncoded.map((t: string) => `${t} (not coded)`)]} />],
      ['Excluded ingredients', <List key="e" xs={p.restrictions.medicalExclusions.map(ingName)} />],
      ...(p.restrictions.medicalNotes ? [['Restriction notes', p.restrictions.medicalNotes] as [string, string]] : []),
    ];
    return <Kv rows={rows} />;
  }
  if (section === 'preferences') {
    const pr = p.preferences;
    return <Kv rows={[
      ['Cuisines', <List key="c" xs={pr.cuisines} />], ['Preferred foods', <List key="f" xs={pr.favorites.map(ingName)} />], ['Disliked', <List key="d" xs={pr.dislikes.map(ingName)} />],
      ['Preferred portion', <>{label(v.portions, pr.preferredPortion)}{p.dietOrder.portionsPermitted.includes(pr.preferredPortion) ? '' : <span className="text-warning"> · not permitted; nearest permitted portion offered</span>}</>],
    ]} />;
  }
  return <Kv rows={[['Current appetite', label(v.appetite, p.appetite.level)]]} />;
}

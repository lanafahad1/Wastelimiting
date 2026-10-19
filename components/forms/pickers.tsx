'use client';
import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { label } from '@/domain/constants.js';

export type Ingredient = { id: string; name: string; allergens: string[] };
type Tone = 'danger' | 'warn' | 'pink' | '';
const TONE: Record<string, string> = { danger: 'bg-destructive-soft text-destructive border-[#F3C9D3]', warn: 'bg-warning-soft text-warning border-[#F1DFB8]', pink: 'bg-rose text-rose-ink border-rose', '': 'bg-mint text-sage-deep border-sage' };

function Token({ text, tone, onRemove, name, value }: { text: string; tone: Tone; onRemove: () => void; name: string; value: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-sm font-semibold', TONE[tone])}>
      {text}
      <input type="hidden" name={name} value={value} />
      <button type="button" onClick={onRemove} aria-label={`Remove ${text}`} className="grid size-6 place-items-center rounded-full hover:bg-white/60"><X className="size-3.5" aria-hidden /></button>
    </span>
  );
}

/** Searchable ingredient picker; the chosen ids are submitted as hidden inputs named `name`. */
export function IngredientPicker({ name, initial = [], ingredients, allergens, tone = '', hint, id }: { name: string; initial?: string[]; ingredients: Ingredient[]; allergens: { id: string; label: string }[]; tone?: Tone; hint?: string; id?: string }) {
  const [ids, setIds] = React.useState<string[]>(initial);
  const [q, setQ] = React.useState('');
  const inputId = id ?? `pick-${name}`;
  const t = q.trim().toLowerCase();
  const hits = t.length < 2 ? [] : ingredients.filter((i) => !ids.includes(i.id) && (i.name.toLowerCase().includes(t) || i.id.includes(t))).slice(0, 8);
  const nameOf = (x: string) => ingredients.find((i) => i.id === x)?.name ?? x;
  const add = (x: string) => { setIds((cur) => (cur.includes(x) ? cur : [...cur, x])); setQ(''); };
  return (
    <div className="flex flex-col gap-2">
      {ids.length ? <div className="flex flex-wrap gap-1.5">{ids.map((x) => <Token key={x} name={name} value={x} text={nameOf(x)} tone={tone} onRemove={() => setIds((cur) => cur.filter((y) => y !== x))} />)}</div> : null}
      <Input id={inputId} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients, e.g. sesame or dates" aria-label="Add ingredient" autoComplete="off"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hits[0]) add(hits[0].id); } }} />
      {t.length >= 2 ? (
        <div className="flex flex-col overflow-hidden rounded-[12px] border border-border bg-card" role="listbox" aria-label="Matching ingredients">
          {hits.length ? hits.map((i) => (
            <button key={i.id} type="button" role="option" aria-selected={false} onClick={() => add(i.id)} className="px-3 py-2 text-left text-sm hover:bg-mint focus-visible:bg-mint">
              {i.name}{i.allergens.length ? <span className="text-muted-foreground"> ({i.allergens.map((a) => label(allergens, a)).join(', ')})</span> : null}
            </button>
          )) : <span className="px-3 py-2 text-sm text-muted-foreground">No matching ingredient. For allergies, add it as text below.</span>}
        </div>
      ) : null}
      {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/** Free-text list (allergies or intolerances that cannot be coded). */
export function TextList({ name, initial = [], placeholder }: { name: string; initial?: string[]; placeholder: string }) {
  const [items, setItems] = React.useState<string[]>(initial);
  const [v, setV] = React.useState('');
  const add = () => { const x = v.trim(); if (x && !items.includes(x)) setItems([...items, x]); setV(''); };
  return (
    <div className="flex flex-col gap-2">
      {items.length ? <div className="flex flex-wrap gap-1.5">{items.map((x) => <Token key={x} name={name} value={x} text={x} tone="warn" onRemove={() => setItems(items.filter((y) => y !== x))} />)}</div> : null}
      <div className="flex gap-2">
        <Input type="text" maxLength={60} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} className="min-w-0 flex-1" />
        <Button size="sm" variant="outline" onClick={add}><Plus aria-hidden />Add</Button>
      </div>
    </div>
  );
}

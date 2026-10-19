import Link from 'next/link';
import { Leaf, X, TriangleAlert, Scale, Layers, BookOpen, Database } from 'lucide-react';
import { MealArt, MealType, NutriSummary, AllergenLine, LocalLine } from '@/components/cb/meal';
import { portionLabel } from '@/components/cb/labels';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CompatChips, type Compat } from './compat';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MenuMeal = any & { compatibility: Compat[] };

/** One meal on the public hospital menu. */
export function MenuMealCard({ meal, href }: { meal: MenuMeal; href: string }) {
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="relative">
        <MealArt meal={meal} label className="aspect-[4/3] w-full rounded-none" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge>{meal.cuisine}</Badge>
          {meal.nutritionComplete ? <Badge variant="ok"><Database aria-hidden />SFDA values</Badge> : null}
          {meal.local?.length ? <Badge variant="ok"><Leaf aria-hidden />Local produce</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg"><Link href={href} className="no-underline hover:underline">{meal.name}</Link></h3>
          <MealType m={meal} />
          {meal.description ? <p className="text-[.95rem] text-muted-foreground">{meal.description}</p> : null}
        </div>
        {(meal.available === false || meal.infoStatus === 'pending') ? (
          <div className="flex flex-wrap gap-1.5">
            {meal.available === false ? <Badge variant="danger" className="whitespace-normal"><X aria-hidden />Unavailable today{meal.unavailableReason ? `: ${meal.unavailableReason}` : ''}</Badge> : null}
            {meal.infoStatus === 'pending' ? <Badge variant="warn" className="whitespace-normal"><TriangleAlert aria-hidden />Dietary information not yet verified by an admin</Badge> : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="inline-flex items-start gap-1.5"><Scale className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Standard serving: {meal.servingSize}</span>
          <span className="inline-flex items-start gap-1.5"><Layers className="mt-0.5 size-4 shrink-0 text-heading" aria-hidden />Portions: {meal.portions.map(portionLabel).join(', ')}</span>
        </div>
        <NutriSummary n={meal.nutrition} caption="Nutrition per standard serving" partial={meal.nutritionPartial} missingFrom={meal.nutritionMissingFrom} />
        <AllergenLine a={meal.allergens} />
        <LocalLine local={meal.local} />
        <CompatChips list={meal.compatibility} />
        <div className="mt-auto pt-1">
          <Link href={href} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'w-full sm:w-fit' })}><BookOpen aria-hidden />Ingredients, nutrition &amp; sources</Link>
        </div>
      </div>
    </article>
  );
}

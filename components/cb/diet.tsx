import { Toggletip } from './toggletip';
import { DIET_CATEGORIES } from '@/domain/rules.js';

const DIET_TIPS: Record<string, string> = Object.fromEntries([
  ...DIET_CATEGORIES.map((d: { code: string; plain: string; description: string }) => [d.code, `${d.plain}: ${d.description}`]),
  ['NPO', 'Nothing by mouth: no food or drink is given while this order is active.'],
]);

/** Plain-language diet names; each code is a toggletip with its explanation. */
export function DietNames({ codes = [], labels = [] }: { codes?: string[]; labels?: string[] }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1.5">
      {codes.map((c, i) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <span>{labels[i] ?? c}</span>
          <Toggletip label={c} ariaLabel={`About ${labels[i] ?? c} (code ${c})`}>{DIET_TIPS[c] ?? labels[i] ?? c}</Toggletip>
        </span>
      ))}
    </span>
  );
}

/** Diet codes only (compact tables); each opens its explanation. */
export function DietCodes({ codes = [], labels = [] }: { codes?: string[]; labels?: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {codes.map((c, i) => <Toggletip key={c} label={c} ariaLabel={`${c}: ${labels[i] ?? c}. Show explanation`}>{DIET_TIPS[c] ?? labels[i] ?? c}</Toggletip>)}
      {labels.length ? <span className="sr-only">{labels.join(', ')}</span> : null}
    </span>
  );
}

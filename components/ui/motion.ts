// Map Base UI's transition lifecycle onto the transitions.dev class hooks:
// mount (starting) → no class, then .is-open; closing (ending) → .is-closing.
// Base UI keeps the element mounted until the CSS transition finishes.
type MotionState = { open?: boolean; transitionStatus?: 'starting' | 'ending' | 'idle' | undefined };

export function motionClass(s: MotionState): string {
  if (s.transitionStatus === 'ending') return 'is-closing';
  if (s.transitionStatus === 'starting') return '';
  return s.open === false ? '' : 'is-open';
}

/** transitions.dev dropdown origin from Base UI's side + align. */
export function originFor(side: string = 'bottom', align: string = 'start'): string {
  const v = side === 'top' ? 'bottom' : 'top';
  const h = align === 'end' ? 'right' : align === 'center' ? 'center' : 'left';
  return `${v}-${h}`;
}

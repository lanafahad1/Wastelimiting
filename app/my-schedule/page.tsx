import { redirect } from 'next/navigation';

/** The patient's week is a view inside My Meals. */
export default function MySchedulePage() {
  redirect('/my-meals?view=week');
}

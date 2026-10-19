// Patient Overview "Show" filter: [id, label, key in the server's counts]. Shared by the server page and the view.
export const FILTERS: [string, string, string][] = [
  ['all', 'All', 'all'],
  ['attention', 'Needs attention', 'attention'],
  ['hold', 'Meals on hold or changed', 'hold'],
  ['review', 'Needs admin review', 'review'],
  ['no-options', 'No suitable options', 'noOptions'],
  ['intake', 'Low intake or refusal', 'intake'],
  ['requests', 'Pending requests', 'requests'],
];

// Tabs of the Patient Nutrition Profile (?tab= deep links). Shared by the server page and the view.
export const TABS = ['meals', 'profile', 'intake', 'requests', 'changes'] as const;
export type Tab = (typeof TABS)[number];

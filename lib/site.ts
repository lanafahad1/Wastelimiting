// Site-wide constants (safe for client and server).
export const SITE_NAME = 'CareBite';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const SITE_DESCRIPTION = 'CareBite matches hospital meals to each patient’s prescribed diet, allergies, preferences and appetite, using Saudi government food and health guidance (MOH, SFDA, MEWA, GFSA). A university Health Informatics project.';

export const TEAM = ['Lana Fahad Alhari', 'Nebras Almutairi', 'Alhanouf Aldubyan', 'Shumua Alharbi'];

export const DISCLAIMER = 'CareBite is an educational Health Informatics project designed to demonstrate personalized nutritional decision support. It does not diagnose medical conditions, replace professional medical advice, or guarantee clinical outcomes. Meal suggestions depend on the available data and reviewed dietary rules. Users with complex medical conditions, prescribed diets, or uncertain allergy information should consult a qualified healthcare professional.';

export type NavItem = { href: string; label: string; permission?: string };

export const PUBLIC_NAV: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/menu', label: 'Hospital Menu' },
  { href: '/about', label: 'About & Sources' },
];

/** Signed-in navigation. Items are shown only when the role holds the RBAC permission. */
export const STAFF_NAV: NavItem[] = [
  { href: '/patients', label: 'Patients', permission: 'patient:list' },
  { href: '/dashboard', label: 'Dashboard', permission: 'dashboard:view' },
  { href: '/requests', label: 'Requests', permission: 'request:list' },
  { href: '/schedule', label: 'Schedule', permission: 'schedule:view' },
  { href: '/kitchen', label: 'Kitchen', permission: 'kitchen:view' },
  { href: '/menu/manage', label: 'Menu', permission: 'menu:manage-view' },
  { href: '/staff-access', label: 'Staff Access', permission: 'staff:manage' },
];
export const PATIENT_NAV: NavItem[] = [
  { href: '/my-meals', label: 'My Meals' },
  { href: '/my-requests', label: 'My Requests' },
  { href: '/my-profile', label: 'My Food Profile' },
];

export const ABOUT_NAV: NavItem[] = [
  { href: '/about', label: 'About the project' },
  { href: '/diets', label: 'Diets & rules' },
  { href: '/sources', label: 'Data sources & limitations' },
  { href: '/contact', label: 'Contact' },
];

export const CITATION = 'Alhari, L. F., Almutairi, N., Aldubyan, A., & Alharbi, S. (2026). CareBite: Personalized hospital meal recommendation platform [University Health Informatics project].';

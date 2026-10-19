// Role-based access control: the single authorization policy for CareBite.
// Every server check (domain service, API routes, pages) asks `can(role,
// permission)`; the UI only uses the same table to hide actions a role does
// not have. Ownership ("a patient sees only their own record") is checked in
// the service on top of the permission.
//
// Three roles:
//   admin   — controls everything, including clinical information and staff access
//   staff   — runs daily meal service; no clinical edits, review approvals or access management
//   patient — their own meals, profile, feedback and requests

export const ROLE_IDS = ['admin', 'staff', 'patient'];

const ALL = ['admin', 'staff', 'patient'];
const TEAM = ['admin', 'staff'];
const ADMIN = ['admin'];

/** permission → roles that hold it */
export const PERMISSIONS = Object.freeze({
  // patient records
  'patient:read': ALL, // patients: own record only (ownership check in the service)
  'patient:list': TEAM,
  'patient:create': ADMIN,
  'patient:delete': ADMIN,
  'patient:edit-details': TEAM,
  'patient:edit-clinical': ADMIN,
  'patient:edit-preferences': ALL,
  'patient:edit-appetite': ALL,
  'patient:admission': TEAM, // discharge and readmission
  'patient:link-account': TEAM, // link codes and unlinking
  // meal workflow
  'meal:offer': TEAM,
  'meal:choose': ALL,
  'meal:confirm': TEAM,
  'meal:cancel': TEAM,
  'meal:resolve-hold': TEAM,
  'meal:approve-review': ADMIN, // offer, confirm or keep a meal that needs review
  'meal:plan': TEAM, // day plans and automatic scheduling
  // kitchen
  'kitchen:view': TEAM,
  'kitchen:progress': TEAM, // prepared, delivered, undo, acknowledge alerts
  'schedule:view': TEAM,
  // intake and requests
  'intake:record': ALL,
  'request:create': ALL,
  'request:list': TEAM,
  'request:resolve': TEAM,
  'request:resolve-clinical': ADMIN,
  'dashboard:view': TEAM,
  // menu
  'menu:manage-view': TEAM,
  'menu:edit': TEAM,
  'menu:verify': ADMIN,
  // platform
  'staff:manage': ADMIN,
  'demo:reset': ADMIN,
});

/** Profile sections and the permission that edits each. */
export const SECTION_PERMISSION = Object.freeze({
  details: 'patient:edit-details',
  clinical: 'patient:edit-clinical',
  preferences: 'patient:edit-preferences',
  appetite: 'patient:edit-appetite',
});

export function can(role, permission) {
  const roles = PERMISSIONS[permission];
  if (!roles) throw new Error(`Unknown permission: ${permission}`);
  return Boolean(role) && roles.includes(role);
}

/** Every permission a role holds (sent to the UI to show or hide actions). */
export function permissionsFor(role) {
  return Object.keys(PERMISSIONS).filter((p) => can(role, p));
}

/** Roles that hold a permission (for documentation and the reference endpoint). */
export const rolesWith = (permission) => [...(PERMISSIONS[permission] ?? [])];

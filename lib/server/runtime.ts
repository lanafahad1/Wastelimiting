// The server runtime: one SQLite database shared by the CareBite domain and
// better-auth, created once per server process (and kept across dev reloads).
import 'server-only';
import { join } from 'node:path';
import { getMigrations } from 'better-auth/db/migration';
import { openDatabase, createSqliteRepo } from '@/domain/sqlite-repo.js';
import { createService } from '@/domain/service.js';
import { seedCatalog, seedHospitalDemo, linkDemoAccounts, DEMO_ACCOUNTS, DEMO_PENDING_STAFF } from '@/domain/demo-data.js';
import { betterAuth } from 'better-auth';
import { authOptions, type Auth } from './auth';
import { passwordProblem, USERNAME_RE, USERNAME_RULE } from '@/lib/password-policy';

/** Published password of the synthetic demo accounts (demonstration access only). */
export const DEMO_PASSWORD = 'CareBite#2026';

// The domain is plain JavaScript; its objects are used untyped from TypeScript.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Service = any;
type Repo = any;
export type Runtime = { repo: Repo; service: Service; auth: Auth; resetDemo: () => void };

const store = globalThis as unknown as { __carebite?: Promise<Runtime> };

export function getRuntime(): Promise<Runtime> {
  store.__carebite ??= init().catch((err) => { store.__carebite = undefined; throw err; });
  return store.__carebite;
}

async function init(): Promise<Runtime> {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set to a random value of at least 32 characters (see .env.example).');
  }
  // Vercel functions can only write to /tmp (per instance, wiped on cold start and redeploy).
  const file = process.env.CAREBITE_DB ?? (process.env.VERCEL ? '/tmp/carebite.db' : join(process.cwd(), 'var', 'carebite.db'));
  const db = openDatabase(file);
  const repo = createSqliteRepo(db);
  if (!repo.getCatalogData().meals.length) seedCatalog(repo, new Date().toISOString());
  const service = createService({ repo });
  const options = authOptions(db, {
    claimLinkCode: service.claimLinkCode,
    recordAccountLink: service.recordAccountLink,
    getUserById: repo.getUserById,
    countActiveAdmins: repo.countActiveAdmins,
  });
  // Create or update better-auth's tables before the auth instance starts.
  await (await getMigrations(options)).runMigrations();
  const auth: Auth = betterAuth(options);

  const resetDemo = () => {
    repo.clearHospitalData();
    seedCatalog(repo, new Date().toISOString());
    service.reloadCatalog();
    linkDemoAccounts(repo, seedHospitalDemo({ repo, service, today: service.today() }));
  };
  const created = await seedDemoAccounts(auth, repo);
  if (created || !repo.listPatients().length) resetDemo();
  await seedAdminFromEnv(auth, repo);
  return { repo, service, auth, resetDemo };
}

type AccountSeed = { username: string; email: string; name: string };

/** Create a username + password account directly (hashed by better-auth), bypassing sign-up. */
async function createAccount(auth: Auth, a: AccountSeed, fields: Record<string, unknown>, password: string) {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email: a.email.toLowerCase(), name: a.name, emailVerified: false, username: a.username.toLowerCase(), displayUsername: a.username, ...fields,
  }, { method: "admin" } as never);
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: await ctx.password.hash(password) });
}

/** Create the synthetic demo accounts the first time the database is used. */
async function seedDemoAccounts(auth: Auth, repo: Repo): Promise<boolean> {
  let created = false;
  const make = async (a: AccountSeed, fields: Record<string, unknown>) => {
    if (repo.getUserByUsername(a.username)) return;
    await createAccount(auth, a, fields, DEMO_PASSWORD);
    created = true;
  };
  for (const a of DEMO_ACCOUNTS) await make(a, { role: a.role, status: 'active', isDemo: true });
  await make(DEMO_PENDING_STAFF, { role: null, status: 'pending', isDemo: false, requestedRole: DEMO_PENDING_STAFF.requestedRole, requestNote: DEMO_PENDING_STAFF.requestNote });
  return created;
}

/**
 * A private admin account from the environment (ADMIN_USERNAME, ADMIN_EMAIL,
 * ADMIN_PASSWORD, optional ADMIN_NAME), so a deployment has an admin whose
 * password is not the published demo password. It is created when missing and
 * never changed afterwards: a password changed in Settings is kept.
 */
async function seedAdminFromEnv(auth: Auth, repo: Repo) {
  const username = process.env.ADMIN_USERNAME?.trim() ?? '';
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!username && !email && !password) return;
  if (!username || !email || !password) throw new Error('Set all three of ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD to create the admin account.');
  if (!USERNAME_RE.test(username)) throw new Error(`ADMIN_USERNAME: ${USERNAME_RULE}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be an email address.');
  const problem = passwordProblem(password, { username, email });
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);
  if (repo.getUserByUsername(username)) return;
  if (repo.getUserByEmail(email)) throw new Error('ADMIN_EMAIL is already used by another account.');
  await createAccount(auth, { username, email, name: process.env.ADMIN_NAME?.trim() || 'Administrator' }, { role: 'admin', status: 'active', isDemo: false }, password);
}

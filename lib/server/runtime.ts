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
  const file = process.env.CAREBITE_DB ?? join(process.cwd(), 'var', 'carebite.db');
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
  return { repo, service, auth, resetDemo };
}

/** Create the synthetic demo accounts (hashed by better-auth) the first time the database is used. */
async function seedDemoAccounts(auth: Auth, repo: Repo): Promise<boolean> {
  const ctx = await auth.$context;
  let created = false;
  const make = async (a: { username: string; email: string; name: string }, fields: Record<string, unknown>) => {
    if (repo.getUserByUsername(a.username)) return;
    const user = await ctx.internalAdapter.createUser({
      email: a.email.toLowerCase(), name: a.name, emailVerified: false, username: a.username.toLowerCase(), displayUsername: a.username, ...fields,
    }, { method: "admin" } as never);
    await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: await ctx.password.hash(DEMO_PASSWORD) });
    created = true;
  };
  for (const a of DEMO_ACCOUNTS) await make(a, { role: a.role, status: 'active', isDemo: true });
  await make(DEMO_PENDING_STAFF, { role: null, status: 'pending', isDemo: false, requestedRole: DEMO_PENDING_STAFF.requestedRole, requestNote: DEMO_PENDING_STAFF.requestNote });
  return created;
}

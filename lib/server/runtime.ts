// The server runtime: one Postgres database (Neon in production) shared by the
// CareBite domain and better-auth. The connection pool, the auth instance and the
// menu catalogue cache are created once per server instance (and kept across dev
// reloads); every request works on its own snapshot of the data (domain/pg-store.js).
import 'server-only';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { getMigrations } from 'better-auth/db/migration';
import { betterAuth } from 'better-auth';
import { createPgStore, ensureSchema, withInitLock } from '@/domain/pg-store.js';
import { createService } from '@/domain/service.js';
import { seedCatalog, seedHospitalDemo, linkDemoAccounts, DEMO_ACCOUNTS, DEMO_PENDING_STAFF } from '@/domain/demo-data.js';
import { authOptions, type Auth } from './auth';
import { passwordProblem, USERNAME_RE, USERNAME_RULE } from '@/lib/password-policy';

/** Published password of the synthetic demo accounts (demonstration access only). */
export const DEMO_PASSWORD = 'CareBite#2026';

// The domain is plain JavaScript; its objects are used untyped from TypeScript.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Service = any;
type Repo = any;
export type Ctx = { service: Service; repo: Repo };
export type Runtime = {
  auth: Auth;
  /** A read-only snapshot of all data for one request (pages and GET API calls). */
  readContext: () => Promise<Ctx>;
  /** A read-only snapshot of the menu catalogue only (public pages). */
  catalogContext: () => Promise<Ctx>;
  /** Run a change in one transaction under the write lock; nothing is saved if it throws. */
  write: <T>(fn: (ctx: Ctx) => T | Promise<T>) => Promise<T>;
  resetDemo: () => Promise<void>;
  // Small direct lookups that do not need a snapshot.
  getUser: (id: string) => Promise<{ isDemo: boolean; role: string | null; status: string } | null>;
  countActiveAdmins: () => Promise<number>;
  patientDemoId: (id: string) => Promise<string | null>;
};

const global = globalThis as unknown as { __carebite?: Promise<Runtime> };

export function getRuntime(): Promise<Runtime> {
  global.__carebite ??= init().catch((err) => { global.__carebite = undefined; throw err; });
  return global.__carebite;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL must be set to a Postgres connection string, for example from Neon (see .env.example).');
  const pool = new Pool({ connectionString, max: 8, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 });
  pool.on('error', (err) => console.error('Postgres pool error:', err.message));
  // On Vercel, close idle connections before a function instance is suspended.
  if (process.env.VERCEL) attachDatabasePool(pool);
  return pool;
}

async function init(): Promise<Runtime> {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set to a random value of at least 32 characters (see .env.example).');
  }
  const pool = createPool();
  const store = createPgStore(pool);
  const one = async (sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows[0] ?? null;

  // Read-only requests that see the same catalogue version share one built catalogue.
  const catalogStates = new WeakMap<object, unknown>();
  const readService = (repo: Repo) => {
    let state = catalogStates.get(repo.catalogKey);
    if (!state) { state = { catalog: null, menu: null, compat: new Map() }; catalogStates.set(repo.catalogKey, state); }
    return createService({ repo, catalogState: state as never });
  };
  const readContext = async () => { const repo = await store.read(); return { repo, service: readService(repo) }; };
  const catalogContext = async () => { const repo = await store.read({ hospital: false }); return { repo, service: readService(repo) }; };
  const write = <T,>(fn: (ctx: Ctx) => T | Promise<T>) => store.write((repo: Repo) => fn({ repo, service: createService({ repo }) })) as Promise<T>;

  const getUser = async (id: string) => {
    const r = await one('SELECT role, status, "isDemo" FROM "user" WHERE id = $1', [id]);
    return r ? { role: r.role ?? null, status: r.status ?? 'pending', isDemo: Boolean(r.isDemo) } : null;
  };
  const countActiveAdmins = async () => Number((await one(`SELECT COUNT(*)::int AS n FROM "user" WHERE role = 'admin' AND status = 'active'`))?.n ?? 0);
  const patientDemoId = async (id: string) => (/^\d{1,9}$/.test(id) ? (await one('SELECT demo_id FROM Patients WHERE id = $1', [Number(id)]))?.demo_id ?? null : null);

  const options = authOptions(pool, {
    claimLinkCode: (code) => write(({ service }) => service.claimLinkCode(code)),
    recordAccountLink: (user, patientId) => write(({ service }) => service.recordAccountLink(user, patientId)),
    getUserById: getUser,
    countActiveAdmins,
  });

  const resetDemo = () => write(({ repo, service }) => {
    repo.clearHospitalData();
    seedCatalog(repo, new Date().toISOString());
    service.reloadCatalog();
    linkDemoAccounts(repo, seedHospitalDemo({ repo, service, today: service.today() }));
  });

  // Only one server instance at a time creates tables and seeds data.
  const auth = await withInitLock(pool, async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureSchema(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    // Create or update better-auth's tables before the auth instance starts.
    await (await getMigrations(options)).runMigrations();
    const auth: Auth = betterAuth(options);
    const created = await seedDemoAccounts(auth, one);
    const counts = await one('SELECT (SELECT COUNT(*)::int FROM Meals) AS meals, (SELECT COUNT(*)::int FROM Patients) AS patients');
    if (!counts.meals) await write(({ repo }) => seedCatalog(repo, new Date().toISOString()));
    if (created || !counts.patients) await resetDemo();
    await seedAdminFromEnv(auth, one);
    return auth;
  });

  return { auth, readContext, catalogContext, write, resetDemo, getUser, countActiveAdmins, patientDemoId };
}

type AccountSeed = { username: string; email: string; name: string };
type One = (sql: string, params?: unknown[]) => Promise<any>;

/** Create a username + password account directly (hashed by better-auth), bypassing sign-up. */
async function createAccount(auth: Auth, a: AccountSeed, fields: Record<string, unknown>, password: string) {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email: a.email.toLowerCase(), name: a.name, emailVerified: false, username: a.username.toLowerCase(), displayUsername: a.username, ...fields,
  }, { method: "admin" } as never);
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: await ctx.password.hash(password) });
}

const usernameTaken = async (one: One, username: string) => Boolean(await one('SELECT 1 FROM "user" WHERE username = $1', [username.toLowerCase()]));

/** Create the synthetic demo accounts the first time the database is used. */
async function seedDemoAccounts(auth: Auth, one: One): Promise<boolean> {
  let created = false;
  const make = async (a: AccountSeed, fields: Record<string, unknown>) => {
    if (await usernameTaken(one, a.username)) return;
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
async function seedAdminFromEnv(auth: Auth, one: One) {
  const username = process.env.ADMIN_USERNAME?.trim() ?? '';
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!username && !email && !password) return;
  if (!username || !email || !password) throw new Error('Set all three of ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD to create the admin account.');
  if (!USERNAME_RE.test(username)) throw new Error(`ADMIN_USERNAME: ${USERNAME_RULE}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL must be an email address.');
  const problem = passwordProblem(password, { username, email });
  if (problem) throw new Error(`ADMIN_PASSWORD: ${problem}`);
  if (await usernameTaken(one, username)) return;
  if (await one('SELECT 1 FROM "user" WHERE email = $1', [email])) throw new Error('ADMIN_EMAIL is already used by another account.');
  await createAccount(auth, { username, email, name: process.env.ADMIN_NAME?.trim() || 'Administrator' }, { role: 'admin', status: 'active', isDemo: false }, password);
}

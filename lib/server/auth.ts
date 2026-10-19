// Authentication with better-auth: email or username + password, sessions
// stored server-side in Postgres (an opaque, HttpOnly session cookie; no JWT and
// no cookie cache, so every request reads the current role and status).
//
// OWASP-aligned choices:
// - Passwords: at least 8 characters (no composition rules), common passwords
//   refused, scrypt hashing (better-auth default), max 128 characters.
// - Brute force: per-IP rate limits on sign-in, sign-up and password changes,
//   counted in the database so they hold across server instances.
// - No account enumeration on sign-in: better-auth answers "invalid username/email or
//   password" whichever part was wrong, and hashes even when the user does not exist.
// - Privilege: role, status and patient link are server-only fields (input: false);
//   sign-up never grants a staff role. Patients need a one-time link code.
// - Sessions: 8-hour lifetime with sliding refresh, rotated on sign-in, revoked
//   on password change, deactivation and account deletion.
// - CSRF: better-auth checks Origin against trustedOrigins; cookies are SameSite=Lax.
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { username } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import type { Pool } from 'pg';
import { passwordProblem, USERNAME_RE } from '@/lib/password-policy';

type Domain = {
  claimLinkCode: (code: string) => Promise<{ id: string | number; demoId: string }>;
  recordAccountLink: (user: { id: string; username: string; name: string }, patientId: string) => Promise<void>;
  getUserById: (id: string) => Promise<{ isDemo?: boolean; role?: string | null; status?: string } | null>;
  countActiveAdmins: () => Promise<number>;
};

const SECURE = process.env.NODE_ENV === 'production' && process.env.BETTER_AUTH_URL?.startsWith('https://');

function fieldError(field: string, message: string): never {
  throw new APIError('UNPROCESSABLE_ENTITY', { message, code: 'VALIDATION_FAILED', errors: { [field]: message } } as never);
}

export function authOptions(db: Pool, domain: Domain) {
  const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  return {
    appName: 'CareBite',
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: db,
    trustedOrigins: [baseURL, ...(process.env.TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [])],
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      requireEmailVerification: false, // no email service in this prototype
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: 60 * 60 * 8, // 8 hours
      updateAge: 60 * 30, // slide the expiry at most every 30 minutes of activity
      freshAge: 60 * 15, // sensitive actions need a sign-in within 15 minutes or the password
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, input: false },
        status: { type: 'string', required: false, defaultValue: 'pending', input: false },
        patientId: { type: 'string', required: false, input: false },
        requestedRole: { type: 'string', required: false, input: true },
        requestNote: { type: 'string', required: false, input: true },
        decidedBy: { type: 'string', required: false, input: false },
        decidedAt: { type: 'string', required: false, input: false },
        decisionNote: { type: 'string', required: false, input: false },
        isDemo: { type: 'boolean', required: false, defaultValue: false, input: false },
      },
      changeEmail: { enabled: true, updateEmailWithoutVerification: true },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          const u = await domain.getUserById(user.id);
          if (u?.isDemo) throw new APIError('FORBIDDEN', { message: 'Shared demo accounts cannot be deleted.' });
          if (u?.role === 'admin' && (await domain.countActiveAdmins()) <= 1) throw new APIError('FORBIDDEN', { message: 'The last admin account cannot be deleted.' });
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 120,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-in/username': { window: 60, max: 5 },
        '/sign-up/email': { window: 300, max: 5 },
        '/change-password': { window: 300, max: 5 },
        '/delete-user': { window: 300, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: 'carebite',
      useSecureCookies: SECURE,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: SECURE, path: '/' },
      ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 20,
        usernameValidator: (name) => USERNAME_RE.test(name),
      }),
      nextCookies(), // must stay last: lets server actions set the session cookie
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        if (ctx.path === '/sign-up/email') {
          const pw = passwordProblem(String(body.password ?? ''), { username: String(body.username ?? ''), email: String(body.email ?? '') });
          if (pw) fieldError('password', pw);
          if (!String(body.name ?? '').trim()) fieldError('name', 'Enter the name to show in CareBite.');
          if (body.accountType === 'staff') {
            if (!['staff', 'admin'].includes(String(body.requestedRole ?? ''))) fieldError('requestedRole', 'Choose the access you are asking for.');
            if (!String(body.requestNote ?? '').trim()) fieldError('requestNote', 'Tell the admin your department or job title.');
          } else if (body.accountType === 'patient') {
            if (!String(body.linkCode ?? '').trim()) fieldError('linkCode', 'Enter the link code the nutrition team gave you.');
          } else {
            fieldError('accountType', 'Choose a patient or staff account.');
          }
        }
        if (ctx.path === '/change-password') {
          const session = await getSessionFromCtx(ctx);
          const pw = passwordProblem(String(body.newPassword ?? ''), { username: (session?.user as { username?: string } | undefined)?.username, email: session?.user.email });
          if (pw) fieldError('newPassword', pw);
          if ((session?.user as { isDemo?: boolean } | undefined)?.isDemo) throw new APIError('FORBIDDEN', { message: 'The password of a shared demo account cannot be changed.' });
        }
        // Shared demo accounts are used by many visitors at once: none of them may
        // end the others' sessions (the session list is filtered in the after hook).
        if (ctx.path === '/revoke-other-sessions' || ctx.path === '/revoke-sessions' || ctx.path === '/revoke-session') {
          const s = await getSessionFromCtx(ctx);
          if ((s?.user as { isDemo?: boolean } | undefined)?.isDemo) throw new APIError('FORBIDDEN', { message: 'Shared demo accounts cannot sign out other visitors.' });
        }
        if (ctx.path === '/update-user' || ctx.path === '/change-email') {
          const u = ctx.context.session?.user as { isDemo?: boolean } | undefined;
          if (u?.isDemo && ('username' in body || 'newEmail' in body || 'email' in body)) throw new APIError('FORBIDDEN', { message: 'The username and email of a shared demo account cannot be changed.' });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const out = ctx.context.returned as unknown;
        if (!out || typeof out !== 'object' || out instanceof Response || out instanceof Error) return;
        const strip = (o: unknown): unknown => {
          if (!o || typeof o !== 'object') return o;
          const { token: _t, ...rest } = o as Record<string, unknown>;
          return rest;
        };
        if (ctx.path === '/list-sessions' && Array.isArray(out)) {
          const s = await getSessionFromCtx(ctx);
          const mine = (out as Record<string, unknown>[]).filter((x) => !(s?.user as { isDemo?: boolean } | undefined)?.isDemo || x.id === s?.session.id);
          return ctx.json(mine.map(strip));
        }
        if (Array.isArray(out)) {
          if (out.some((x) => x && typeof x === 'object' && 'token' in x)) return ctx.json(out.map(strip));
          return;
        }
        const o = out as Record<string, unknown>;
        if ('token' in o || (o.session && typeof o.session === 'object' && 'token' in (o.session as object))) {
          return ctx.json({ ...(strip(o) as object), ...(o.session ? { session: strip(o.session) } : {}) });
        }
      }),
    },
    // (hooks.after below) Session tokens stay in the HttpOnly cookie only: they are
    // removed from JSON responses so page scripts never see them.
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            if (!ctx || ctx.path !== '/sign-up/email') return; // seeding and internal creation set fields explicitly
            const body = (ctx.body ?? {}) as Record<string, unknown>;
            if (body.accountType === 'patient') {
              let patient;
              try { patient = await domain.claimLinkCode(String(body.linkCode ?? '')); }
              catch (e) { fieldError('linkCode', (e as Error).message); }
              return { data: { ...user, role: 'patient', status: 'active', patientId: String(patient.id), requestedRole: null, requestNote: null, isDemo: false } };
            }
            return { data: { ...user, role: null, status: 'pending', patientId: null, isDemo: false } };
          },
          after: async (user, ctx) => {
            if (ctx?.path === '/sign-up/email' && (user as { patientId?: string }).patientId) {
              await domain.recordAccountLink({ id: user.id, username: String((user as { username?: string }).username ?? ''), name: user.name }, String((user as { patientId?: string }).patientId));
            }
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const u = await domain.getUserById(session.userId);
            if (u?.status === 'deactivated') throw new APIError('FORBIDDEN', { message: 'This account has been deactivated by an admin.', code: 'ACCOUNT_DEACTIVATED' });
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
}

export const createAuth = (db: Pool, domain: Domain) => betterAuth(authOptions(db, domain));
export type Auth = ReturnType<typeof createAuth>;

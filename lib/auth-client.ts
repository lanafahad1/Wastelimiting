'use client';
// better-auth browser client (same-origin; the session lives in an HttpOnly cookie
// that page scripts cannot read).
import { createAuthClient } from 'better-auth/react';
import { usernameClient, inferAdditionalFields } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    inferAdditionalFields({
      user: {
        role: { type: 'string', required: false, input: false },
        status: { type: 'string', required: false, input: false },
        patientId: { type: 'string', required: false, input: false },
        requestedRole: { type: 'string', required: false },
        requestNote: { type: 'string', required: false },
        isDemo: { type: 'boolean', required: false, input: false },
      },
    }),
  ],
});

/** Friendly text for a better-auth error (never reveals which credential was wrong). */
export function authErrorMessage(error: { message?: string; status?: number; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  if (error.status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD' || error.code === 'INVALID_USERNAME_OR_PASSWORD' || error.status === 401) return 'The username, email or password is incorrect.';
  if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USERNAME_IS_ALREADY_TAKEN' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return 'An account with this username or email already exists. Log in instead, or choose a different username and email.';
  return error.message || 'Something went wrong. Please try again.';
}

// Password policy (OWASP ASVS / NIST 800-63B): length is what matters, so the
// only rule is a minimum of 8 characters (up to 128, passphrases welcome). No
// composition rules. Passwords that are very common, or that are just the
// username or email, are refused because they are the first ones guessed.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_RULE = `Use at least ${PASSWORD_MIN} characters. A short phrase you will remember works well.`;

export const USERNAME_RULE = '3–20 characters: letters, numbers, dots or underscores, starting with a letter.';
export const USERNAME_RE = /^[A-Za-z][A-Za-z0-9._]{2,19}$/;

// The most common passwords from public breach corpora (lower-cased).
const COMMON = new Set(`password password1 password12 password123 password1234 passw0rd p@ssw0rd p@ssword
12345678 123456789 1234567890 12345678910 11111111 00000000 88888888 87654321 11223344 12341234 12121212
qwertyui qwerty123 qwertyuiop 1q2w3e4r 1q2w3e4r5t 1qaz2wsx zaq12wsx asdfghjk asdfasdf zxcvbnm1 iloveyou
iloveyou1 sunshine princess football baseball welcome1 welcome123 letmein1 letmein123 monkey123 dragon123
superman batman123 trustno1 abc12345 abcd1234 abcdefgh aa123456 a1234567 qwer1234 admin123 admin1234
administrator changeme changeme1 default1 master123 secret123 starwars whatever freedom1 computer internet
michael1 jennifer shadow12 hello123 charlie1 mustang1 jordan23 liverpool chelsea1 arsenal1 manchester
carebite carebite1 carebite123 hospital hospital1 nutrition patient1 doctor123 nurse123 ramadan1 saudi123
riyadh123 jeddah123 makkah123 madinah1 ksa12345 qwerty12 q1w2e3r4 passport 123qweasd 1234qwer 123123123`.split(/\s+/));

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: string, context: { username?: string | null; email?: string | null } = {}): string | null {
  const pw = String(password ?? '');
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX) return `Passwords can be at most ${PASSWORD_MAX} characters.`;
  const lower = pw.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(pw)) return 'This password is too common and easy to guess. Choose another one.';
  const user = String(context.username ?? '').toLowerCase();
  const local = String(context.email ?? '').toLowerCase().split('@')[0];
  if ((user && lower === user) || (local && local.length >= 3 && lower === local)) return 'Do not use your username or email as your password.';
  return null;
}

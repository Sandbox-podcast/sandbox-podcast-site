import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;
const localAttempts = new Map<string, { count: number; expiresAt: number }>();
const resultSchema = z.object({
  allowed: z.boolean(),
  retry_after: z.coerce.number().int().min(1),
});
export type AttemptResult =
  { status: 'allowed' } | { status: 'limited'; retryAfter: number } | { status: 'unavailable' };

/** Only the hosting platform may supply a trusted client address. */
export function adminAttemptKey(request: Request, secret: string): string {
  const forwarded = process.env['VERCEL'] === '1' ? request.headers.get('x-forwarded-for') : null;
  const address = forwarded?.trim();
  // Reject lists and malformed values; never trust arbitrary forwarded headers off Vercel.
  const version = address ? isIP(address) : 0;
  const identity =
    version === 6 && address
      ? new URL(`http://[${address}]/`).hostname
      : version === 4 && address
        ? address
        : 'shared';
  return createHmac('sha256', secret).update(`admin-attempt:${identity}`).digest('hex');
}

interface AttemptDatabase {
  execute: (statement: SQL) => Promise<{ rows: unknown[] }>;
}

/** PostgreSQL owns the clock and the atomic increment, shared by every instance. */
export async function consumeDatabaseAttempt(
  db: AttemptDatabase,
  key: string,
): Promise<AttemptResult> {
  const result = await db.execute(sql`
    WITH expired AS (
      DELETE FROM admin_login_attempts WHERE key <> ${key} AND expires_at < now() - interval '1 day'
    )
    INSERT INTO admin_login_attempts (key, attempts, expires_at)
    VALUES (${key}, 1, now() + interval '15 minutes')
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN admin_login_attempts.expires_at <= now() THEN 1
        ELSE LEAST(admin_login_attempts.attempts + 1, ${MAX_ATTEMPTS + 1}) END,
      expires_at = CASE WHEN admin_login_attempts.expires_at <= now()
        THEN now() + interval '15 minutes' ELSE admin_login_attempts.expires_at END
    RETURNING attempts <= ${MAX_ATTEMPTS} AS allowed,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::integer AS retry_after
  `);
  const row = resultSchema.parse(result.rows[0]);
  return row.allowed ? { status: 'allowed' } : { status: 'limited', retryAfter: row.retry_after };
}

export async function checkAdminAttempt(request: Request): Promise<AttemptResult> {
  const secret = process.env['SITE_ADMIN_SECRET'] ?? '';
  if (secret.length < 32) return { status: 'unavailable' };
  const key = adminAttemptKey(request, secret);
  if (hasDatabaseConfiguration()) {
    try {
      return await consumeDatabaseAttempt(getDb(), key);
    } catch {
      // A missing migration or outage must not open an unprotected login path.
      return { status: 'unavailable' };
    }
  }
  if (process.env.NODE_ENV === 'production') return { status: 'unavailable' };
  const now = Date.now();
  for (const [id, value] of localAttempts) if (value.expiresAt <= now) localAttempts.delete(id);
  const current = localAttempts.get(key) ?? { count: 0, expiresAt: now + WINDOW_SECONDS * 1000 };
  if (current.count >= MAX_ATTEMPTS)
    return {
      status: 'limited',
      retryAfter: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    };
  current.count += 1;
  localAttempts.set(key, current);
  return { status: 'allowed' };
}

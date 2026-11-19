import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// Hashed so the rate limit tables never store customers' IP addresses.
// An IPv6 connection is its /64 network: one device can switch freely between addresses inside it.
export function clientKey(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return crypto.createHash('sha256').update(ip.includes(':') ? ipv6Network(ip) : ip).digest('hex');
}

function ipv6Network(ip: string): string {
  const [head, tail] = ip.split('::');
  const before = head ? head.split(':') : [];
  const after = tail ? tail.split(':') : [];
  const groups = tail === undefined ? before : [...before, ...Array(8 - before.length - after.length).fill('0'), ...after];
  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(':')}::/64`;
}

// Counts an attempt and returns whether it is within the limit for the current time window
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (
      ${key},
      to_timestamp(floor(extract(epoch FROM NOW()) / ${windowSeconds}::int) * ${windowSeconds}::int),
      1
    )
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `;

  // Old windows are never read again, so clear them out now and then
  if (Math.random() < 0.01) {
    await sql`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`;
  }

  return (rows[0].count as number) <= limit;
}

// Site password lockout: MAX_WRONG_SITE_PASSWORDS wrong passwords within SITE_LOCK_HOURS lock that
// connection out for SITE_LOCK_HOURS, even with the right password afterwards.
export const MAX_WRONG_SITE_PASSWORDS = 4;
const SITE_LOCK_HOURS = 24;

// The connection's wrong passwords so far, and until when it is locked out (null when it is not)
export async function siteLoginState(key: string): Promise<{ hasFailures: boolean; lockedUntil: Date | null }> {
  const rows = await sql`
    SELECT CASE WHEN locked_until > NOW() THEN locked_until END AS locked_until
    FROM site_login_failures WHERE key = ${key}
  `;
  return {
    hasFailures: rows.length > 0,
    lockedUntil: rows[0]?.locked_until ? new Date(rows[0].locked_until as string) : null,
  };
}

// Counts a wrong password and returns until when the connection is now locked out, if it is
export async function recordWrongSitePassword(key: string): Promise<Date | null> {
  const rows = await sql`
    INSERT INTO site_login_failures (key, failures, first_failure_at) VALUES (${key}, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET
      failures = CASE WHEN site_login_failures.first_failure_at > NOW() - make_interval(hours => ${SITE_LOCK_HOURS})
        THEN site_login_failures.failures + 1 ELSE 1 END,
      first_failure_at = CASE WHEN site_login_failures.first_failure_at > NOW() - make_interval(hours => ${SITE_LOCK_HOURS})
        THEN site_login_failures.first_failure_at ELSE NOW() END,
      locked_until = CASE WHEN site_login_failures.first_failure_at > NOW() - make_interval(hours => ${SITE_LOCK_HOURS})
          AND site_login_failures.failures + 1 >= ${MAX_WRONG_SITE_PASSWORDS}
        THEN NOW() + make_interval(hours => ${SITE_LOCK_HOURS}) END
    RETURNING locked_until
  `;
  return rows[0].locked_until ? new Date(rows[0].locked_until as string) : null;
}

// A right password clears the count
export async function clearWrongSitePasswords(key: string): Promise<void> {
  await sql`DELETE FROM site_login_failures WHERE key = ${key}`;
}

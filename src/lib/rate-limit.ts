import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';

// Hashed so the rate limit table never stores customers' IP addresses
export function clientKey(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return crypto.createHash('sha256').update(ip).digest('hex');
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

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sql } from '@/lib/db';

const COOKIE_NAME = 'gross-admin-session';
const SESSION_SECONDS = 60 * 60 * 8; // 8 hours

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function isCorrectPin(pin: unknown): boolean {
  const expected = process.env.ADMIN_PIN;
  if (!expected || typeof pin !== 'string') return false;
  return crypto.timingSafeEqual(Buffer.from(sha256(pin)), Buffer.from(sha256(expected)));
}

export async function startAdminSession(): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`;
  await sql`
    INSERT INTO admin_sessions (token_hash, expires_at)
    VALUES (${sha256(token)}, NOW() + make_interval(secs => ${SESSION_SECONDS}))
  `;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await sql`DELETE FROM admin_sessions WHERE token_hash = ${sha256(token)}`;
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const rows = await sql`
    SELECT 1 FROM admin_sessions
    WHERE token_hash = ${sha256(token)} AND expires_at > NOW()
  `;
  return rows.length > 0;
}

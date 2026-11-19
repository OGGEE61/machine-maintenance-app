import { NextResponse, type NextRequest } from 'next/server';
import { clearWrongSitePasswords, clientKey, recordWrongSitePassword, siteLoginState } from '@/lib/rate-limit';

// Whole site behind one password (browser login box) while the app is a demo.
// Any username; the password must equal SITE_PASSWORD. If SITE_PASSWORD is not set, nobody gets in.
// 4 wrong passwords lock that connection out for 24 hours. The admin PIN still applies on top.
export async function proxy(request: NextRequest) {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return askForPassword();

  const key = `site:${clientKey(request)}`;
  // If the database is unreachable, the password is still required; only the lockout pauses.
  const state = await siteLoginState(key).catch(logGuardError);
  if (state?.lockedUntil) return lockedOut(state.lockedUntil);

  if (isSitePassword(header)) {
    if (state?.hasFailures) await clearWrongSitePasswords(key).catch(logGuardError);
    return NextResponse.next();
  }
  const nowLockedUntil = await recordWrongSitePassword(key).catch(logGuardError);
  return nowLockedUntil ? lockedOut(nowLockedUntil) : askForPassword();
}

function isSitePassword(header: string): boolean {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  try {
    const decoded = atob(header.slice(6));
    return decoded.slice(decoded.indexOf(':') + 1) === password;
  } catch {
    return false;
  }
}

function askForPassword() {
  return new NextResponse('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Nexopel", charset="UTF-8"' },
  });
}

function lockedOut(until: Date) {
  return new NextResponse(`Too many wrong passwords from your connection. Try again after ${until.toUTCString()}.`, {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil((until.getTime() - Date.now()) / 1000)) },
  });
}

function logGuardError(error: unknown): null {
  console.error('[site password] lockout check failed', error);
  return null;
}

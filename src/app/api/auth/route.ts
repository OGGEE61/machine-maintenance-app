import { NextRequest, NextResponse } from 'next/server';
import { endAdminSession, isCorrectPin, startAdminSession } from '@/lib/auth';
import { readJson } from '@/lib/http';
import { clientKey, consumeRateLimit } from '@/lib/rate-limit';

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS_PER_IP = 10;
// A low overall ceiling also slows down guessing spread across many addresses
const MAX_ATTEMPTS_OVERALL = 100;

export async function POST(req: NextRequest) {
  const [ipAllowed, overallAllowed] = await Promise.all([
    consumeRateLimit(`login:${clientKey(req)}`, MAX_ATTEMPTS_PER_IP, WINDOW_SECONDS),
    consumeRateLimit('login:overall', MAX_ATTEMPTS_OVERALL, WINDOW_SECONDS),
  ]);
  if (!ipAllowed || !overallAllowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait 15 minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(WINDOW_SECONDS) } }
    );
  }

  const body = await readJson(req);
  if (!isCorrectPin((body as { pin?: unknown } | undefined)?.pin)) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  await startAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await endAdminSession();
  return NextResponse.json({ ok: true });
}

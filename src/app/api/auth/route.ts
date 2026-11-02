import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { readJson } from '@/lib/http';

export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const pin = (body as { pin?: unknown } | undefined)?.pin;
  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }
  
  const token = crypto.createHash('sha256').update(process.env.ADMIN_PIN!).digest('hex');
  const res = NextResponse.json({ ok: true });
  
  res.cookies.set('gross-admin-session', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('gross-admin-session');
  return res;
}

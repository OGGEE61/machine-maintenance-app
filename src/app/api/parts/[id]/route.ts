import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { readJson } from '@/lib/http';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await readJson(req);
  const visible = (body as { visible?: unknown } | undefined)?.visible;
  if (typeof visible !== 'boolean') {
    return NextResponse.json({ error: 'visible must be true or false' }, { status: 400 });
  }
  const rows = await sql`UPDATE parts SET visible = ${visible} WHERE id = ${id} RETURNING id`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Part not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

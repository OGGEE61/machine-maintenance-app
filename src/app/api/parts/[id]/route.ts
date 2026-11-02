import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { readJson } from '@/lib/http';
import { parsePartUpdate } from '@/lib/validation';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const parsed = parsePartUpdate(await readJson(req));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { visible, price, availability, leadTimeDays } = parsed.value;

  const rows = await sql`
    UPDATE parts SET
      visible = COALESCE(${visible ?? null}::boolean, visible),
      price = COALESCE(${price ?? null}::numeric, price),
      availability = COALESCE(${availability ?? null}::text, availability),
      lead_time_days = CASE WHEN ${leadTimeDays !== undefined}::boolean THEN ${leadTimeDays ?? null}::int ELSE lead_time_days END
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Part not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

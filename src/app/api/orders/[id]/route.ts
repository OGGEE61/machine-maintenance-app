import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { readJson } from '@/lib/http';
import { isOrderStatus, ORDER_TRANSITIONS } from '@/lib/orders';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await readJson(req);
  const status = (body as { status?: unknown } | undefined)?.status;
  if (!isOrderStatus(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const rows = await sql`SELECT status FROM orders WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  const current = rows[0].status;
  if (!isOrderStatus(current) || !ORDER_TRANSITIONS[current].includes(status)) {
    return NextResponse.json({ error: `An order cannot go from ${current} to ${status}.` }, { status: 409 });
  }

  await sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { readJson } from '@/lib/http';
import { parseClientDetails } from '@/lib/validation';

// PATCH /api/machines-db/[serial] — update client details for a registered machine
// Admin-only, used when a machine is sold or moved to a new location
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { serial } = await params;

  const details = parseClientDetails(await readJson(req));
  if (!details.ok) {
    return NextResponse.json({ error: details.error }, { status: 400 });
  }
  const { clientName, clientEmail, clientAddress, clientPhone, installedAt, notes } = details.value;

  const result = await sql`
    UPDATE machines
    SET
      client_name    = ${clientName},
      client_email   = ${clientEmail},
      client_address = ${clientAddress},
      client_phone   = ${clientPhone},
      installed_at   = ${installedAt},
      notes          = ${notes}
    WHERE serial_number = ${serial}
    RETURNING serial_number
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/machines-db/[serial] — remove a machine record (admin-only)
// Meant for correcting registration mistakes, so machines with orders are kept
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { serial } = await params;

  const orders = await sql`SELECT 1 FROM orders WHERE serial_number = ${serial} LIMIT 1`;
  if (orders.length > 0) {
    return NextResponse.json({ error: 'This machine has orders, so it cannot be deleted.' }, { status: 409 });
  }

  const result = await sql`DELETE FROM machines WHERE serial_number = ${serial} RETURNING serial_number`;
  if (result.length === 0) {
    return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

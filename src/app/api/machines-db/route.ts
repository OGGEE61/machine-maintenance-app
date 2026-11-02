import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { getMachineById } from '@/data/machines';
import { readJson } from '@/lib/http';
import { isValidSerial, parseClientDetails } from '@/lib/validation';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const machines = await sql`
    SELECT m.*, mt.name as machine_type_name,
      (SELECT COUNT(*)::int FROM orders o WHERE o.serial_number = m.serial_number) AS order_count
    FROM machines m
    JOIN machine_types mt ON mt.id = m.machine_type_id
    ORDER BY m.created_at DESC
  `;
  return NextResponse.json({ machines });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await readJson(req);
  const { serialNumber, machineTypeId } = (body ?? {}) as { serialNumber?: unknown; machineTypeId?: unknown };

  const serial = typeof serialNumber === 'string' ? serialNumber.trim() : serialNumber;
  if (!isValidSerial(serial)) {
    return NextResponse.json(
      { error: 'Serial numbers may only contain letters, numbers, dots, dashes and underscores.' },
      { status: 400 }
    );
  }
  // /machine/<id> resolves catalogue pages first, so a clashing serial would never reach its own page
  if (getMachineById(serial)) {
    return NextResponse.json({ error: 'That serial number clashes with a machine model ID.' }, { status: 400 });
  }
  const machineType = typeof machineTypeId === 'string' ? getMachineById(machineTypeId) : undefined;
  if (!machineType) {
    return NextResponse.json({ error: 'Please choose a valid machine type.' }, { status: 400 });
  }
  const details = parseClientDetails(body);
  if (!details.ok) {
    return NextResponse.json({ error: details.error }, { status: 400 });
  }
  const { clientName, clientEmail, clientAddress, clientPhone, installedAt, notes } = details.value;

  // Never overwrite on conflict: registering a duplicate must not wipe the existing client's details
  const rows = await sql`
    INSERT INTO machines (serial_number, machine_type_id, client_name, client_email, client_address, client_phone, installed_at, notes)
    VALUES (${serial}, ${machineType.id}, ${clientName}, ${clientEmail}, ${clientAddress}, ${clientPhone}, ${installedAt}, ${notes})
    ON CONFLICT (serial_number) DO NOTHING
    RETURNING *
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: `Serial number ${serial} is already registered.` }, { status: 409 });
  }

  return NextResponse.json(
    { machine: { ...rows[0], machine_type_name: machineType.name, order_count: 0 } },
    { status: 201 }
  );
}

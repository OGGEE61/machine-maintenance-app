import { after, NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';
import { getMachineById } from '@/data/machines';
import { getCustomerMachine } from '@/lib/catalog';
import { OrderEmailDetails, sendOrderEmails } from '@/lib/email';
import { readJson } from '@/lib/http';
import { clientKey, consumeRateLimit } from '@/lib/rate-limit';
import { parseOrderRequest } from '@/lib/validation';

const MAX_ORDERS_PER_HOUR = 20;

// Saving a real customer's order matters more than the limit, so a limiter failure lets it through
async function isOverOrderLimit(req: NextRequest): Promise<boolean> {
  try {
    return !(await consumeRateLimit(`orders:${clientKey(req)}`, MAX_ORDERS_PER_HOUR, 60 * 60));
  } catch (err) {
    console.error('Order rate limit check failed', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const parsed = parseOrderRequest(await readJson(req));
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { machineTypeId, serialNumber, customerName, customerEmail, customerPhone, notes, items } = parsed.value;

  const catalogueMachine = getMachineById(machineTypeId);
  if (!catalogueMachine) {
    return NextResponse.json({ error: 'Unknown machine.' }, { status: 400 });
  }

  if (await isOverOrderLimit(req)) {
    return NextResponse.json(
      { error: 'Too many orders from this network. Please try again later or contact GROSS directly.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  try {
    if (serialNumber) {
      const rows = await sql`SELECT machine_type_id FROM machines WHERE serial_number = ${serialNumber}`;
      if (rows[0]?.machine_type_id !== machineTypeId) {
        return NextResponse.json({ error: 'Unknown machine serial number.' }, { status: 400 });
      }
    }

    // Part details and prices always come from the catalogue, never from the browser
    const machine = await getCustomerMachine(catalogueMachine);
    const partsById = new Map(machine.modules.flatMap((mod) => mod.parts).map((part) => [part.id, part]));

    const orderId = crypto.randomUUID();
    const queries = [
      sql`
        INSERT INTO orders (id, serial_number, machine_type_id, customer_name, customer_email, customer_phone, notes)
        VALUES (${orderId}, ${serialNumber}, ${machineTypeId}, ${customerName}, ${customerEmail}, ${customerPhone}, ${notes})
      `,
    ];

    const lines: OrderEmailDetails['lines'] = [];
    for (const item of items) {
      const part = partsById.get(item.partId);
      if (!part) {
        const name = catalogueMachine.modules.flatMap((mod) => mod.parts).find((p) => p.id === item.partId)?.name;
        return NextResponse.json(
          { error: `${name ?? 'One of the parts in your cart'} is no longer available. Please remove it and try again.` },
          { status: 400 }
        );
      }
      lines.push({
        partNumber: part.partNumber,
        partName: part.name,
        quantity: item.quantity,
        unitPrice: part.price,
        currency: part.currency,
      });
      queries.push(
        sql`
          INSERT INTO order_items (order_id, part_id, part_number, part_name, quantity, unit_price, currency)
          VALUES (${orderId}, ${part.id}, ${part.partNumber}, ${part.name}, ${item.quantity}, ${part.price}, ${part.currency})
        `
      );
    }

    // Execute all queries in a single transaction (batch)
    await sql.transaction(queries);

    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    after(() => sendOrderEmails({
      orderId,
      machineName: machine.name,
      serialNumber,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      lines,
      total,
      currency: lines[0].currency,
    }));

    return NextResponse.json({ orderId, lines, total }, { status: 201 });
  } catch (err) {
    console.error('Failed to save order', err);
    return NextResponse.json({ error: 'We could not save your order. Please try again.' }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orders = await sql`
    SELECT o.*, m.client_name AS registered_client,
      COALESCE(
        json_agg(json_build_object(
          'id', oi.id, 'partId', oi.part_id, 'partNumber', oi.part_number,
          'partName', oi.part_name, 'quantity', oi.quantity,
          'unitPrice', oi.unit_price, 'currency', oi.currency
        )) FILTER (WHERE oi.id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN machines m ON m.serial_number = o.serial_number
    GROUP BY o.id, m.client_name
    ORDER BY o.created_at DESC
  `;

  return NextResponse.json({ orders });
}

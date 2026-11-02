import { orderReference, OrderStatus } from '@/lib/orders';

export interface CsvOrder {
  id: string;
  created_at: string;
  status: OrderStatus;
  serial_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  items: Array<{ partNumber: string | null; partName: string; quantity: number; unitPrice: number | null; currency: string }>;
}

// Parts with no price yet aren't counted
export function orderTotal(order: Pick<CsvOrder, 'items'>): number {
  return order.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);
}

// Customers can type anything into an order, so stop spreadsheets running it as a formula
export function spreadsheetSafe(value: string | null): string {
  const text = value ?? '';
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function ordersToCsv(orders: CsvOrder[], machineName: (order: CsvOrder) => string): string {
  const rows = [
    ['Reference', 'Date', 'Status', 'Machine', 'Serial Number', 'Customer', 'Email', 'Phone', 'Items', 'Total (excl. VAT)', 'Currency', 'Notes'],
    ...orders.map((o) => [
      orderReference(o.id),
      o.created_at,
      o.status,
      machineName(o),
      o.serial_number ?? '',
      spreadsheetSafe(o.customer_name),
      spreadsheetSafe(o.customer_email),
      // Phone numbers are validated to digits and punctuation, and often start with "+"
      o.customer_phone ?? '',
      o.items.map((i) => {
        const name = i.partNumber ? `${i.partNumber} ${i.partName}` : i.partName;
        return `${name} x${i.quantity} @ ${i.unitPrice === null ? 'on request' : i.unitPrice.toFixed(2)}`;
      }).join('; '),
      o.items.some((i) => i.unitPrice !== null) ? orderTotal(o).toFixed(2) : '',
      o.items[0]?.currency ?? '',
      spreadsheetSafe(o.notes),
    ]),
  ];
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

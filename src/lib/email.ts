import { orderReference } from '@/lib/orders';

export interface OrderEmailDetails {
  orderId: string;
  machineName: string;
  serialNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  lines: Array<{ partId: string; partNumber: string | null; partName: string; quantity: number; unitPrice: number | null; currency: string }>;
  total: number;
  currency: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

async function send(apiKey: string, from: string, message: EmailMessage): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      reply_to: message.replyTo,
    }),
  });
  if (!res.ok) {
    throw new Error(`Email provider responded with ${res.status}`);
  }
}

function partLines(order: OrderEmailDetails): string {
  return order.lines
    .map((line) => {
      const name = line.partNumber ? `${line.partName} (${line.partNumber})` : line.partName;
      const price = line.unitPrice === null ? 'price on request' : `${(line.unitPrice * line.quantity).toFixed(2)} ${line.currency}`;
      return `- ${name} x${line.quantity}: ${price}`;
    })
    .join('\n');
}

// Runs after the order is saved, so a mail problem is logged but can never lose an order.
// Sending stays off until RESEND_API_KEY and ORDER_FROM_EMAIL are configured.
export async function sendOrderEmails(order: OrderEmailDetails): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;
  if (!apiKey || !from) return;

  const reference = orderReference(order.orderId);
  const machine = order.serialNumber ? `${order.machineName} (S/N ${order.serialNumber})` : order.machineName;
  const unpriced = order.lines.some((line) => line.unitPrice === null);
  const total = unpriced
    ? order.total > 0 ? `${order.total.toFixed(2)} ${order.currency} excl. VAT, plus parts on request` : 'to be quoted'
    : `${order.total.toFixed(2)} ${order.currency} excl. VAT`;
  const messages: EmailMessage[] = [];

  const staffEmail = process.env.ORDER_NOTIFY_EMAIL;
  if (staffEmail) {
    const adminUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    messages.push({
      to: staffEmail,
      replyTo: order.customerEmail,
      subject: `New order ${reference}: ${machine}`,
      text: [
        `New order ${reference}`,
        '',
        `Customer: ${order.customerName}`,
        `Email: ${order.customerEmail}`,
        `Phone: ${order.customerPhone ?? '-'}`,
        `Machine: ${machine}`,
        '',
        partLines(order),
        `Total: ${total}`,
        ...(order.notes ? ['', `Customer notes: ${order.notes}`] : []),
        ...(adminUrl ? ['', `${adminUrl}/admin?tab=orders&q=${reference}`] : []),
      ].join('\n'),
    });
  }

  // The form accepts any address, so this deliberately leaves out everything the sender
  // typed. That stops it being used to send someone else a message of the sender's choosing.
  messages.push({
    to: order.customerEmail,
    subject: `We received your order ${reference}`,
    text: [
      'Thank you. We received your spare parts order request and will contact you with a quote.',
      '',
      `Order reference: ${reference}`,
      `Machine: ${machine}`,
      '',
      partLines(order),
      `Total: ${total}`,
    ].join('\n'),
  });

  const results = await Promise.allSettled(messages.map((message) => send(apiKey, from, message)));
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`Order email failed for ${reference}`, result.reason);
    }
  }
}

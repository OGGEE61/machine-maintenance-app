export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export const MAX_ORDER_LINES = 50;
export const MAX_QUANTITY = 999;

// Serial numbers end up in printed QR URLs, so keep them URL-safe
const SERIAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()./\s-]{5,40}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Returns the trimmed text or null when empty; undefined means the value is invalid
function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length > maxLength) return undefined;
  return text === '' ? null : text;
}

export function isValidSerial(value: unknown): value is string {
  return typeof value === 'string' && SERIAL_PATTERN.test(value);
}

export interface OrderRequest {
  machineTypeId: string;
  serialNumber: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  items: Array<{ partId: string; quantity: number }>;
}

export function parseOrderRequest(body: unknown): Parsed<OrderRequest> {
  if (!isRecord(body)) return { ok: false, error: 'Invalid request.' };

  // Honeypot: the field is hidden from people, so only bots fill it in
  if (body.website) return { ok: false, error: 'Invalid request.' };

  const machineTypeId = optionalText(body.machineTypeId, 100);
  if (!machineTypeId) return { ok: false, error: 'The order must be linked to a machine.' };

  const serialNumber = optionalText(body.serialNumber, 64);
  if (serialNumber === undefined) return { ok: false, error: 'Invalid serial number.' };

  const customerName = optionalText(body.customerName, 200);
  if (!customerName) return { ok: false, error: 'Please enter your name or company.' };

  const customerEmail = optionalText(body.customerEmail, 254);
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const customerPhone = optionalText(body.customerPhone, 40);
  if (customerPhone === undefined || (customerPhone && !PHONE_PATTERN.test(customerPhone))) {
    return { ok: false, error: 'Please enter a valid phone number.' };
  }

  const notes = optionalText(body.notes, 2000);
  if (notes === undefined) return { ok: false, error: 'Notes are too long (2000 characters max).' };

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { ok: false, error: 'No items in order.' };
  }
  if (body.items.length > MAX_ORDER_LINES) {
    return { ok: false, error: `Orders are limited to ${MAX_ORDER_LINES} different parts.` };
  }

  const items: OrderRequest['items'] = [];
  for (const item of body.items) {
    if (!isRecord(item) || typeof item.partId !== 'string') {
      return { ok: false, error: 'Invalid order item.' };
    }
    const { partId, quantity } = item;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) {
      return { ok: false, error: `Quantities must be between 1 and ${MAX_QUANTITY}.` };
    }
    items.push({ partId, quantity: quantity as number });
  }

  return {
    ok: true,
    value: { machineTypeId, serialNumber, customerName, customerEmail, customerPhone, notes, items },
  };
}

export interface ClientDetails {
  clientName: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  installedAt: string | null;
  notes: string | null;
}

export function parseClientDetails(body: unknown): Parsed<ClientDetails> {
  if (!isRecord(body)) return { ok: false, error: 'Invalid request.' };

  const clientName = optionalText(body.clientName, 200);
  const clientEmail = optionalText(body.clientEmail, 254);
  const clientAddress = optionalText(body.clientAddress, 500);
  const clientPhone = optionalText(body.clientPhone, 40);
  const installedAt = optionalText(body.installedAt, 10);
  const notes = optionalText(body.notes, 2000);

  if (clientName === undefined || clientAddress === undefined || notes === undefined) {
    return { ok: false, error: 'One of the fields is too long.' };
  }
  if (clientEmail === undefined || (clientEmail && !EMAIL_PATTERN.test(clientEmail))) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (clientPhone === undefined || (clientPhone && !PHONE_PATTERN.test(clientPhone))) {
    return { ok: false, error: 'Please enter a valid phone number.' };
  }
  if (installedAt === undefined || (installedAt && !DATE_PATTERN.test(installedAt))) {
    return { ok: false, error: 'Please enter a valid installation date.' };
  }

  return { ok: true, value: { clientName, clientEmail, clientAddress, clientPhone, installedAt, notes } };
}

export const PART_AVAILABILITY = ['in-stock', 'low-stock', 'on-order'] as const;
export type PartAvailability = (typeof PART_AVAILABILITY)[number];

export interface PartUpdate {
  visible?: boolean;
  price?: number;
  availability?: PartAvailability;
  leadTimeDays?: number | null;
}

// Every field is optional: a request changes only the fields it includes
export function parsePartUpdate(body: unknown): Parsed<PartUpdate> {
  if (!isRecord(body)) return { ok: false, error: 'Invalid request.' };
  const { visible, price, availability, leadTimeDays } = body;
  const update: PartUpdate = {};

  if (visible !== undefined) {
    if (typeof visible !== 'boolean') return { ok: false, error: 'visible must be true or false.' };
    update.visible = visible;
  }
  if (price !== undefined) {
    const validPrice = typeof price === 'number' && price >= 0 && price <= 1_000_000
      && Math.abs(price * 100 - Math.round(price * 100)) < 1e-6;
    if (!validPrice) return { ok: false, error: 'Price must be a positive amount with at most 2 decimals.' };
    update.price = price;
  }
  if (availability !== undefined) {
    if (!PART_AVAILABILITY.includes(availability as PartAvailability)) {
      return { ok: false, error: 'Invalid availability.' };
    }
    update.availability = availability as PartAvailability;
  }
  if (leadTimeDays !== undefined) {
    if (leadTimeDays !== null && (!Number.isInteger(leadTimeDays) || (leadTimeDays as number) < 0 || (leadTimeDays as number) > 730)) {
      return { ok: false, error: 'Lead time must be a whole number of days, up to 730.' };
    }
    update.leadTimeDays = leadTimeDays as number | null;
  }
  if (Object.keys(update).length === 0) return { ok: false, error: 'Nothing to update.' };

  return { ok: true, value: update };
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderEmailDetails, sendOrderEmails } from './email';

const order: OrderEmailDetails = {
  orderId: '1a2b3c4d-0000',
  machineName: 'GP 80',
  serialNumber: 'GP80-1',
  customerName: 'Buy cheap pills at spam.example',
  customerEmail: 'buyer@acme.example',
  customerPhone: null,
  notes: 'Visit spam.example now',
  lines: [{ partNumber: 'P1', partName: 'Bearing', quantity: 2, unitPrice: 10, currency: 'EUR' }],
  total: 20,
  currency: 'EUR',
};

const sent = () => vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendOrderEmails', () => {
  it('stays off until configured', async () => {
    await sendOrderEmails(order);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends staff the full order, with replies going to the customer', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key');
    vi.stubEnv('ORDER_FROM_EMAIL', 'orders@gross.example');
    vi.stubEnv('ORDER_NOTIFY_EMAIL', 'sales@gross.example');
    await sendOrderEmails(order);
    const [staff] = sent();
    expect(staff.to).toEqual(['sales@gross.example']);
    expect(staff.reply_to).toBe('buyer@acme.example');
    expect(staff.text).toContain('Visit spam.example now');
    expect(staff.subject).toContain('GRS-1A2B3C4D');
  });

  it('leaves everything the sender typed out of the customer email', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key');
    vi.stubEnv('ORDER_FROM_EMAIL', 'orders@gross.example');
    await sendOrderEmails(order);
    const [customer] = sent();
    expect(sent()).toHaveLength(1);
    expect(customer.to).toEqual(['buyer@acme.example']);
    expect(customer.text).not.toContain('spam.example');
    expect(customer.subject).not.toContain('spam.example');
  });

  it('logs a provider failure instead of throwing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key');
    vi.stubEnv('ORDER_FROM_EMAIL', 'orders@gross.example');
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(sendOrderEmails(order)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

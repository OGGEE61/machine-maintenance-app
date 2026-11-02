import { describe, expect, it } from 'vitest';
import { isOrderStatus, ORDER_STATUSES, ORDER_TRANSITIONS, orderReference } from './orders';
import { CsvOrder, orderTotal, ordersToCsv, spreadsheetSafe } from './orders-csv';

describe('order statuses', () => {
  it('recognises only known statuses', () => {
    expect(isOrderStatus('new')).toBe(true);
    expect(isOrderStatus('deleted')).toBe(false);
  });

  it('never moves a shipped or cancelled order straight back to the start of processing it', () => {
    expect(ORDER_TRANSITIONS.shipped).not.toContain('new');
    expect(ORDER_TRANSITIONS.cancelled).not.toContain('shipped');
  });

  it('only transitions to known statuses', () => {
    for (const next of Object.values(ORDER_TRANSITIONS).flat()) expect(ORDER_STATUSES).toContain(next);
  });

  it('builds the customer-facing reference', () => {
    expect(orderReference('1a2b3c4d-0000-4000-8000-000000000000')).toBe('GRS-1A2B3C4D');
  });
});

describe('CSV export', () => {
  const order: CsvOrder = {
    id: '1a2b3c4d-0000',
    created_at: '2026-01-02T03:04:05.000Z',
    status: 'new',
    serial_number: 'GP80-1',
    customer_name: '=HYPERLINK("http://evil")',
    customer_email: 'a@b.co',
    customer_phone: '+48 500 600 700',
    notes: '@SUM(1)',
    items: [
      { partNumber: 'P1', partName: 'Bearing', quantity: 2, unitPrice: 10.5, currency: 'EUR' },
      { partNumber: 'P2', partName: 'Seal', quantity: 1, unitPrice: 4, currency: 'EUR' },
    ],
  };

  it.each(['=1+1', '+1', '-1', '@x', '\tx'])('neutralises the formula %j', (value) => {
    expect(spreadsheetSafe(value)).toBe(`'${value}`);
  });

  it('leaves ordinary text and blanks alone', () => {
    expect(spreadsheetSafe('ACME')).toBe('ACME');
    expect(spreadsheetSafe(null)).toBe('');
  });

  it('adds up the total', () => {
    expect(orderTotal(order)).toBe(25);
  });

  it('escapes quotes, guards free text and keeps phone numbers readable', () => {
    const csv = ordersToCsv([order], () => 'GP 80');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"'@SUM(1)"`);
    expect(csv).toContain('"+48 500 600 700"');
    expect(csv).toContain('"GRS-1A2B3C4D"');
    expect(csv).toContain('"25.00"');
  });
});

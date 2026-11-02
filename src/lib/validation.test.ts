import { describe, expect, it } from 'vitest';
import { isValidSerial, parseClientDetails, parseOrderRequest, parsePartUpdate } from './validation';

const order = {
  machineTypeId: 'gp-80',
  customerName: 'ACME',
  customerEmail: 'buyer@acme.example',
  items: [{ partId: 'p1', quantity: 2 }],
};

describe('parseOrderRequest', () => {
  it('accepts a minimal order and trims text', () => {
    const parsed = parseOrderRequest({ ...order, customerName: '  ACME  ', customerPhone: '', notes: ' ' });
    expect(parsed).toEqual({
      ok: true,
      value: {
        machineTypeId: 'gp-80',
        serialNumber: null,
        customerName: 'ACME',
        customerEmail: 'buyer@acme.example',
        customerPhone: null,
        notes: null,
        items: [{ partId: 'p1', quantity: 2 }],
      },
    });
  });

  it('keeps only the part and quantity from each line, never a price', () => {
    const parsed = parseOrderRequest({ ...order, items: [{ partId: 'p1', quantity: 1, unitPrice: 0.01 }] });
    expect(parsed.ok && parsed.value.items).toEqual([{ partId: 'p1', quantity: 1 }]);
  });

  it.each([
    ['not an object', undefined],
    ['an array', []],
    ['no machine', { ...order, machineTypeId: ' ' }],
    ['no name', { ...order, customerName: '' }],
    ['an invalid email', { ...order, customerEmail: 'nope' }],
    ['a formula as phone', { ...order, customerPhone: '=cmd()' }],
    ['notes that are too long', { ...order, notes: 'x'.repeat(2001) }],
    ['no items', { ...order, items: [] }],
    ['too many lines', { ...order, items: Array(51).fill({ partId: 'p', quantity: 1 }) }],
    ['a zero quantity', { ...order, items: [{ partId: 'p', quantity: 0 }] }],
    ['a negative quantity', { ...order, items: [{ partId: 'p', quantity: -1 }] }],
    ['a fractional quantity', { ...order, items: [{ partId: 'p', quantity: 1.5 }] }],
    ['an excessive quantity', { ...order, items: [{ partId: 'p', quantity: 1000 }] }],
    ['a filled-in honeypot', { ...order, website: 'spam.example' }],
  ])('rejects %s', (_name, body) => {
    expect(parseOrderRequest(body).ok).toBe(false);
  });
});

describe('isValidSerial', () => {
  it.each(['GP80-2024-001', 'a', 'A.b_c-1'])('accepts %s', (serial) => expect(isValidSerial(serial)).toBe(true));
  it.each(['', 'has space', 'a/b', '-leading', 'x'.repeat(65), 5])('rejects %s', (serial) => expect(isValidSerial(serial)).toBe(false));
});

describe('parseClientDetails', () => {
  it('turns blanks into null', () => {
    const parsed = parseClientDetails({ clientName: ' ', clientEmail: '', installedAt: '' });
    expect(parsed).toEqual({
      ok: true,
      value: { clientName: null, clientEmail: null, clientAddress: null, clientPhone: null, installedAt: null, notes: null },
    });
  });

  it.each([
    ['email', { clientEmail: 'nope' }],
    ['phone', { clientPhone: 'call me' }],
    ['date', { installedAt: '12/25/24' }],
  ])('rejects an invalid %s', (_name, body) => expect(parseClientDetails(body).ok).toBe(false));
});

describe('parsePartUpdate', () => {
  it('includes only the fields sent', () => {
    expect(parsePartUpdate({ visible: false })).toEqual({ ok: true, value: { visible: false } });
    expect(parsePartUpdate({ price: 19.99, leadTimeDays: null })).toEqual({ ok: true, value: { price: 19.99, leadTimeDays: null } });
  });

  it.each([
    ['nothing', {}],
    ['a non-boolean visible', { visible: 'no' }],
    ['a negative price', { price: -1 }],
    ['too many decimals', { price: 1.234 }],
    ['a text price', { price: '10' }],
    ['unknown availability', { availability: 'maybe' }],
    ['a fractional lead time', { leadTimeDays: 1.5 }],
  ])('rejects %s', (_name, body) => expect(parsePartUpdate(body).ok).toBe(false));
});

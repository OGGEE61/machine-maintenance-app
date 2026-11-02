import { expect, test } from '@playwright/test';
import { addFirstPart, db, logIn, newContext, openCart, orderBody, postOrder, register, sentEmails, submitOrder } from './helpers';

const orderCount = async () => Number((await db('SELECT count(*) FROM orders'))[0][0]);
const reference = (page: import('@playwright/test').Page) => page.getByText(/^GRS-[0-9A-F]{8}$/);

test.describe.serial('customer ordering', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await logIn(page);
    await register(page, 'ORD-100');
    await register(page, 'ORD-200', 'gaz-600');
  });

  test('rejects invalid orders and saves nothing', async ({ request }) => {
    const before = await orderCount();
    expect((await request.post('/api/orders', { headers: { 'content-type': 'application/json' }, data: '{nope' })).status()).toBe(400);
    for (const body of [
      orderBody({ customerName: ' ' }),
      orderBody({ customerEmail: 'nope' }),
      orderBody({ machineTypeId: 'unknown' }),
      orderBody({ items: [] }),
      orderBody({ items: [{ partId: 'gp-80-hydrauli-kit', quantity: -3 }] }),
      orderBody({ items: [{ partId: 'unknown', quantity: 1 }] }),
      orderBody({ items: [{ partId: 'gaz-600-hopper-kit', quantity: 1 }] }),
      orderBody({ serialNumber: 'UNREGISTERED' }),
      orderBody({ serialNumber: 'ORD-200' }),
      orderBody({ website: 'spam.example' }),
    ]) {
      expect((await postOrder(request, body)).status(), JSON.stringify(body)).toBe(400);
    }
    expect(await orderCount()).toBe(before);
  });

  test('takes names and prices from the catalogue, not the browser', async ({ request }) => {
    const res = await postOrder(request, orderBody({
      items: [{ partId: 'gp-80-hydrauli-kit', quantity: 2, unitPrice: 0.01, partName: 'HACKED', currency: 'XXX' }],
    }));
    expect(res.status()).toBe(201);
    const { orderId, total } = await res.json();
    const [[price, name, currency]] = await db('SELECT unit_price, part_name, currency FROM order_items WHERE order_id = $1', [orderId]);
    expect(Number(price)).toBe(76);
    expect(name).toBe('Hydraulic tank Replacement Kit');
    expect(currency).toBe('EUR');
    expect(total).toBe(152);
  });

  test('limits how many orders one address can place', async ({ request }) => {
    const address = '198.51.100.7';
    for (let i = 0; i < 20; i++) expect((await postOrder(request, orderBody(), address)).status()).toBe(201);
    const blocked = await postOrder(request, orderBody(), address);
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()['retry-after']).toBe('3600');
    expect((await postOrder(request, orderBody())).status()).toBe(201);
  });

  test('saves the order with contact details and confirms the real reference', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/machine/ORD-100');
    await addFirstPart(page);
    await openCart(page);
    await expect(page.getByText('S/N: ORD-100').first()).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Your Details' }).click();
    await page.fill('#order-name', 'Kowalski Sp. z o.o.');
    await page.fill('#order-email', 'jan@example.com');
    await page.fill('#order-phone', '+48 500 600 700');
    await page.fill('#order-notes', 'Urgent please');
    await page.getByRole('button', { name: 'Submit Order Request' }).click();
    await expect(page.getByText('Order Request Submitted')).toBeVisible();

    const [[id, serial, type, email, phone, notes]] = await db(
      'SELECT id, serial_number, machine_type_id, customer_email, customer_phone, notes FROM orders ORDER BY created_at DESC LIMIT 1'
    );
    expect([serial, type, email, phone, notes]).toEqual(['ORD-100', 'gp-80', 'jan@example.com', '+48 500 600 700', 'Urgent please']);
    await expect(reference(page)).toHaveText(`GRS-${id.slice(0, 8).toUpperCase()}`);
  });

  test('emails staff and the customer after an order', async ({ request }) => {
    const res = await postOrder(request, orderBody({ customerName: 'Mail Test', customerEmail: 'mail@example.com', notes: 'spam.example' }));
    const { orderId } = await res.json();
    const ref = `GRS-${orderId.slice(0, 8).toUpperCase()}`;
    await expect.poll(async () => (await sentEmails()).filter((m) => m.subject.includes(ref)).length).toBe(2);
    const mails = (await sentEmails()).filter((m) => m.subject.includes(ref));
    const staff = mails.find((m) => m.to[0] === 'sales@gross.example')!;
    const customer = mails.find((m) => m.to[0] === 'mail@example.com')!;
    expect(staff.reply_to).toBe('mail@example.com');
    expect(staff.text).toContain('spam.example');
    expect(customer.text).not.toContain('spam.example');
  });

  test('a second order in the same session is saved too', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/machine/ORD-100');
    await addFirstPart(page);
    await submitOrder(page, 'First', 'first@example.com');
    await expect(page.getByText('Order Request Submitted')).toBeVisible();
    const first = await reference(page).innerText();
    await page.getByRole('button', { name: 'Done' }).click();

    const before = await orderCount();
    await addFirstPart(page, 1);
    await openCart(page);
    await page.getByRole('button', { name: 'Continue to Your Details' }).click();
    await expect(page.locator('#order-email')).toHaveValue('first@example.com');
    await page.getByRole('button', { name: 'Submit Order Request' }).click();
    await expect(page.getByText('Order Request Submitted')).toBeVisible();
    await expect(reference(page)).not.toHaveText(first);
    expect(await orderCount()).toBe(before + 1);
  });

  test('a failed submission shows an error and keeps the cart and form', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/machine/ORD-100');
    await addFirstPart(page);
    const before = await orderCount();

    await page.route('**/api/orders', (route) => route.fulfill({ status: 500, contentType: 'text/html', body: 'boom' }));
    await submitOrder(page, 'Retry Test', 'retry@example.com');
    await expect(page.locator('form [role=alert]')).toContainText('could not send');
    await page.unroute('**/api/orders');

    await page.route('**/api/orders', (route) => route.abort());
    await page.getByRole('button', { name: 'Submit Order Request' }).click();
    await expect(page.locator('form [role=alert]')).toContainText('could not reach the server');
    await page.unroute('**/api/orders');

    await expect(page.getByText('Order Request Submitted')).toHaveCount(0);
    await expect(page.locator('#order-email')).toHaveValue('retry@example.com');
    expect(await orderCount()).toBe(before);

    await page.getByRole('button', { name: 'Submit Order Request' }).click();
    await expect(page.getByText('Order Request Submitted')).toBeVisible();
    expect(await orderCount()).toBe(before + 1);
  });

  test('the cart survives a refresh and is emptied by an order', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/machine/ORD-100');
    await addFirstPart(page);
    await page.reload();
    await openCart(page);
    await expect(page.getByText('1 item', { exact: true })).toBeVisible();
    await expect(page.getByText('S/N: ORD-100').first()).toBeVisible();
    await page.keyboard.press('Escape');

    await submitOrder(page, 'Reload Test', 'reload@example.com');
    await expect(page.getByText('Order Request Submitted')).toBeVisible();
    await page.reload();
    await openCart(page);
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('corrupt saved cart data does not break the page', async ({ browser }) => {
    const context = await newContext(browser);
    await context.addInitScript(() => window.localStorage.setItem('gross-cart-v1', '{not json'));
    const page = await context.newPage();
    await page.goto('/machine/ORD-100');
    await openCart(page);
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('one order covers one machine', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/machine/ORD-100');
    await addFirstPart(page);
    await page.goto('/machine/ORD-200');
    await addFirstPart(page);
    await expect(page.getByText('Each order covers one machine')).toBeVisible();
    await page.getByRole('button', { name: 'Keep my cart' }).click();
    await openCart(page);
    await expect(page.getByText('S/N: ORD-100').first()).toBeVisible();
  });
});

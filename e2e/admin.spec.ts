import fs from 'node:fs';
import { expect, Page, test } from '@playwright/test';
import { addFirstPart, db, logIn, newAddress, newContext, orderBody, postOrder, register, submitOrder } from './helpers';

test.describe.serial('admin workflows', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await (await newContext(browser, { acceptDownloads: true })).newPage();
    page.on('dialog', (dialog) => dialog.accept());
    await logIn(page);
  });

  test('an unregistered serial 404s, then works straight after registering', async ({ request }) => {
    const before = await request.get('/machine/ADM-100');
    expect(before.status()).toBe(404);
    expect(before.headers()['cache-control']).toContain('no-store');
    expect(await before.text()).toContain('Machine not found');

    await page.goto('/admin?tab=machines');
    await page.fill('#register-serial', 'ADM-100');
    await page.selectOption('#register-type', 'gp-80');
    await page.getByRole('button', { name: 'Register & Get QR Sticker' }).click();
    await expect(page.getByText('Machine registered. Next, print')).toBeVisible();
    await expect(page.locator('img[alt="QR for ADM-100"]')).toBeVisible();
    await expect(page.getByText('http://localhost:3457/machine/ADM-100')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const after = await request.get('/machine/ADM-100');
    expect(after.status()).toBe(200);
    expect(await after.text()).toContain('GP 80 — GROSS Parts');
  });

  test('refuses bad and duplicate serials without touching existing data', async () => {
    await page.getByRole('button', { name: 'Add client' }).first().click();
    await page.fill('#edit-name', 'SecretClient GmbH');
    await page.fill('#edit-email', 'owner@secretclient.example');
    await page.fill('#edit-phone', '+48 111 222 333');
    await page.fill('#edit-address', '1 Hidden Street');
    await page.fill('#edit-notes', 'INTERNAL-NOTE-XYZ');
    await page.fill('#edit-date', '2026-03-04');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    for (const [serial, message] of [
      ['bad serial/x', 'letters, numbers'],
      ['ADM-100', 'already registered'],
      ['gp-80', 'clashes'],
    ]) {
      await page.fill('#register-serial', serial);
      await page.getByRole('button', { name: 'Register & Get QR Sticker' }).click();
      await expect(page.locator('form [role=alert]')).toContainText(message);
    }

    const [[client, notes]] = await db("SELECT client_name, notes FROM machines WHERE serial_number = 'ADM-100'");
    expect([client, notes]).toEqual(['SecretClient GmbH', 'INTERNAL-NOTE-XYZ']);
  });

  test('client details never reach the public page', async ({ request }) => {
    const html = await (await request.get('/machine/ADM-100')).text();
    expect(html).toContain('ADM-100');
    for (const secret of ['SecretClient', 'owner@secretclient', '111 222 333', 'Hidden Street', 'INTERNAL-NOTE-XYZ']) {
      expect(html).not.toContain(secret);
    }
  });

  test('works an order through the queue', async ({ browser }) => {
    await db(`INSERT INTO orders (id, machine_type_id, customer_name, customer_email) VALUES ('00000000-aaaa-4aaa-8aaa-000000000001', '', 'Unknown', '')`);

    const customer = await (await newContext(browser)).newPage();
    await customer.goto('/machine/ADM-100');
    await addFirstPart(customer);
    await submitOrder(customer, '=HYPERLINK("http://evil")', 'jan@example.com');
    await expect(customer.getByText('Order Request Submitted')).toBeVisible();
    const ref = await customer.getByText(/^GRS-[0-9A-F]{8}$/).innerText();

    await page.goto('/admin?tab=orders');
    const card = page.locator('article', { hasText: ref });
    await expect(card).toBeVisible();
    await expect(page.getByText('No contact details were captured').first()).toBeVisible();
    await expect(card.locator('a[href^="mailto:jan@example.com"]')).toBeVisible();
    await expect(card.getByText('Registered to SecretClient GmbH')).toBeVisible();

    await card.getByRole('button', { name: 'Start processing' }).click();
    await expect(card.getByRole('button', { name: 'Mark as shipped' })).toBeVisible();

    await page.route('**/api/orders/*', (route) => route.fulfill({ status: 500, body: 'x' }));
    await card.getByRole('button', { name: 'Mark as shipped' }).click();
    await expect(page.getByText('was not updated')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Mark as shipped' })).toBeVisible();
    await page.unroute('**/api/orders/*');

    await card.getByRole('button', { name: 'Mark as shipped' }).click();
    await expect(card).toHaveCount(0);

    await page.getByRole('button', { name: /^Shipped/ }).click();
    await expect(card.getByRole('button', { name: 'Undo shipping' })).toBeVisible();

    const id = (await db("SELECT id FROM orders WHERE customer_email = 'jan@example.com'"))[0][0];
    const blocked = await page.evaluate(async (orderId) => (await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'new' }),
    })).status, id);
    expect(blocked).toBe(409);

    await page.getByRole('button', { name: /^All/ }).click();
    await page.fill('input[aria-label="Search orders"]', ref);
    await expect(page.locator('article')).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export 1 to CSV' }).click(),
    ]);
    const csv = fs.readFileSync(await download.path(), 'utf8');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain('ADM-100');
    expect(csv).toContain('GP 80');

    await page.locator('article').getByRole('link', { name: 'S/N ADM-100' }).click();
    await page.waitForURL('**tab=machines**');
    await expect(page.locator('input[aria-label="Search machines"]')).toHaveValue('ADM-100');
    await page.getByRole('link', { name: /order/ }).click();
    await page.waitForURL('**tab=orders**');
    await expect(page.locator('article')).toHaveCount(1);
  });

  test('price and stock edits reach customers and new orders, not old ones', async ({ request }) => {
    await page.goto('/admin?tab=parts');
    await page.selectOption('select[aria-label="Machine type"]', 'gaz-600');
    const name = 'Hopper Replacement Kit';
    const row = page.locator('div.p-3', { hasText: name });
    const originalPrice = await row.getByRole('spinbutton', { name: `Price of ${name}` }).inputValue();

    const oldOrder = await (await postOrder(request, orderBody({ machineTypeId: 'gaz-600', items: [{ partId: 'gaz-600-hopper-kit', quantity: 1 }] }))).json();

    await row.getByRole('spinbutton', { name: `Price of ${name}` }).fill('123.45');
    await row.getByRole('combobox', { name: `Availability of ${name}` }).selectOption('on-order');
    await row.getByRole('spinbutton', { name: `Lead time of ${name} in days` }).fill('21');
    await row.getByRole('button', { name: 'Save' }).click();
    await expect(row.getByRole('button', { name: 'Save' })).toHaveCount(0);

    const customer = await (await request.get('/machine/gaz-600')).text();
    expect(customer).toContain('123.45');
    expect(customer).toContain('on-order');

    const newOrder = await (await postOrder(request, orderBody({ machineTypeId: 'gaz-600', items: [{ partId: 'gaz-600-hopper-kit', quantity: 2 }] }))).json();
    expect(newOrder.total).toBeCloseTo(246.9);
    const price = async (id: string) => Number((await db('SELECT unit_price FROM order_items WHERE order_id = $1', [id]))[0][0]);
    expect(await price(newOrder.orderId)).toBe(123.45);
    expect(await price(oldOrder.orderId)).toBe(Number(originalPrice));

    await page.reload();
    await page.selectOption('select[aria-label="Machine type"]', 'gaz-600');
    await expect(row.getByRole('spinbutton', { name: `Price of ${name}` })).toHaveValue('123.45');

    await row.getByRole('spinbutton', { name: `Price of ${name}` }).fill('1.999');
    await row.getByRole('button', { name: 'Save' }).click();
    await expect(row.getByRole('alert')).toContainText('2 decimals');
  });

  test('hiding a part removes it for customers and blocks ordering it', async ({ request }) => {
    const name = 'Hydraulic tank Replacement Kit';
    await page.goto('/admin?tab=parts');
    await page.selectOption('select[aria-label="Machine type"]', 'gp-80');
    await page.getByRole('button', { name: `Hide ${name}` }).click();
    await expect(page.getByRole('button', { name: `Show ${name}` })).toBeVisible();

    expect(await (await request.get('/machine/gp-80')).text()).not.toContain('GRS-GP80-HYDRAULI-001');
    const blocked = await postOrder(request, orderBody());
    expect(blocked.status()).toBe(400);
    expect((await blocked.json()).error).toContain(name);

    await page.getByRole('button', { name: `Show ${name}` }).click();
    await expect(page.getByRole('button', { name: `Hide ${name}` })).toBeVisible();
    expect(await (await request.get('/machine/gp-80')).text()).toContain('GRS-GP80-HYDRAULI-001');
  });

  test('machines with orders are kept; mistaken ones can be deleted', async ({ request }) => {
    await page.goto('/admin?tab=machines');
    await page.locator('div.p-4', { hasText: 'ADM-100' }).getByRole('button', { name: 'Edit client' }).click();
    await expect(page.getByText('This machine has orders')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await register(page, 'ADM-OOPS');
    await page.locator('div.p-4', { hasText: 'ADM-OOPS' }).getByRole('button', { name: 'Add client' }).click();
    await page.getByRole('button', { name: /Delete machine/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await request.get('/machine/ADM-OOPS')).status()).toBe(404);
  });

  test('sticker page lists machines in the shared navigation', async () => {
    await page.goto('/admin/qr-codes?sn=ADM-100');
    await expect(page.locator('img[alt="QR for ADM-100"]').first()).toBeVisible();
    await expect(page.locator('nav a[aria-current=page]')).toContainText('QR Stickers');
  });

  test('admin works on a phone without sideways scrolling', async () => {
    await page.setViewportSize({ width: 390, height: 800 });
    for (const tab of ['orders', 'machines', 'parts']) {
      await page.goto(`/admin?tab=${tab}`);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, tab).toBeLessThanOrEqual(0);
    }
    await page.setViewportSize({ width: 1360, height: 900 });
  });
});

test.describe('admin security', () => {
  test('every admin API needs a session', async ({ request }) => {
    for (const [method, url] of [
      ['GET', '/api/orders'],
      ['GET', '/api/machines-db'],
      ['POST', '/api/machines-db'],
      ['PATCH', '/api/orders/x'],
      ['PATCH', '/api/machines-db/x'],
      ['DELETE', '/api/machines-db/x'],
      ['PATCH', '/api/parts/x'],
      ['GET', '/api/parts-by-machine?machineTypeId=gp-80'],
    ]) {
      expect((await request.fetch(url, { method })).status(), `${method} ${url}`).toBe(401);
    }
  });

  test('the old PIN-hash cookie and invented tokens do not work', async ({ request }) => {
    const crypto = await import('node:crypto');
    const oldToken = crypto.createHash('sha256').update('e2e-pin').digest('hex');
    for (const token of [oldToken, 'invented']) {
      const res = await request.get('/api/orders', { headers: { cookie: `gross-admin-session=${token}` } });
      expect(res.status()).toBe(401);
    }
  });

  test('tokens are stored hashed, and logging out ends the session on the server', async ({ browser }) => {
    const context = await newContext(browser);
    const page = await context.newPage();
    await logIn(page);
    const cookie = (await context.cookies()).find((c) => c.name === 'gross-admin-session')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Strict');
    expect(await db('SELECT 1 FROM admin_sessions WHERE token_hash = $1', [cookie.value])).toHaveLength(0);

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/admin/login');

    const replay = await (await newContext(browser)).request.get('/api/orders', {
      headers: { cookie: `gross-admin-session=${cookie.value}` },
    });
    expect(replay.status()).toBe(401);
  });

  test('an expired session stops working', async ({ browser }) => {
    const context = await newContext(browser);
    const page = await context.newPage();
    await logIn(page);
    await db("UPDATE admin_sessions SET expires_at = NOW() - INTERVAL '1 minute'");
    await page.goto('/admin?tab=machines');
    await page.waitForURL('**/admin/login');
  });

  test('blocks PIN guessing, even with the right PIN, without affecting other addresses', async ({ request }) => {
    const address = newAddress();
    const attempt = (pin: string, from = address) =>
      request.post('/api/auth', { data: { pin }, headers: { 'x-forwarded-for': from } });

    for (let i = 0; i < 10; i++) expect((await attempt(`wrong-${i}`)).status()).toBe(401);
    const blocked = await attempt('e2e-pin');
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()['retry-after']).toBe('900');
    expect((await attempt('e2e-pin', newAddress())).status()).toBe(200);
  });

  test('the login page explains a wrong PIN and a lockout', async ({ browser }) => {
    const page = await (await newContext(browser)).newPage();
    await page.goto('/admin/login');
    await page.fill('input[type=password]', 'wrong');
    await page.click('button[type=submit]');
    await expect(page.getByText('Incorrect PIN')).toBeVisible();

    await page.route('**/api/auth', (route) => route.fulfill({ status: 429, body: '{}' }));
    await page.fill('input[type=password]', 'wrong');
    await page.click('button[type=submit]');
    await expect(page.getByText('Too many attempts')).toBeVisible();
  });
});

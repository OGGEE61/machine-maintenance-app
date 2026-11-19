import { expect, test } from '@playwright/test';

// Plain fetch: Playwright's own request contexts add the configured site password.
// Each test uses its own addresses, since 4 wrong passwords lock an address out.
const basic = (password: string) => `Basic ${btoa(`anyone:${password}`)}`;
const visit = (baseURL: string | undefined, path: string, from: string, password?: string) =>
  fetch(`${baseURL}${path}`, { headers: { 'x-forwarded-for': from, ...(password ? { authorization: basic(password) } : {}) } });

test('asks for the site password before showing anything', async ({ baseURL }) => {
  for (const path of ['/', '/scan', '/admin/login', '/api/parts']) {
    const res = await visit(baseURL, path, '2001:db8:a::1');
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Basic');
  }
  const wrong = await visit(baseURL, '/', '2001:db8:a::1', 'nope');
  expect(wrong.status).toBe(401);
  expect((await visit(baseURL, '/', '2001:db8:a::1', 'e2e-site')).status).toBe(200);
});

test('locks a network out for a day after 4 wrong passwords, even with the right one', async ({ baseURL }) => {
  const from = '2001:db8:b::1';
  // 3 wrong passwords do not lock, and the right one then clears the count
  for (let i = 0; i < 3; i++) expect((await visit(baseURL, '/', from, 'nope')).status).toBe(401);
  expect((await visit(baseURL, '/', from, 'e2e-site')).status).toBe(200);

  for (let i = 0; i < 3; i++) expect((await visit(baseURL, '/', from, 'nope')).status).toBe(401);
  const fourth = await visit(baseURL, '/', from, 'nope');
  expect(fourth.status).toBe(429);
  expect(Number(fourth.headers.get('retry-after'))).toBeGreaterThan(23 * 3600);
  expect(await fourth.text()).toContain('Try again after');

  // The right password and other addresses in the same /64 stay blocked
  expect((await visit(baseURL, '/', from, 'e2e-site')).status).toBe(429);
  expect((await visit(baseURL, '/scan', '2001:db8:b:0:ffff::9', 'e2e-site')).status).toBe(429);

  // Other networks are not affected
  expect((await visit(baseURL, '/', '2001:db8:c::1', 'e2e-site')).status).toBe(200);
  expect((await visit(baseURL, '/', '198.51.100.7', 'e2e-site')).status).toBe(200);
});

test('sends security headers and hides the framework', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['permissions-policy']).toContain('camera=(self)');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('admin pages ask not to be indexed', async ({ request }) => {
  expect(await (await request.get('/admin/login')).text()).toMatch(/<meta name="robots" content="noindex/);
});

test('the catalogue links to machines and does not ship the parts catalogue', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Shredders' }).click();
  await page.getByRole('link', { name: /GAZ 600/ }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/machine/gaz-600');

  const home = await (await request.get('/')).text();
  expect(home).not.toContain('gp-80-hydrauli-kit');
});

test('machine pages show what GROSS publishes, and no invented prices', async ({ page }) => {
  await page.goto('/machine/gp-80');
  await expect(page.getByRole('heading', { name: 'Technical specifications' })).toBeVisible();
  await expect(page.getByText('Briquette diameter (mm)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Download brochure/ })).toHaveAttribute('href', /One-Pager_GP80.*\.pdf$/);
  await expect(page.getByRole('link', { name: 'info@gross-zerkleinerer.de' })).toBeVisible();

  await page.getByRole('button', { name: 'View parts for Hydraulic tank' }).click();
  await expect(page.getByText('Price on request')).toBeVisible();
  await expect(page.getByText('Contains oil for lubricating the cylinders')).toBeVisible();
  await expect(page.getByText('In Stock')).toHaveCount(0);
  await expect(page.getByText(/GRS-/)).toHaveCount(0);
  await expect(page.getByText(/€/)).toHaveCount(0);
});

test('hotspot pins are centred on their position', async ({ page }) => {
  await page.goto('/machine/gp-80');
  const pin = page.locator('button[aria-label^="View parts for"]').first();
  await expect(pin).toBeVisible();
  await page.waitForTimeout(1200);
  const offset = await pin.evaluate((el) => {
    const parent = el.parentElement!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return (box.left + box.width / 2 - parent.left) / parent.width * 100;
  });
  const left = await pin.evaluate((el) => parseFloat((el as HTMLElement).style.left));
  expect(Math.abs(offset - left)).toBeLessThan(0.5);
});

test('the scanner page opens a typed serial number', async ({ page }) => {
  await page.goto('/scan');
  await page.getByPlaceholder('Serial number or Machine ID').fill('not registered/x');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Machine not found' })).toBeVisible();
});

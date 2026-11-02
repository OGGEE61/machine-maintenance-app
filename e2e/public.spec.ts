import { expect, test } from '@playwright/test';

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
  expect(home).not.toContain('Replacement Kit');
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

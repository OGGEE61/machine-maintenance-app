import { APIRequestContext, Browser, BrowserContext, expect, Page } from '@playwright/test';

const DB_URL = 'http://127.0.0.1:5499';

export async function db(query: string, params: unknown[] = []): Promise<string[][]> {
  const res = await fetch(`${DB_URL}/sql`, { method: 'POST', body: JSON.stringify({ query, params }) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message);
  return body.rows;
}

export async function sentEmails(): Promise<Array<{ to: string[]; subject: string; text: string; reply_to?: string }>> {
  return (await fetch(`${DB_URL}/emails`)).json();
}

// Rate limits are per address, so each flow gets its own to stay independent of the others
let lastAddress = 0;
export function newAddress(): string {
  lastAddress += 1;
  return `203.0.113.${lastAddress}`;
}

export function newContext(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1360, height: 900 },
    extraHTTPHeaders: { 'x-forwarded-for': newAddress() },
    ...options,
  });
}

export async function logIn(page: Page) {
  await page.goto('/admin/login');
  await page.fill('input[type=password]', 'e2e-pin');
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin');
}

export async function register(page: Page, serial: string, type = 'gp-80') {
  await page.goto('/admin?tab=machines');
  await page.fill('#register-serial', serial);
  await page.selectOption('#register-type', type);
  await page.getByRole('button', { name: 'Register & Get QR Sticker' }).click();
  await expect(page.getByText('Machine registered. Next, print')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
}

export async function addFirstPart(page: Page, pin = 0) {
  await page.locator('button[aria-label^="View parts for"]').nth(pin).click();
  await page.getByRole('button', { name: /^(Add to Cart|Add \()/ }).first().click();
}

export async function openCart(page: Page) {
  await page.locator('header').getByRole('button', { name: /Cart/ }).click();
}

export async function submitOrder(page: Page, name: string, email: string) {
  await openCart(page);
  await page.getByRole('button', { name: 'Continue to Your Details' }).click();
  await page.fill('#order-name', name);
  await page.fill('#order-email', email);
  await page.getByRole('button', { name: 'Submit Order Request' }).click();
}

export function orderBody(overrides: Record<string, unknown> = {}) {
  return {
    machineTypeId: 'gp-80',
    customerName: 'API Test',
    customerEmail: 'api@example.com',
    items: [{ partId: 'gp-80-hydrauli-kit', quantity: 2 }],
    ...overrides,
  };
}

export function postOrder(request: APIRequestContext, body: unknown, address = newAddress()) {
  return request.post('/api/orders', { data: body as object, headers: { 'x-forwarded-for': address } });
}

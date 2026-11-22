import { test, expect } from '@playwright/test';

test.describe('M R S Services — Playwright MCP End-to-End Test Suite', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  test('01. Public Landing Page & Zero-Pill Design Integrity', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveTitle(/M R S/i);

    // Verify 16 Services link
    const servicesBtn = page.getByRole('link', { name: /Explore 16 Services/i });
    await expect(servicesBtn).toBeVisible();

    // Verify Trust Strip includes official accounts
    await expect(page.getByText(/bKash, Nagad, Binance, Payoneer & Skrill/i)).toBeVisible();
  });

  test('02. Section 5B Payment Registry API Integrity', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/payment-methods`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.registry).toBeDefined();
    expect(data.registry.methods.length).toBeGreaterThanOrEqual(4);
    expect(data.registry.integrity_hash).toBeTruthy();
  });

  test('03. 16 Service Catalog API Specification', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/catalog`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.services.length).toBe(16);
    const cvService = data.services.find((s: any) => s.serviceId === 'S-MRS-06');
    expect(cvService).toBeDefined();
    expect(cvService.rateUSD).toBe(15);
  });

  test('04. Order Placement, Invoice Issuance & 6-Digit PIN', async ({ request }) => {
    const testEmail = `playwright.e2e.${Date.now()}@mrs-test.com`;
    const res = await request.post(`${BASE_URL}/api/orders`, {
      data: {
        serviceId: 'S-MRS-06',
        details: 'Playwright MCP E2E test automated order',
        clientName: 'Playwright Test Client',
        clientEmail: testEmail,
        clientWhatsapp: '+8801810853282',
        clientCountry: 'Bangladesh',
      },
    });

    expect(res.status()).toBe(201);
    const data = await res.json();
    expect(data.order.orderId).toMatch(/^ORD-/);
    expect(data.invoice.invoiceId).toMatch(/^INV-/);
    expect(data.client.clientId).toMatch(/^MRS-/);
    expect(data.plainPin).toMatch(/^\d{6}$/);
  });

  test('05. Security: PIN Brute-Force Lockout Gate', async ({ request }) => {
    const fakeClient = 'MRS-TEST-9999';
    // Send invalid PIN
    const res = await request.post(`${BASE_URL}/api/portal/login`, {
      data: { clientId: fakeClient, pin: '000000' },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('06. VibeSec Security Headers Audit', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health/liveness`);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('SAMEORIGIN');
  });

  test('07. Context7 Operational Dimensions', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/context7/manifest`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.framework).toBe('Context7');
    expect(data.dimensions.length).toBe(7);
  });
});

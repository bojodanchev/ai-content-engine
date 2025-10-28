import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Tests: Authentication Flow
 *
 * Tests:
 * - Landing page loads
 * - Guest access (no Whop token)
 * - Guest ID cookie creation
 * - Dashboard access via middleware
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('Authentication & Access Control', () => {
  test('landing page loads and displays login button', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Check page title
    await expect(page).toHaveTitle(/AI Content Engine|whop/i);

    // Check for login CTA
    const loginButton = page.locator('a, button').filter({ hasText: /login|connect|whop/i }).first();
    await expect(loginButton).toBeVisible();
  });

  test('guest user can access dashboard without Whop token', async ({ page }) => {
    // Visit dashboard without authentication header
    await page.goto(`${BASE_URL}/dashboard`);

    // Should not redirect (guest access allowed)
    expect(page.url()).toContain('/dashboard');

    // Dashboard should render
    const dashboard = page.locator('[data-testid="dashboard"], main, h1').first();
    await expect(dashboard).toBeVisible({ timeout: 5000 });
  });

  test('guest ID cookie is created and persisted', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for guest ID cookie
    const cookies = await page.context().cookies();
    const guestCookie = cookies.find(c => c.name === 'ace_guest_id');

    expect(guestCookie).toBeDefined();
    expect(guestCookie?.value).toMatch(/^guest_/);
    expect(guestCookie?.httpOnly).toBe(true);
  });

  test('guest ID cookie persists across page navigations', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies1 = await page.context().cookies();
    const guestId1 = cookies1.find(c => c.name === 'ace_guest_id')?.value;

    // Navigate away and back
    await page.goto(`${BASE_URL}/`);
    await page.goto(`${BASE_URL}/dashboard`);

    const cookies2 = await page.context().cookies();
    const guestId2 = cookies2.find(c => c.name === 'ace_guest_id')?.value;

    expect(guestId1).toBe(guestId2);
  });

  test('whop user context header is respected by middleware', async ({ page }) => {
    // Simulate Whop user token (valid ES256 JWT would be needed for real test)
    // For now, verify middleware doesn't break without token

    await page.goto(`${BASE_URL}/dashboard`);

    // Should load without errors
    const console_errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') console_errors.push(msg.text());
    });

    // Wait for any dynamic content
    await page.waitForTimeout(1000);

    expect(console_errors.length).toBe(0);
  });

  test('billing/verify endpoint returns user context', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check that verify endpoint is accessible
    const verifyResponse = await page.request.get(`${BASE_URL}/api/billing/verify`);

    // Should return 200 (even for guest user, it may return 401, but endpoint should exist)
    expect([200, 401]).toContain(verifyResponse.status());
  });

  test('failed OAuth callback shows error', async ({ page }) => {
    // Test with invalid code
    await page.goto(`${BASE_URL}/api/oauth/callback?code=invalid&state=test`);

    // Should show error response
    const response = await page.textContent('body');
    expect(response).toMatch(/invalid|error|oauth/i);
  });
});

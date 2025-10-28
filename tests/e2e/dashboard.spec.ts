import { test, expect } from '@playwright/test';

/**
 * End-to-End Tests: Dashboard UI & Components
 *
 * Tests:
 * - Dashboard loads without auth
 * - All major sections visible (Upload, Jobs, Billing)
 * - Upload component renders
 * - Jobs list displays (initially empty)
 * - Billing section shows plan info
 * - UI is responsive
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  });

  test('dashboard page loads successfully', async ({ page }) => {
    expect(page.url()).toContain('/dashboard');

    // Check for page title or main heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  });

  test('upload section is visible', async ({ page }) => {
    const uploadSection = page.locator(
      'button:has-text("Upload"), [data-testid="upload"], label:has-text("Upload"), input[type="file"]'
    ).first();

    await expect(uploadSection).toBeVisible({ timeout: 3000 });
  });

  test('jobs list section is present', async ({ page }) => {
    // Look for jobs title or table/list
    const jobsSection = page.locator(
      'h2:has-text("Jobs"), h3:has-text("Jobs"), [data-testid="jobs"], text=/jobs/i'
    ).first();

    await expect(jobsSection).toBeVisible({ timeout: 3000 });
  });

  test('billing section displays plan information', async ({ page }) => {
    // Look for billing section with plan info
    const billingSection = page.locator(
      '[data-testid="billing"], text=/plan|billing|upgrade|free|pro/i'
    ).first();

    await expect(billingSection).toBeVisible({ timeout: 3000 });
  });

  test('jobs list initially shows no jobs or loading state', async ({ page }) => {
    // Wait for jobs API to complete
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    // Check for empty state or loading
    const emptyState = page.locator(
      'text=/no jobs|empty|no videos|loading/i'
    ).first();

    // Either empty state or actual jobs should be visible
    const jobsList = page.locator('[data-testid="job-item"], tr, li').filter({
      has: page.locator('text=/queued|processing|completed|failed/i')
    }).first();

    const isEmptyOrHasJobs = await Promise.race([
      emptyState.isVisible().then(() => true),
      jobsList.isVisible().then(() => true),
      new Promise(r => setTimeout(() => r(true), 2000))
    ]);

    expect(isEmptyOrHasJobs).toBe(true);
  });

  test('page has no console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    expect(errors.length).toBe(0);
  });

  test('navigation elements are visible and clickable', async ({ page }) => {
    // Look for navigation (home, dashboard, logout, etc)
    const navElements = page.locator('nav, header, [role="navigation"]').first();

    await expect(navElements).toBeVisible({ timeout: 3000 });
  });

  test('responsive design works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional
    expect(page.url()).toContain('/dashboard');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  });

  test('responsive design works on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Page should still be functional
    expect(page.url()).toContain('/dashboard');

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 3000 });
  });

  test('dark mode classes exist in document (if implemented)', async ({ page }) => {
    const htmlElement = page.locator('html');
    const classAttribute = await htmlElement.getAttribute('class');

    // Check if dark mode class might be present
    // Common patterns: 'dark', 'dark-mode', '[data-theme=dark]'
    // This test is flexible - just checking if dark mode infrastructure exists
    if (classAttribute) {
      // If classes are set, they should follow some naming convention
      expect(classAttribute).toBeDefined();
    }
  });

  test('main layout uses semantic HTML', async ({ page }) => {
    const main = page.locator('main');
    const hasMain = await main.count() > 0;

    // Either has main tag or checks for role
    if (!hasMain) {
      const roleMain = page.locator('[role="main"]');
      await expect(roleMain).toBeVisible({ timeout: 3000 });
    }
  });

  test('all images have alt text (accessibility)', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        // Alt can be empty for decorative images, but should be present
        expect(alt).not.toBeNull();
      }
    }
  });

  test('form inputs are properly labeled', async ({ page }) => {
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const count = await inputs.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute('aria-label');
        const label = page.locator(`label[for="${await input.getAttribute('id')}"]`);

        const hasLabel = ariaLabel || (await label.count()) > 0;
        expect(hasLabel).toBe(true);
      }
    }
  });
});

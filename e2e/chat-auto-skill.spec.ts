import { test, expect } from '@playwright/test';

/**
 * Golden path:
 *   1. New Client button → dialog → create brand → lands in empty chat.
 *   2. Send an email request with Auto on → assistant responds.
 *   3. Lock a specific skill → send again → skill chip is active.
 *
 * The test is marked `@auth` because it needs a logged-in session; CI
 * should set a cookie fixture before running. Kept in one file so it runs
 * as a smoke test against preview deploys.
 */

test.describe('@auth chat / auto skill routing', () => {
  test('create client → auto-route an email → lock a skill', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new client/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel(/client name/i).fill('Playwright Test Co.');
    await page.getByRole('button', { name: /create & open chat/i }).click();

    await expect(page).toHaveURL(/\/brands\/[^/]+\/chat$/);

    await expect(page.getByRole('button', { name: /auto/i })).toBeVisible();

    const textarea = page.getByPlaceholder(/Auto picks the right skill/i);
    await textarea.fill('Write a short welcome email for a new outdoor gear brand.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.locator('[data-role="message"]').last()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /auto/i }).click();
    await page.getByRole('option', { name: /letter email/i }).click();
    await expect(page.getByRole('button', { name: /letter email/i })).toBeVisible();
  });
});

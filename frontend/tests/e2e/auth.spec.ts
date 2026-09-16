import { test, expect } from '@playwright/test';

/**
 * Requires both the backend (http://localhost:3000) and frontend
 * (http://localhost:5173) dev servers running against a migrated
 * database. See docs/setup.md. Run with:
 *   npm --prefix frontend run test:e2e
 */
test('a new student can register, land on the dashboard, and log out', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel(/full name/i).fill('E2E Test Student');
  await page.getByLabel(/email/i).fill(email);
  const password = 'CorrectHorseBattery1!';
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByLabel('University', { exact: true }).click();
  await page.getByRole('option').first().click();
  await page.getByLabel('Field of study', { exact: true }).click();
  await page.getByRole('option').first().click();
  await page.getByLabel(/current year/i).fill('1');
  await page.getByLabel(/current semester/i).selectOption('1');
  await page.getByRole('checkbox', { name: /I agree/i }).check();
  await page.getByRole('button', { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible();

  await page.getByRole('button', { name: /log.?out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

import { test, expect } from '@playwright/test';

test('MargenX carga correctamente', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/MargenX/i);
});
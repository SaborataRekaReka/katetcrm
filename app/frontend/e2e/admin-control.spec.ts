import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@katet.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';

async function loginAsAdmin(page: Page) {
  await page.goto('/');

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Пароль')).toBeVisible();
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Пароль').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('button', { name: 'Контроль' })).toBeVisible();
}

test.describe('Admin and Control browser flows', () => {
  test('admin can open control reports and audit routes', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Контроль' }).click();
    await page.getByRole('button', { name: 'Отчёты' }).click();
    await expect(page).toHaveURL(/\/reports/);

    await page.getByRole('button', { name: 'Журнал действий' }).click();
    await expect(page).toHaveURL(/\/audit/);
  });

  test('admin can run users write flow', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: 'Админ' }).click();
    await page.getByRole('button', { name: 'Пользователи' }).click();
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.locator('button:has-text("Новый пользователь"):not([disabled])').first().click();
    await expect(page.getByText(/Пользователь .* создан/i)).toBeVisible();
  });
});

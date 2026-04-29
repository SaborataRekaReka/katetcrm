# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-control.spec.ts >> Admin and Control browser flows >> admin can run users write flow
- Location: e2e\admin-control.spec.ts:30:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Контроль' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Контроль' })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - img "TASKA" [ref=e7]
    - generic [ref=e8]:
      - paragraph [ref=e9]: smart focus workspace
      - heading "Планируйте день спокойнее, завершайте больше." [level=2] [ref=e10]
  - generic [ref=e12]:
    - generic [ref=e13]:
      - heading "Вход в аккаунт" [level=1] [ref=e14]
      - paragraph [ref=e15]: Войдите, чтобы продолжить работу с задачами.
    - generic [ref=e16]:
      - generic [ref=e17]: Email
      - textbox "Email" [ref=e18]:
        - /placeholder: you@example.com
        - text: admin@katet.local
    - generic [ref=e19]:
      - generic [ref=e20]: Пароль
      - textbox "Пароль" [ref=e21]:
        - /placeholder: Введите пароль
        - text: admin123
    - paragraph [ref=e22]: Failed to fetch
    - button "Войти" [ref=e23] [cursor=pointer]
    - paragraph [ref=e24]:
      - text: Нет аккаунта?
      - link "Зарегистрироваться" [ref=e25] [cursor=pointer]:
        - /url: /register
    - paragraph [ref=e26]: Проблема со входом? Попробуйте авторизацию через Google.
    - generic [ref=e28]: или
    - button "Продолжить через Google" [ref=e29] [cursor=pointer]:
      - img [ref=e31]
      - generic [ref=e36]: Продолжить через Google
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@katet.local';
  4  | const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';
  5  | 
  6  | async function loginAsAdmin(page: Page) {
  7  |   await page.goto('/');
  8  | 
  9  |   await expect(page.getByLabel('Email')).toBeVisible();
  10 |   await expect(page.getByLabel('Пароль')).toBeVisible();
  11 |   await page.getByLabel('Email').fill(ADMIN_EMAIL);
  12 |   await page.getByLabel('Пароль').fill(ADMIN_PASSWORD);
  13 |   await page.getByRole('button', { name: 'Войти' }).click();
  14 | 
> 15 |   await expect(page.getByRole('button', { name: 'Контроль' })).toBeVisible();
     |                                                                ^ Error: expect(locator).toBeVisible() failed
  16 | }
  17 | 
  18 | test.describe('Admin and Control browser flows', () => {
  19 |   test('admin can open control reports and audit routes', async ({ page }) => {
  20 |     await loginAsAdmin(page);
  21 | 
  22 |     await page.getByRole('button', { name: 'Контроль' }).click();
  23 |     await page.getByRole('button', { name: 'Отчёты' }).click();
  24 |     await expect(page).toHaveURL(/\/reports/);
  25 | 
  26 |     await page.getByRole('button', { name: 'Журнал действий' }).click();
  27 |     await expect(page).toHaveURL(/\/audit/);
  28 |   });
  29 | 
  30 |   test('admin can run users write flow', async ({ page }) => {
  31 |     await loginAsAdmin(page);
  32 | 
  33 |     await page.getByRole('button', { name: 'Админ' }).click();
  34 |     await page.getByRole('button', { name: 'Пользователи' }).click();
  35 |     await expect(page).toHaveURL(/\/admin\/users/);
  36 | 
  37 |     await page.locator('button:has-text("Новый пользователь"):not([disabled])').first().click();
  38 |     await expect(page.getByText(/Пользователь .* создан/i)).toBeVisible();
  39 |   });
  40 | });
  41 | 
```
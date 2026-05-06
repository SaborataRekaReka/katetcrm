import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@katet.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin123';
const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001/api/v1';

interface LeadListItem {
  id: string;
  stage: string;
  contactName: string;
  linkedIds?: {
    applicationId?: string | null;
  };
}

interface LeadsListResponse {
  items: LeadListItem[];
}

interface DepartureListResponse {
  items: Array<{
    id: string;
    linked?: {
      applicationId?: string | null;
    };
  }>;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loginAsAdmin(page: Page) {
  await page.goto('/');

  const emailInput = page.getByLabel('Email');
  const needsLogin = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (needsLogin) {
    await emailInput.fill(ADMIN_EMAIL);
    await page.getByLabel('Пароль').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
  }

  await expect(page.getByRole('button', { name: 'Контроль' })).toBeVisible();
}

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const login = await request.post(`${API_BASE}/auth/login`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });
  expect(login.ok()).toBeTruthy();

  const payload = (await login.json()) as { accessToken: string };
  return payload.accessToken;
}

async function findLeadWithoutLinkedApplication(
  request: APIRequestContext,
): Promise<{ id: string; contactName: string }> {
  const token = await getAdminToken(request);
  const response = await request.get(`${API_BASE}/leads?scope=all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();

  const data = (await response.json()) as LeadsListResponse;
  const candidate = data.items.find(
    (lead) => lead.stage === 'lead' && !lead.linkedIds?.applicationId,
  );

  if (!candidate) {
    throw new Error('No lead without linked application was found for switcher disable check');
  }

  return {
    id: candidate.id,
    contactName: candidate.contactName,
  };
}

async function findDepartureWithLinkedApplication(
  request: APIRequestContext,
): Promise<{ departureId: string }> {
  const token = await getAdminToken(request);
  const departuresResponse = await request.get(`${API_BASE}/departures`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(departuresResponse.ok()).toBeTruthy();

  const departures = (await departuresResponse.json()) as DepartureListResponse;

  const candidate = departures.items.find((departure) => departure.linked?.applicationId);

  if (!candidate || !candidate.linked?.applicationId) {
    throw new Error('No departure with linked application was found for switcher navigation check');
  }

  return {
    departureId: candidate.id,
  };
}

async function openLeadDetailFromList(page: Page, contactName: string) {
  await page.goto('/leads?view=list');

  const searchInput = page.getByPlaceholder('Поиск по лидам');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(contactName);

  const row = page
    .getByRole('button', { name: new RegExp(escapeRegExp(contactName), 'i') })
    .first();
  await expect(row).toBeVisible();
  await row.click();

  await expect(page.locator('[role="dialog"]').first()).toBeVisible();
}

async function openDepartureDetailFromList(page: Page, departureId: string) {
  await page.goto('/departures?view=list');

  const row = page.getByText(`DEP-${departureId}`).first();
  await expect(row).toBeVisible();
  await row.click();

  await expect(page.locator('[role="dialog"]').first()).toBeVisible();
}

async function openEntitySwitcherMenu(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  await expect(dialog).toBeVisible();

  const triggers = dialog.locator('button[aria-haspopup="menu"]');
  const triggerCount = await triggers.count();

  for (let index = 0; index < triggerCount; index += 1) {
    const trigger = triggers.nth(index);
    const text = ((await trigger.textContent()) ?? '').trim();
    if (!text) {
      continue;
    }

    try {
      await trigger.click({ timeout: 3000 });
    } catch {
      await trigger.evaluate((el) => {
        (el as HTMLButtonElement).click();
      });
    }

    await expect(page.getByRole('menuitem').first()).toBeVisible();
    return;
  }

  throw new Error('Entity switcher trigger was not found in detail dialog');
}

test.describe('Entity navigation regression', () => {
  test('lead switcher opens applications workspace from lead detail', async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    const lead = await findLeadWithoutLinkedApplication(request);

    await openLeadDetailFromList(page, lead.contactName);

    await openEntitySwitcherMenu(page);

    const applicationMenuItem = page.getByRole('menuitem', { name: /^Заявка$/ });
    expect(await applicationMenuItem.getAttribute('aria-disabled')).not.toBe('true');

    await applicationMenuItem.click();
    await expect(page).toHaveURL(/\/applications(\?|$)/);

    const after = new URL(page.url());
    expect(after.pathname).toBe('/applications');
  });

  test('departure switcher opens applications workspace from departure detail', async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    const chain = await findDepartureWithLinkedApplication(request);

    await openDepartureDetailFromList(page, chain.departureId);

    await openEntitySwitcherMenu(page);

    const applicationMenuItem = page.getByRole('menuitem', { name: /^Заявка$/ });
    expect(await applicationMenuItem.getAttribute('aria-disabled')).not.toBe('true');

    await applicationMenuItem.click();
    await expect(page).toHaveURL(/\/applications(\?|$)/);

    const after = new URL(page.url());
    expect(after.pathname).toBe('/applications');
    expect(after.searchParams.get('entityType')).toBeNull();
    expect(after.searchParams.get('entityId')).toBeNull();
  });
});

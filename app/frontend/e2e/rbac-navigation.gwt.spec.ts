import { expect, test } from '@playwright/test'
import {
  API_BASE_URL,
  allowUiConsoleErrorPattern,
  apiLogin,
  assertUiFailureGuards,
  enableUiFailureGuards,
  loginViaUi,
  uniquePhone,
  uniqueSeed,
} from './helpers'

test.describe('RBAC and Navigation GWT (QA-REQ: 032..035)', () => {
  test.beforeEach(async ({ page }) => {
    enableUiFailureGuards(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await assertUiFailureGuards(page, {
      failOnIssues: testInfo.status === testInfo.expectedStatus,
    })
  })

  test('E2E-011 manager can execute happy path actions', async ({ page }) => {
    await loginViaUi(page, 'manager')

    await page.getByRole('button', { name: 'Операции', exact: true }).first().click()
    await expect(page).toHaveURL(/\/reservations/)
    await expect(page.getByRole('heading', { name: 'Брони' })).toBeVisible()

    await page.getByRole('button', { name: 'Продажи', exact: true }).first().click()
    await expect(page).toHaveURL(/\/leads/)
    await expect(page.getByRole('heading', { name: 'Лиды' })).toBeVisible()

    const leadName = `E2E Manager ${uniqueSeed('011')}`
    await page.getByRole('button', { name: 'Новый лид' }).click()
    await page.getByPlaceholder('Иван Иванов').fill(leadName)
    await page.getByPlaceholder('+7 (999) 000-00-00').fill(uniquePhone())
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page).toHaveURL(/entityType=lead/)
    await expect(page.getByRole('heading', { name: leadName })).toBeVisible({ timeout: 20_000 })
  })

  test('E2E-011 manager does not see admin or control navigation modules', async ({ page }) => {
    await loginViaUi(page, 'manager')

    await expect(page.getByRole('button', { name: 'Админ', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Контроль', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Менеджер', exact: true })).toHaveCount(0)
  })

  test('E2E-011 manager is redirected away from direct control routes', async ({ page }) => {
    await loginViaUi(page, 'manager')

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/home/)
    await expect(page.getByRole('button', { name: 'Контроль', exact: true })).toHaveCount(0)
  })

  test('E2E-011 manager forbidden actions map to 403 policy', async ({ request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const headers = { Authorization: `Bearer ${managerAuth.accessToken}` }

    const usersResponse = await request.get(`${API_BASE_URL}/users`, { headers })
    expect(usersResponse.status()).toBe(403)

    const settingsResponse = await request.get(`${API_BASE_URL}/settings/workspace`, { headers })
    expect(settingsResponse.status()).toBe(403)

    const importPreviewResponse = await request.post(`${API_BASE_URL}/imports/preview`, {
      headers,
      data: { fileUrl: 'https://qa.local/import.csv' },
    })
    expect(importPreviewResponse.status()).toBe(403)

    const statsReportsResponse = await request.get(`${API_BASE_URL}/stats/reports?periodDays=7`, { headers })
    expect(statsReportsResponse.status()).toBe(403)

    const statsAnalyticsResponse = await request.get(
      `${API_BASE_URL}/stats/analytics?viewId=view-stale-leads&sampleTake=6`,
      { headers },
    )
    expect(statsAnalyticsResponse.status()).toBe(403)

    const activitySearchResponse = await request.get(`${API_BASE_URL}/activity/search?take=20`, { headers })
    expect(activitySearchResponse.status()).toBe(403)
  })

  test('E2E-011 manager sees explicit permission-denied UX on direct admin route', async ({ page }) => {
    await loginViaUi(page, 'manager')
    allowUiConsoleErrorPattern(page, /status of 403 \(Forbidden\)/i)

    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByText('Доступ запрещен (403)').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Админ', exact: true })).toHaveCount(0)
  })
})

import { APIRequestContext, Page, expect } from '@playwright/test'

export type TestRole = 'admin' | 'manager'

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3001/api/v1'

type UiFailureGuardState = {
  consoleErrors: string[]
  failedApiRequests: string[]
  allowedConsoleErrorPatterns: RegExp[]
  onConsole: (message: {
    type(): string
    text(): string
    location(): { url?: string; lineNumber?: number; columnNumber?: number }
  }) => void
  onRequestFailed: (request: {
    url(): string
    method(): string
    failure(): { errorText?: string } | null
  }) => void
}

const uiFailureGuards = new WeakMap<Page, UiFailureGuardState>()

const KNOWN_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /Function components cannot be given refs\. Attempts to access this ref will fail\./i,
  /`DialogContent` requires a `DialogTitle`/i,
]

function isKnownConsoleBaselineError(text: string): boolean {
  return KNOWN_CONSOLE_ERROR_PATTERNS.some((pattern) => pattern.test(text))
}

export function allowUiConsoleErrorPattern(page: Page, pattern: RegExp): void {
  const state = uiFailureGuards.get(page)
  if (!state) {
    return
  }
  state.allowedConsoleErrorPatterns.push(pattern)
}

const ROLE_CREDENTIALS: Record<TestRole, { email: string; password: string }> = {
  admin: { email: 'admin@katet.local', password: 'admin123' },
  manager: { email: 'manager@katet.local', password: 'manager123' },
}

type AuthPayload = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: TestRole
    fullName: string
  }
}

type LeadPayload = {
  id: string
  contactName: string
}

type CreateLeadResult = {
  lead: LeadPayload
}

type ApplicationsListResult = {
  items: Array<{ id: string }>
}

function apiUrl(path: string): string {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${cleanBase}/${cleanPath}`
}

export function enableUiFailureGuards(page: Page): void {
  if (uiFailureGuards.has(page)) {
    return
  }

  const consoleErrors: string[] = []
  const failedApiRequests: string[] = []
  const allowedConsoleErrorPatterns: RegExp[] = []
  const apiBase = API_BASE_URL.replace(/\/+$/, '')

  const onConsole: UiFailureGuardState['onConsole'] = (message) => {
    if (message.type() !== 'error') {
      return
    }

    const text = message.text()
    if (isKnownConsoleBaselineError(text)) {
      return
    }
    if (allowedConsoleErrorPatterns.some((pattern) => pattern.test(text))) {
      return
    }

    const location = message.location()
    const source = location.url ? `${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0}` : 'unknown'
    consoleErrors.push(`${source} :: ${text}`)
  }

  const onRequestFailed: UiFailureGuardState['onRequestFailed'] = (request) => {
    const url = request.url()
    if (!url.startsWith(apiBase)) {
      return
    }

    const errorText = request.failure()?.errorText ?? 'unknown-error'
    if (errorText.includes('ERR_ABORTED')) {
      return
    }

    failedApiRequests.push(`${request.method()} ${url} :: ${errorText}`)
  }

  page.on('console', onConsole)
  page.on('requestfailed', onRequestFailed)
  uiFailureGuards.set(page, {
    consoleErrors,
    failedApiRequests,
    allowedConsoleErrorPatterns,
    onConsole,
    onRequestFailed,
  })
}

export async function assertUiFailureGuards(page: Page, options: { failOnIssues?: boolean } = {}): Promise<void> {
  const state = uiFailureGuards.get(page)
  if (!state) {
    return
  }

  page.off('console', state.onConsole)
  page.off('requestfailed', state.onRequestFailed)
  uiFailureGuards.delete(page)

  const issues = [
    ...state.consoleErrors.map((entry) => `console.error ${entry}`),
    ...state.failedApiRequests.map((entry) => `requestfailed ${entry}`),
  ]

  if (issues.length === 0 || options.failOnIssues === false) {
    return
  }

  expect(issues, `Unexpected UI runtime issues:\n${issues.join('\n')}`).toEqual([])
}

export async function sendApiRequest<T>(
  request: APIRequestContext,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    token?: string
    body?: unknown
    expectedStatus?: number
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await request.fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    data: options.body,
  })
  const status = response.status()

  const raw = await response.text()
  const payload = raw
    ? (() => {
        try {
          return JSON.parse(raw)
        } catch {
          return raw
        }
      })()
    : null

  if (options.expectedStatus !== undefined && status !== options.expectedStatus) {
    throw new Error(
      `API ${options.method ?? 'GET'} ${path} expected ${options.expectedStatus}, got ${status}: ${JSON.stringify(payload)}`,
    )
  }

  if (options.expectedStatus === undefined && !response.ok()) {
    throw new Error(
      `API ${options.method ?? 'GET'} ${path} failed with ${status}: ${JSON.stringify(payload)}`,
    )
  }

  return payload as T
}

export function uniqueSeed(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export function uniquePhone(): string {
  const tail = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`
  return `+7900${tail}`
}

export async function apiLogin(request: APIRequestContext, role: TestRole): Promise<AuthPayload> {
  const credentials = ROLE_CREDENTIALS[role]
  return sendApiRequest<AuthPayload>(request, 'auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export async function createLeadViaApi(
  request: APIRequestContext,
  token: string,
  overrides: Partial<{
    contactName: string
    contactPhone: string
    equipmentTypeHint: string
    address: string
    requestedDate: string
  }> = {},
): Promise<LeadPayload> {
  const oneDayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const response = await sendApiRequest<CreateLeadResult>(request, 'leads', {
    method: 'POST',
    token,
    body: {
      contactName: overrides.contactName ?? `E2E ${uniqueSeed('lead')}`,
      contactPhone: overrides.contactPhone ?? uniquePhone(),
      source: 'manual',
      equipmentTypeHint: overrides.equipmentTypeHint ?? 'Экскаватор',
      requestedDate: overrides.requestedDate ?? oneDayAhead.toISOString(),
      address: overrides.address ?? 'Москва, Тестовая улица, 1',
      comment: 'Created by Playwright e2e',
    },
  })

  return response.lead
}

export async function promoteLeadToApplication(
  request: APIRequestContext,
  token: string,
  leadId: string,
): Promise<string> {
  await sendApiRequest(request, `leads/${leadId}/stage`, {
    method: 'POST',
    token,
    body: { stage: 'application' },
  })

  const list = await sendApiRequest<ApplicationsListResult>(
    request,
    `applications?leadId=${encodeURIComponent(leadId)}&scope=all`,
    {
      token,
    },
  )

  const firstApplicationId = list.items[0]?.id
  expect(firstApplicationId, 'application id after lead->application promotion').toBeTruthy()
  return firstApplicationId as string
}

export async function loginViaUi(page: Page, role: TestRole): Promise<void> {
  const credentials = ROLE_CREDENTIALS[role]

  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('KATET_ACCESS_TOKEN')
    localStorage.removeItem('KATET_REFRESH_TOKEN')
  })
  await page.reload()

  await page.locator('input[type="email"]').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  await page.locator('button[type="submit"]').click()

  await expect(page.locator('input[type="email"]')).toHaveCount(0, { timeout: 20_000 })
  await page.goto('/leads')
  await expect(page).toHaveURL(/\/leads/)
  await expect(page.getByRole('heading', { name: 'Лиды' })).toBeVisible()
}

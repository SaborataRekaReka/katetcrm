import { expect, test } from '@playwright/test'
import {
  assertUiFailureGuards,
  apiLogin,
  createLeadViaApi,
  enableUiFailureGuards,
  loginViaUi,
  promoteLeadToApplication,
  sendApiRequest,
  uniquePhone,
  uniqueSeed,
} from './helpers'

type SourcingType = 'own' | 'subcontractor' | 'undecided'

interface LeadApi {
  id: string
  stage: string
  unqualifiedReason?: string | null
}

interface ApplicationItemApi {
  id: string
}

interface ApplicationApi {
  id: string
  stage: string
  isActive: boolean
}

interface ReservationApi {
  id: string
  status: 'active' | 'released'
}

interface DepartureApi {
  id: string
  status: 'scheduled' | 'in_transit' | 'arrived' | 'completed' | 'cancelled'
}

interface CompletionApi {
  id: string
  departureId: string
  outcome: 'completed' | 'unqualified'
  unqualifiedReason: string | null
}

interface ActivityEntryApi {
  action: string
  actorId: string | null
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function readyItemPayload(seed: string, source: SourcingType) {
  return {
    equipmentTypeLabel: `E2E ${seed}`,
    quantity: 1,
    plannedDate: minutesFromNow(24 * 60),
    plannedTimeFrom: '10:00',
    plannedTimeTo: '14:00',
    address: `Москва, Тестовая улица, ${Math.floor(Math.random() * 100) + 1}`,
    sourcingType: source,
    readyForReservation: true,
  }
}

async function ensureActiveEquipmentUnitId(request: Parameters<typeof apiLogin>[0], token: string): Promise<string> {
  const units = await sendApiRequest<Array<{ id: string }>>(request, 'equipment-units?status=active', {
    token,
  })
  expect(units.length, 'active equipment units for unqualified flow').toBeGreaterThan(0)
  return units[0].id
}

async function createLeadAndApplicationFixture(request: Parameters<typeof apiLogin>[0], token: string, id: string) {
  const lead = await createLeadViaApi(request, token, {
    contactName: `E2E ${id} ${uniqueSeed(id)}`,
    contactPhone: uniquePhone(),
  })
  const applicationId = await promoteLeadToApplication(request, token, lead.id)
  return { leadId: lead.id, applicationId }
}

async function createReadyItem(
  request: Parameters<typeof apiLogin>[0],
  token: string,
  applicationId: string,
  source: SourcingType,
  suffix: string,
): Promise<ApplicationItemApi> {
  return sendApiRequest<ApplicationItemApi>(request, `applications/${applicationId}/items`, {
    method: 'POST',
    token,
    body: readyItemPayload(suffix, source),
  })
}

test.describe('Terminal Branch GWT (QA-REQ: 025..027)', () => {
  test.beforeEach(async ({ page }) => {
    enableUiFailureGuards(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await assertUiFailureGuards(page, {
      failOnIssues: testInfo.status === testInfo.expectedStatus,
    })
  })

  test('E2E-009 unqualified branch behavior', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const leadOnly = await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E 009 Lead ${uniqueSeed('009')}`,
      contactPhone: uniquePhone(),
    })
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '009')
    const unitId = await ensureActiveEquipmentUnitId(request, managerAuth.accessToken)
    const unqualifiedReason = `E2E-009 unqualified reason ${uniqueSeed('009')}`

    await loginViaUi(page, 'manager')

    await page.goto(`/leads?view=list&entityType=lead&entityId=${leadOnly.id}`)
    await expect(
      page.getByRole('button', { name: 'Пометить некачественным' }).first(),
    ).toBeVisible({ timeout: 20_000 })

    await page.goto(`/applications?view=list&entityType=application&entityId=${fixture.applicationId}`)
    await expect(
      page.getByRole('button', { name: 'Закрыть как некачественный' }).first(),
    ).toBeVisible({ timeout: 20_000 })

    const item = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '009-item',
    )

    const reservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: item.id,
        sourcingType: 'own',
        equipmentUnitId: unitId,
        internalStage: 'ready_for_departure',
        plannedStart: minutesFromNow(168 * 60),
        plannedEnd: minutesFromNow(172 * 60),
      },
    })

    await sendApiRequest(request, `leads/${fixture.leadId}/stage`, {
      method: 'POST',
      token: managerAuth.accessToken,
      body: { stage: 'reservation' },
    })

    await page.goto(`/reservations?view=list&entityType=reservation&entityId=${reservation.id}`)
    await expect(
      page.getByRole('button', { name: 'Закрыть как некачественный' }).first(),
    ).toBeVisible({ timeout: 20_000 })

    const departure = await sendApiRequest<DepartureApi>(request, 'departures', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        reservationId: reservation.id,
        scheduledAt: minutesFromNow(169 * 60),
      },
    })

    await page.goto(`/departures?view=list&entityType=departure&entityId=${departure.id}`)
    const unqualifiedButton = page.getByRole('button', { name: 'Некачественный' }).first()
    await expect(unqualifiedButton).toBeVisible({ timeout: 20_000 })
    await expect(unqualifiedButton).toBeDisabled()

    await sendApiRequest(request, `departures/${departure.id}/complete`, {
      method: 'POST',
      token: managerAuth.accessToken,
      expectedStatus: 400,
      body: {
        outcome: 'unqualified',
      },
    })

    await page.getByPlaceholder('Комментарий к итогу выезда').fill(unqualifiedReason)
    await expect(unqualifiedButton).toBeEnabled()
    await unqualifiedButton.click()

    await expect(page).toHaveURL(/entityType=completion/, { timeout: 20_000 })
    const completionId = new URL(page.url()).searchParams.get('entityId')
    expect(completionId).toBeTruthy()
    if (!completionId) {
      throw new Error('Missing completion id in URL after unqualified action')
    }

    const completion = await sendApiRequest<CompletionApi>(request, `completions/${completionId}`, {
      token: managerAuth.accessToken,
    })
    expect(completion.departureId).toBe(departure.id)
    expect(completion.outcome).toBe('unqualified')
    expect(completion.unqualifiedReason).toBe(unqualifiedReason)

    const lead = await sendApiRequest<LeadApi>(request, `leads/${fixture.leadId}`, {
      token: managerAuth.accessToken,
    })
    expect(lead.stage).toBe('unqualified')
    expect(lead.unqualifiedReason).toBe(unqualifiedReason)

    const application = await sendApiRequest<ApplicationApi>(
      request,
      `applications/${fixture.applicationId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(application.stage).toBe('cancelled')
    expect(application.isActive).toBe(false)

    const reservations = await sendApiRequest<{ items: ReservationApi[]; total: number }>(
      request,
      `reservations?applicationId=${encodeURIComponent(fixture.applicationId)}&isActive=false`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(reservations.total).toBeGreaterThan(0)
    expect(reservations.items.every((row) => row.status === 'released')).toBe(true)

    const departureAfter = await sendApiRequest<DepartureApi>(request, `departures/${departure.id}`, {
      token: managerAuth.accessToken,
    })
    expect(departureAfter.status).toBe('cancelled')

    const completionActivity = await sendApiRequest<ActivityEntryApi[]>(
      request,
      `activity?entityType=completion&entityId=${completionId}&take=50`,
      {
        token: managerAuth.accessToken,
      },
    )
    const unqualifiedEntry = completionActivity.find((entry) => entry.action === 'unqualified')
    expect(unqualifiedEntry).toBeTruthy()
    expect(unqualifiedEntry?.actorId).toBe(managerAuth.user.id)
  })
})

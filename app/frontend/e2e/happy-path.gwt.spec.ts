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
  isDuplicate?: boolean
  unqualifiedReason?: string | null
}

interface ApplicationItemApi {
  id: string
}

interface ApplicationApi {
  id: string
  stage: string
  isActive: boolean
  positions: ApplicationItemApi[]
}

interface ReservationApi {
  id: string
  status: 'active' | 'released'
  hasConflict: boolean
  source?: SourcingType
  sourcingType?: SourcingType
}

interface DepartureApi {
  id: string
  status: 'scheduled' | 'in_transit' | 'arrived' | 'completed' | 'cancelled'
  reservationId: string
  completion: { id: string } | null
  linkedIds?: { completionId?: string | null }
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
  actor?: {
    id: string
    fullName: string
  } | null
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
  expect(units.length, 'active equipment units for reservation/departure flow').toBeGreaterThan(0)
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

async function completeDepartureThroughUi(
  page: Parameters<typeof loginViaUi>[0],
  request: Parameters<typeof apiLogin>[0],
  token: string,
  departureId: string,
): Promise<string> {
  await page.goto(`/departures?view=list&entityType=departure&entityId=${departureId}`)

  const startButton = page.getByRole('button', { name: 'Зафиксировать выезд' }).first()
  await expect(startButton).toBeVisible({ timeout: 20_000 })
  await expect(startButton).toBeEnabled()
  await startButton.click()

  await expect
    .poll(
      async () => {
        const departure = await sendApiRequest<DepartureApi>(request, `departures/${departureId}`, {
          token,
        })
        return departure.status
      },
      { timeout: 20_000 },
    )
    .toBe('in_transit')

  const arriveButton = page.getByRole('button', { name: 'Зафиксировать прибытие' }).first()
  await expect(arriveButton).toBeVisible({ timeout: 20_000 })
  await expect(arriveButton).toBeEnabled()
  await arriveButton.click()

  await expect
    .poll(
      async () => {
        const departure = await sendApiRequest<DepartureApi>(request, `departures/${departureId}`, {
          token,
        })
        return departure.status
      },
      { timeout: 20_000 },
    )
    .toBe('arrived')

  const completeButton = page.getByRole('button', { name: 'Выполнен' }).first()
  await expect(completeButton).toBeVisible({ timeout: 20_000 })
  await expect(completeButton).toBeEnabled()
  await completeButton.click()

  await expect(page).toHaveURL(/entityType=completion/, { timeout: 20_000 })
  await expect(page.getByText('Итог завершения')).toBeVisible({ timeout: 20_000 })

  const completionId = new URL(page.url()).searchParams.get('entityId')
  expect(completionId, 'completion entity id in URL after "Выполнен"').toBeTruthy()
  if (!completionId) {
    throw new Error('Missing completion id in URL after completion action')
  }
  return completionId
}

test.describe('Happy Path GWT (QA-REQ: 001..031)', () => {
  test.beforeEach(async ({ page }) => {
    enableUiFailureGuards(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await assertUiFailureGuards(page, {
      failOnIssues: testInfo.status === testInfo.expectedStatus,
    })
  })

  test('E2E-001 lead create opens detail workspace', async ({ page }) => {
    const leadName = `E2E Lead ${uniqueSeed('001')}`

    await loginViaUi(page, 'manager')
    await page.getByRole('button', { name: 'Новый лид' }).click()
    await expect(page.getByRole('heading', { name: 'Новый лид' })).toBeVisible()

    await page.getByPlaceholder('Иван Иванов').fill(leadName)
    await page.getByPlaceholder('+7 (999) 000-00-00').fill(uniquePhone())
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page).toHaveURL(/entityType=lead/)
    const currentUrl = new URL(page.url())
    expect(currentUrl.searchParams.get('entityType')).toBe('lead')
    expect(currentUrl.searchParams.get('entityId')).toBeTruthy()
    await expect(page.getByRole('heading', { name: leadName })).toBeVisible({ timeout: 20_000 })
  })

  test('E2E-002 duplicate warning does not block save', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const duplicatePhone = uniquePhone()
    const leadName = `E2E Duplicate ${uniqueSeed('002')}`

    await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E Existing ${uniqueSeed('002')}`,
      contactPhone: duplicatePhone,
    })

    await loginViaUi(page, 'manager')
    await page.getByRole('button', { name: 'Новый лид' }).click()
    await page.getByPlaceholder('Иван Иванов').fill(leadName)
    await page.getByPlaceholder('+7 (999) 000-00-00').fill(duplicatePhone)
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page).toHaveURL(/entityType=lead/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: leadName })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Дубль', { exact: true }).first()).toBeVisible({ timeout: 20_000 })

    const createdLeadId = new URL(page.url()).searchParams.get('entityId')
    expect(createdLeadId).toBeTruthy()
    if (!createdLeadId) {
      throw new Error('Lead entity id is missing after duplicate save')
    }

    const createdLead = await sendApiRequest<LeadApi>(request, `leads/${createdLeadId}`, {
      token: managerAuth.accessToken,
    })
    expect(createdLead.isDuplicate).toBe(true)
  })

  test('E2E-003 lead to application conversion', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const lead = await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E App ${uniqueSeed('003')}`,
      contactPhone: uniquePhone(),
    })

    await loginViaUi(page, 'manager')
    await page.goto(`/leads?view=list&entityType=lead&entityId=${lead.id}`)

    const primaryWorkflowAction = page.getByTestId('entity-primary-action').first()
    await expect(primaryWorkflowAction).toBeVisible({ timeout: 20_000 })
    await expect(primaryWorkflowAction).toBeEnabled()
    await expect(primaryWorkflowAction).toContainText(/(Перевести в заявку|Открыть заявку)/)

    await primaryWorkflowAction.click()

    if (!/\/applications\?/.test(page.url())) {
      await expect(primaryWorkflowAction).toContainText(/Открыть заявку/, { timeout: 20_000 })
      await expect(primaryWorkflowAction).toBeEnabled()
      await primaryWorkflowAction.click()
    }

    await expect(page).toHaveURL(/entityType=application/) 
    const currentUrl = new URL(page.url())
    expect(currentUrl.searchParams.get('entityType')).toBe('application')
    expect(['/applications', '/leads']).toContain(currentUrl.pathname)
    const applicationId = currentUrl.searchParams.get('entityId')
    expect(applicationId).toBeTruthy()
    if (!applicationId) {
      throw new Error('Missing application id in URL after lead conversion action')
    }
    await expect(page.getByRole('button', { name: 'Отменить заявку' })).toBeVisible({ timeout: 20_000 })

    await sendApiRequest(request, `leads/${lead.id}/stage`, {
      method: 'POST',
      token: managerAuth.accessToken,
      expectedStatus: 400,
      body: { stage: 'application' },
    })
  })

  test('E2E-004 multi-item readiness and source policy', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '004')

    const appBefore = await sendApiRequest<ApplicationApi>(
      request,
      `applications/${fixture.applicationId}`,
      {
        token: managerAuth.accessToken,
      },
    )

    for (const [index, position] of appBefore.positions.entries()) {
      await sendApiRequest(request, `application-items/${position.id}`, {
        method: 'PATCH',
        token: managerAuth.accessToken,
        body: readyItemPayload(`004-base-${index + 1}`, 'own'),
      })
    }

    await createReadyItem(request, managerAuth.accessToken, fixture.applicationId, 'own', '004-own')
    await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'subcontractor',
      '004-subcontractor',
    )

    await sendApiRequest(
      request,
      `applications/${fixture.applicationId}/items`,
      {
        method: 'POST',
        token: managerAuth.accessToken,
        expectedStatus: 400,
        body: readyItemPayload('004-undecided', 'undecided'),
      },
    )

    await loginViaUi(page, 'manager')
    await page.goto(`/applications?view=list&entityType=application&entityId=${fixture.applicationId}`)

    const prepareButton = page.getByRole('button', { name: 'Подготовить к брони' }).first()
    await expect(prepareButton).toBeVisible({ timeout: 20_000 })
    await expect(prepareButton).toBeEnabled()
    await prepareButton.click()
    const openReservationButton = page.getByRole('button', { name: 'Открыть бронь' }).first()
    await expect(openReservationButton).toBeVisible({ timeout: 20_000 })
    await expect(openReservationButton).toBeEnabled()
    await openReservationButton.click()
    await expect(page).toHaveURL(/entityType=reservation/, { timeout: 20_000 })

    const reservations = await sendApiRequest<{ items: ReservationApi[]; total: number }>(
      request,
      `reservations?applicationId=${encodeURIComponent(fixture.applicationId)}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(reservations.total).toBeGreaterThanOrEqual(2)
    for (const reservation of reservations.items) {
      const source = reservation.source ?? reservation.sourcingType
      expect(source).not.toBe('undecided')
    }
  })

  test('E2E-005 reservation conflict behavior', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '005')
    const unitId = await ensureActiveEquipmentUnitId(request, managerAuth.accessToken)

    const firstItem = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '005-item-1',
    )
    const secondItem = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '005-item-2',
    )

    const plannedStart = minutesFromNow(72 * 60)
    const plannedEnd = minutesFromNow(76 * 60)

    await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: firstItem.id,
        sourcingType: 'own',
        equipmentUnitId: unitId,
        internalStage: 'unit_defined',
        plannedStart,
        plannedEnd,
      },
    })

    const conflictReservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: secondItem.id,
        sourcingType: 'own',
        equipmentUnitId: unitId,
        internalStage: 'unit_defined',
        plannedStart,
        plannedEnd,
      },
    })

    expect(conflictReservation.hasConflict).toBe(true)

    await loginViaUi(page, 'manager')
    await page.goto(`/reservations?view=list&entityType=reservation&entityId=${conflictReservation.id}`)

    await expect(page.getByText('Обнаружен конфликт').first()).toBeVisible({ timeout: 20_000 })
    const moveButton = page.getByRole('button', { name: 'Перевести в выезд' }).first()
    await expect(moveButton).toBeVisible({ timeout: 20_000 })
    await expect(moveButton).toBeEnabled()
  })

  test('E2E-006 reservation to departure requires unit', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '006')
    const unitId = await ensureActiveEquipmentUnitId(request, managerAuth.accessToken)

    const item = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '006-item',
    )

    const reservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: item.id,
        sourcingType: 'own',
        internalStage: 'searching_own_equipment',
        plannedStart: minutesFromNow(96 * 60),
        plannedEnd: minutesFromNow(100 * 60),
      },
    })

    await sendApiRequest(request, `leads/${fixture.leadId}/stage`, {
      method: 'POST',
      token: managerAuth.accessToken,
      body: { stage: 'reservation' },
    })

    await loginViaUi(page, 'manager')
    await page.goto(`/reservations?view=list&entityType=reservation&entityId=${reservation.id}`)

    const moveButton = page.getByRole('button', { name: 'Перевести в выезд' }).first()
    await expect(moveButton).toBeVisible({ timeout: 20_000 })
    await expect(moveButton).toBeDisabled()
    await expect(
      page.getByText('Для перевода нужно: Единица выбрана', { exact: true }),
    ).toBeVisible({ timeout: 20_000 })

    await sendApiRequest(request, `reservations/${reservation.id}`, {
      method: 'PATCH',
      token: managerAuth.accessToken,
      body: {
        equipmentUnitId: unitId,
        internalStage: 'ready_for_departure',
      },
    })

    await page.reload()
    const readyMoveButton = page.getByRole('button', { name: 'Перевести в выезд' }).first()
    await expect(readyMoveButton).toBeEnabled({ timeout: 20_000 })
    await readyMoveButton.click()

    await expect(page).toHaveURL(/entityType=departure/, { timeout: 20_000 })
    const departureId = new URL(page.url()).searchParams.get('entityId')
    expect(departureId).toBeTruthy()
    if (!departureId) {
      throw new Error('Missing departure id in URL after transition')
    }

    const departure = await sendApiRequest<DepartureApi>(request, `departures/${departureId}`, {
      token: managerAuth.accessToken,
    })
    expect(departure.reservationId).toBe(reservation.id)
  })

  test('E2E-007 departure statuses and completion action', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '007')
    const unitId = await ensureActiveEquipmentUnitId(request, managerAuth.accessToken)

    const item = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '007-item',
    )

    const reservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: item.id,
        sourcingType: 'own',
        equipmentUnitId: unitId,
        internalStage: 'ready_for_departure',
        plannedStart: minutesFromNow(120 * 60),
        plannedEnd: minutesFromNow(124 * 60),
      },
    })

    const departure = await sendApiRequest<DepartureApi>(request, 'departures', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        reservationId: reservation.id,
        scheduledAt: minutesFromNow(121 * 60),
      },
    })

    await loginViaUi(page, 'manager')
    const completionId = await completeDepartureThroughUi(
      page,
      request,
      managerAuth.accessToken,
      departure.id,
    )
    expect(completionId).toBeTruthy()

    await expect
      .poll(
        async () => {
          const fresh = await sendApiRequest<DepartureApi>(request, `departures/${departure.id}`, {
            token: managerAuth.accessToken,
          })
          return fresh.status
        },
        { timeout: 20_000 },
      )
      .toBe('completed')
  })

  test('E2E-008 completion cascade and audit visibility', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createLeadAndApplicationFixture(request, managerAuth.accessToken, '008')
    const unitId = await ensureActiveEquipmentUnitId(request, managerAuth.accessToken)

    const item = await createReadyItem(
      request,
      managerAuth.accessToken,
      fixture.applicationId,
      'own',
      '008-item',
    )

    const reservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        applicationItemId: item.id,
        sourcingType: 'own',
        equipmentUnitId: unitId,
        internalStage: 'ready_for_departure',
        plannedStart: minutesFromNow(144 * 60),
        plannedEnd: minutesFromNow(148 * 60),
      },
    })

    const departure = await sendApiRequest<DepartureApi>(request, 'departures', {
      method: 'POST',
      token: managerAuth.accessToken,
      body: {
        reservationId: reservation.id,
        scheduledAt: minutesFromNow(145 * 60),
      },
    })

    await loginViaUi(page, 'manager')
    const completionId = await completeDepartureThroughUi(
      page,
      request,
      managerAuth.accessToken,
      departure.id,
    )

    const completion = await sendApiRequest<CompletionApi>(request, `completions/${completionId}`, {
      token: managerAuth.accessToken,
    })
    expect(completion.departureId).toBe(departure.id)

    const lead = await sendApiRequest<LeadApi>(request, `leads/${fixture.leadId}`, {
      token: managerAuth.accessToken,
    })
    expect(lead.stage).toBe('completed')

    const application = await sendApiRequest<ApplicationApi>(
      request,
      `applications/${fixture.applicationId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(application.stage).toBe('completed')
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
    expect(departureAfter.status).toBe('completed')
    expect(departureAfter.completion?.id ?? departureAfter.linkedIds?.completionId).toBe(completionId)

    const completionActivity = await sendApiRequest<ActivityEntryApi[]>(
      request,
      `activity?entityType=completion&entityId=${completionId}&take=50`,
      {
        token: managerAuth.accessToken,
      },
    )
    const completedEntry = completionActivity.find((entry) => entry.action === 'completed')
    expect(completedEntry).toBeTruthy()
    expect(completedEntry?.actorId).toBe(managerAuth.user.id)
    expect(completedEntry?.actor?.fullName).toBeTruthy()
  })

  test('E2E-010 route and state persistence with back-forward', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const lead = await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E Route ${uniqueSeed('010')}`,
      contactPhone: uniquePhone(),
    })

    await loginViaUi(page, 'manager')
    await page.goto(`/leads?view=table&entityType=lead&entityId=${lead.id}`)

    await expect(page.getByRole('heading', { name: 'Лиды' })).toBeVisible()
    await expect(page.getByRole('heading', { name: lead.contactName })).toBeVisible({ timeout: 20_000 })

    await page.goto('/clients')
    await expect(page).toHaveURL(/\/clients/)

    await page.goBack()
    await expect(page).toHaveURL(/\/leads\?/)
    const backUrl = new URL(page.url())
    expect(backUrl.searchParams.get('view')).toBe('table')
    expect(backUrl.searchParams.get('entityType')).toBe('lead')
    expect(backUrl.searchParams.get('entityId')).toBe(lead.id)
    await expect(page.getByRole('heading', { name: lead.contactName })).toBeVisible({ timeout: 20_000 })
  })
})

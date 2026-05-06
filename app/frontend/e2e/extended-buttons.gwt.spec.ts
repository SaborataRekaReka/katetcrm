import { expect, test, type Page } from '@playwright/test'
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
  clientId?: string | null
  comment?: string | null
}

interface ApplicationItemApi {
  id: string
}

interface ApplicationApi {
  id: string
  stage: string
  isActive: boolean
  address?: string | null
}

interface ReservationApi {
  id: string
  status: 'active' | 'released'
  internalStage?: string
  readyForDeparture?: boolean
}

interface DepartureApi {
  id: string
  status: 'scheduled' | 'in_transit' | 'arrived' | 'completed' | 'cancelled'
  completion?: { id: string } | null
  linkedIds?: { completionId?: string | null }
}

interface CompletionApi {
  id: string
  departureId: string
  outcome: 'completed' | 'unqualified'
  unqualifiedReason: string | null
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function readyItemPayload(seed: string, source: SourcingType = 'own') {
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
  expect(units.length, 'active equipment units for extended button flow').toBeGreaterThan(0)
  return units[0].id
}

async function createReservationFixture(
  request: Parameters<typeof apiLogin>[0],
  token: string,
  id: string,
  options: { withDeparture?: boolean } = {},
): Promise<{
  leadId: string
  leadName: string
  applicationId: string
  reservationId: string
  departureId: string | null
}> {
  const leadName = `E2E ${id} ${uniqueSeed(id)}`
  const lead = await createLeadViaApi(request, token, {
    contactName: leadName,
    contactPhone: uniquePhone(),
  })
  const applicationId = await promoteLeadToApplication(request, token, lead.id)

  const item = await sendApiRequest<ApplicationItemApi>(request, `applications/${applicationId}/items`, {
    method: 'POST',
    token,
    body: readyItemPayload(`${id}-item`, 'own'),
  })

  const unitId = await ensureActiveEquipmentUnitId(request, token)

  const reservation = await sendApiRequest<ReservationApi>(request, 'reservations', {
    method: 'POST',
    token,
    body: {
      applicationItemId: item.id,
      sourcingType: 'own',
      equipmentUnitId: unitId,
      internalStage: 'ready_for_departure',
      plannedStart: minutesFromNow(72 * 60),
      plannedEnd: minutesFromNow(76 * 60),
    },
  })

  await sendApiRequest(request, `reservations/${reservation.id}`, {
    method: 'PATCH',
    token,
    body: {
      equipmentUnitId: unitId,
      internalStage: 'ready_for_departure',
    },
  })

  await expect
    .poll(
      async () => {
        const refreshedReservation = await sendApiRequest<ReservationApi>(
          request,
          `reservations/${reservation.id}`,
          {
            token,
          },
        )
        return `${refreshedReservation.status}:${refreshedReservation.readyForDeparture}:${refreshedReservation.internalStage}`
      },
      { timeout: 20_000 },
    )
    .toBe('active:true:ready_for_departure')

  let departureId: string | null = null
  if (options.withDeparture) {
    const departure = await sendApiRequest<DepartureApi>(request, 'departures', {
      method: 'POST',
      token,
      body: {
        reservationId: reservation.id,
        scheduledAt: minutesFromNow(73 * 60),
      },
    })
    departureId = departure.id
  }

  return {
    leadId: lead.id,
    leadName,
    applicationId,
    reservationId: reservation.id,
    departureId,
  }
}

async function ensureQuickActionsExpanded(page: Page, actionLabel: string) {
  const actionButton = page.getByRole('button', { name: actionLabel }).first()
  if (await actionButton.isVisible().catch(() => false)) {
    return
  }

  const quickActionsButton = page.getByRole('button', { name: 'Быстрые действия' }).first()
  if (await quickActionsButton.count()) {
    await quickActionsButton.click()
  }
}

async function openListRowByText(page: Page, text: string) {
  const rowButton = page.locator('button').filter({ hasText: text }).first()
  await expect(rowButton).toBeVisible({ timeout: 20_000 })
  await rowButton.click()
}

async function waitForCompletionId(
  request: Parameters<typeof apiLogin>[0],
  token: string,
  departureId: string,
): Promise<string> {
  await expect
    .poll(
      async () => {
        const departure = await sendApiRequest<DepartureApi>(request, `departures/${departureId}`, {
          token,
        })
        return departure.completion?.id ?? departure.linkedIds?.completionId ?? null
      },
      { timeout: 20_000 },
    )
    .not.toBeNull()

  const departure = await sendApiRequest<DepartureApi>(request, `departures/${departureId}`, {
    token,
  })
  const completionId = departure.completion?.id ?? departure.linkedIds?.completionId
  expect(completionId).toBeTruthy()
  return completionId as string
}

test.describe('Extended Buttons GWT (QA-REQ: 025..027, 032)', () => {
  test.beforeEach(async ({ page }) => {
    enableUiFailureGuards(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await assertUiFailureGuards(page, {
      failOnIssues: testInfo.status === testInfo.expectedStatus,
    })
  })

  test('E2E-012 lead duplicate/create-client/edit actions', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const lead = await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E 012 Lead ${uniqueSeed('012')}`,
      contactPhone: uniquePhone(),
    })

    await loginViaUi(page, 'manager')
    await page.goto(`/leads?view=list&entityType=lead&entityId=${lead.id}`)

    await openListRowByText(page, lead.contactName)
    await ensureQuickActionsExpanded(page, 'Отметить как дубль')

    const markDuplicateButton = page.getByRole('button', { name: 'Отметить как дубль' }).first()
    await expect(markDuplicateButton).toBeVisible({ timeout: 20_000 })
    await markDuplicateButton.click()

    await expect
      .poll(
        async () => {
          const updatedLead = await sendApiRequest<LeadApi>(request, `leads/${lead.id}`, {
            token: managerAuth.accessToken,
          })
          return updatedLead.isDuplicate ?? false
        },
        { timeout: 20_000 },
      )
      .toBe(true)

    const editLeadButton = page.getByRole('button', { name: 'Редактировать лид' }).first()
    await expect(editLeadButton).toBeVisible({ timeout: 20_000 })
    await editLeadButton.click()

    const editLeadDialog = page.getByRole('dialog').filter({ hasText: 'Редактирование данных лида.' }).first()
    await expect(editLeadDialog).toBeVisible({ timeout: 20_000 })

    await editLeadDialog.getByRole('button', { name: 'Закрыть' }).first().click()

    const createClientButton = page.getByRole('button', { name: 'Создать клиента' }).first()
    await expect(createClientButton).toBeVisible({ timeout: 20_000 })
    await createClientButton.click()

    await expect(page).toHaveURL(/entityType=client/, { timeout: 20_000 })
    const leadAfterClientCreate = await sendApiRequest<LeadApi>(request, `leads/${lead.id}`, {
      token: managerAuth.accessToken,
    })
    expect(leadAfterClientCreate.clientId).toBeTruthy()
  })

  test('E2E-013 application edit and cancel actions', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const lead = await createLeadViaApi(request, managerAuth.accessToken, {
      contactName: `E2E 013 Lead ${uniqueSeed('013')}`,
      contactPhone: uniquePhone(),
    })
    const applicationId = await promoteLeadToApplication(request, managerAuth.accessToken, lead.id)

    await loginViaUi(page, 'manager')
    await page.goto(`/applications?view=list&entityType=application&entityId=${applicationId}`)

    const editApplicationButton = page.getByRole('button', { name: 'Редактировать заявку' }).first()
    await expect(editApplicationButton).toBeVisible({ timeout: 20_000 })
    await editApplicationButton.click()

    const editApplicationDialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Редактировать заявку' })
      .first()
    await expect(editApplicationDialog).toBeVisible({ timeout: 20_000 })

    const updatedAddress = `Москва, E2E-013, ${Math.floor(Math.random() * 1000) + 1}`
    await editApplicationDialog.getByLabel('Адрес').fill(updatedAddress)
    await editApplicationDialog.getByRole('button', { name: 'Сохранить' }).click()

    await expect
      .poll(
        async () => {
          const updatedApplication = await sendApiRequest<ApplicationApi>(
            request,
            `applications/${applicationId}`,
            {
              token: managerAuth.accessToken,
            },
          )
          return updatedApplication.address ?? ''
        },
        { timeout: 20_000 },
      )
      .toBe(updatedAddress)

    const cancelApplicationButton = page.getByRole('button', { name: 'Отменить заявку' }).first()
    await expect(cancelApplicationButton).toBeVisible({ timeout: 20_000 })
    await cancelApplicationButton.click()

    const cancelApplicationDialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Отменить заявку' })
      .first()
    await expect(cancelApplicationDialog).toBeVisible({ timeout: 20_000 })

    await cancelApplicationDialog.getByLabel('Причина (необязательно)').fill(
      `E2E-013 cancel reason ${uniqueSeed('013-cancel')}`,
    )
    await cancelApplicationDialog.getByRole('button', { name: 'Отменить заявку' }).click()

    await expect
      .poll(
        async () => {
          const updatedApplication = await sendApiRequest<ApplicationApi>(
            request,
            `applications/${applicationId}`,
            {
              token: managerAuth.accessToken,
            },
          )
          return `${updatedApplication.stage}:${updatedApplication.isActive}`
        },
        { timeout: 20_000 },
      )
      .toBe('cancelled:false')
  })

  test('E2E-014 reservation release action', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createReservationFixture(request, managerAuth.accessToken, '014')

    const reservationBefore = await sendApiRequest<ReservationApi>(
      request,
      `reservations/${fixture.reservationId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(reservationBefore.status).toBe('active')
    expect(reservationBefore.readyForDeparture).toBe(true)

    await loginViaUi(page, 'manager')
    await page.goto(`/reservations?view=list&entityType=reservation&entityId=${fixture.reservationId}`)

    await expect(page.getByRole('button', { name: 'Быстрые действия' }).first()).toBeVisible({ timeout: 20_000 })
    await ensureQuickActionsExpanded(page, 'Снять бронь')

    const releaseReservationButton = page.getByRole('button', { name: 'Снять бронь' }).first()
    await expect(releaseReservationButton).toBeVisible({ timeout: 20_000 })
    await releaseReservationButton.click()

    const releaseDialog = page.getByRole('alertdialog').filter({ hasText: 'Снять бронь' }).first()
    await expect(releaseDialog).toBeVisible({ timeout: 20_000 })

    await releaseDialog.getByPlaceholder('Причина снятия…').fill(
      `E2E-014 release reason ${uniqueSeed('014-release')}`,
    )
    await releaseDialog.getByRole('button', { name: 'Снять' }).click()

    await expect(releaseDialog).toBeHidden({ timeout: 20_000 })
    await expect
      .poll(
        async () => {
          const updatedReservation = await sendApiRequest<ReservationApi>(
            request,
            `reservations/${fixture.reservationId}`,
            {
              token: managerAuth.accessToken,
            },
          )
          return updatedReservation.status
        },
        { timeout: 20_000 },
      )
      .toBe('released')
  })

  test('E2E-015 departure open reservation and cancel departure', async ({ page, request }) => {
    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createReservationFixture(request, managerAuth.accessToken, '015', {
      withDeparture: true,
    })
    expect(fixture.departureId).toBeTruthy()

    await loginViaUi(page, 'manager')
    await page.goto(`/departures?view=list&entityType=departure&entityId=${fixture.departureId}`)

    const openReservationButton = page.getByRole('button', { name: 'Открыть бронь' }).first()
    await expect(openReservationButton).toBeVisible({ timeout: 20_000 })
    await openReservationButton.click()

    await expect(page).toHaveURL(/entityType=reservation/, { timeout: 20_000 })
    expect(new URL(page.url()).searchParams.get('entityId')).toBe(fixture.reservationId)

    await page.goto(`/departures?view=list&entityType=departure&entityId=${fixture.departureId}`)

    const cancelDepartureButton = page.getByRole('button', { name: 'Отменить выезд' }).first()
    await expect(cancelDepartureButton).toBeVisible({ timeout: 20_000 })
    await cancelDepartureButton.click()

    const cancelDepartureDialog = page.getByRole('alertdialog').filter({ hasText: 'Отменить выезд?' }).first()
    await expect(cancelDepartureDialog).toBeVisible({ timeout: 20_000 })

    await cancelDepartureDialog.getByPlaceholder('Причина отмены').fill(
      `E2E-015 cancel reason ${uniqueSeed('015-cancel')}`,
    )
    await cancelDepartureDialog.getByRole('button', { name: 'Отменить выезд' }).click()

    await expect(cancelDepartureDialog).toBeHidden({ timeout: 20_000 })
    await expect
      .poll(
        async () => {
          const updatedDeparture = await sendApiRequest<DepartureApi>(
            request,
            `departures/${fixture.departureId}`,
            {
              token: managerAuth.accessToken,
            },
          )
          return updatedDeparture.status
        },
        { timeout: 20_000 },
      )
      .toBe('cancelled')
  })

  test('E2E-016 completion open reservation and repeat-order API parity', async ({ page, request }) => {
    test.setTimeout(120_000)

    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createReservationFixture(request, managerAuth.accessToken, '016', {
      withDeparture: true,
    })
    expect(fixture.departureId).toBeTruthy()

    await sendApiRequest(request, `departures/${fixture.departureId}/start`, {
      method: 'POST',
      token: managerAuth.accessToken,
    })
    await sendApiRequest(request, `departures/${fixture.departureId}/arrive`, {
      method: 'POST',
      token: managerAuth.accessToken,
    })

    const completedDeparture = await sendApiRequest<DepartureApi>(
      request,
      `departures/${fixture.departureId}/complete`,
      {
        method: 'POST',
        token: managerAuth.accessToken,
        body: {
          outcome: 'completed',
          completionNote: `E2E-016 complete note ${uniqueSeed('016-complete')}`,
        },
      },
    )

    const completionId = completedDeparture.completion?.id ?? completedDeparture.linkedIds?.completionId
    expect(completionId).toBeTruthy()

    await loginViaUi(page, 'manager')
    await page.goto(`/completion?view=list&entityType=completion&entityId=${completionId}`)

    const openReservationButton = page.getByRole('button', { name: 'Открыть бронь' }).first()
    await expect(openReservationButton).toBeVisible({ timeout: 20_000 })

    const repeatOrderButton = page.getByRole('button', { name: 'Создать повторный заказ' }).first()
    await expect(repeatOrderButton).toBeVisible({ timeout: 20_000 })
    await repeatOrderButton.click()

    const repeatDialog = page.getByRole('alertdialog').filter({ hasText: 'Будет создана новая заявка' }).first()
    await expect(repeatDialog).toBeVisible({ timeout: 20_000 })
    await repeatDialog.getByRole('button', { name: 'Создать лид' }).click()

    await expect(page.getByText(/Создан новый лид/).first()).toBeVisible({ timeout: 20_000 })

    await page.goto(`/completion?view=list&entityType=completion&entityId=${completionId}`)
    await expect(openReservationButton).toBeVisible({ timeout: 20_000 })

    await openReservationButton.click()
    await expect(page).toHaveURL(/entityType=reservation/, { timeout: 20_000 })
    expect(new URL(page.url()).searchParams.get('entityId')).toBe(fixture.reservationId)
  })

  test('E2E-017 completion unqualified from no-completion view', async ({ page, request }) => {
    test.setTimeout(90_000)

    const managerAuth = await apiLogin(request, 'manager')
    const fixture = await createReservationFixture(request, managerAuth.accessToken, '017', {
      withDeparture: true,
    })
    expect(fixture.departureId).toBeTruthy()

    await loginViaUi(page, 'manager')
    await page.goto('/completion?view=list')

    const noCompletionButton = page.getByRole('button', { name: 'Без завершения' }).first()
    await expect(noCompletionButton).toBeVisible({ timeout: 20_000 })
    await noCompletionButton.click()

    await page.locator('[data-crm-search-input="true"]').fill(fixture.leadName)

    const targetRow = page.locator('tr').filter({ hasText: fixture.leadName }).first()
    await expect(targetRow).toBeVisible({ timeout: 20_000 })
    await targetRow.click()

    const completionLoading = page.getByText('Загрузка завершения...').first()
    if (await completionLoading.isVisible().catch(() => false)) {
      await expect(completionLoading).toBeHidden({ timeout: 60_000 })
    }

    const unqualifiedReason = `E2E-017 unqualified reason ${uniqueSeed('017-unq')}`
    const unqualifiedReasonInput = page.getByPlaceholder('Причина некачественного завершения (если нужно)')
    await expect(unqualifiedReasonInput).toBeVisible({ timeout: 20_000 })
    await unqualifiedReasonInput.fill(unqualifiedReason)

    const markUnqualifiedButton = page.getByRole('button', { name: 'Пометить некачественным' }).first()
    await expect(markUnqualifiedButton).toBeVisible({ timeout: 20_000 })
    await markUnqualifiedButton.click()

    const completionId = await waitForCompletionId(request, managerAuth.accessToken, fixture.departureId as string)

    const completion = await sendApiRequest<CompletionApi>(request, `completions/${completionId}`, {
      token: managerAuth.accessToken,
    })
    expect(completion.departureId).toBe(fixture.departureId)
    expect(completion.outcome).toBe('unqualified')
    expect(completion.unqualifiedReason).toBe(unqualifiedReason)
    await expect(page.getByRole('button', { name: 'Создать повторный заказ' })).toHaveCount(0)

    const leadAfter = await sendApiRequest<LeadApi>(request, `leads/${fixture.leadId}`, {
      token: managerAuth.accessToken,
    })
    expect(leadAfter.stage).toBe('unqualified')

    const applicationAfter = await sendApiRequest<ApplicationApi>(
      request,
      `applications/${fixture.applicationId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(applicationAfter.stage).toBe('cancelled')
    expect(applicationAfter.isActive).toBe(false)

    const reservationAfter = await sendApiRequest<ReservationApi>(
      request,
      `reservations/${fixture.reservationId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(reservationAfter.status).toBe('released')

    const departureAfter = await sendApiRequest<DepartureApi>(
      request,
      `departures/${fixture.departureId}`,
      {
        token: managerAuth.accessToken,
      },
    )
    expect(departureAfter.status).toBe('cancelled')
  })
})

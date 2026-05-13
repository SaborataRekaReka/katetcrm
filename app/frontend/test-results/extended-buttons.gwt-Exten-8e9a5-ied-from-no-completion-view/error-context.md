# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extended-buttons.gwt.spec.ts >> Extended Buttons GWT (QA-REQ: 025..027, 032) >> E2E-017 completion unqualified from no-completion view
- Location: e2e\extended-buttons.gwt.spec.ts:501:3

# Error details

```
Error: Unexpected UI runtime issues:
console.error http://localhost:3001/api/v1/settings/workspace:0:0 :: Failed to load resource: the server responded with a status of 403 (Forbidden)

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "console.error http://localhost:3001/api/v1/settings/workspace:0:0 :: Failed to load resource: the server responded with a status of 403 (Forbidden)",
+ ]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - banner:
        - generic:
          - generic: К
          - generic: Катет CRM
        - generic:
          - generic:
            - img
            - textbox:
              - /placeholder: Поиск завершённых
              - text: E2E 017 017-1778080205601-216
            - generic: Ctrl K
        - generic:
          - button: Менеджер
          - button:
            - img
          - button:
            - img
          - button:
            - generic: MA
            - img
      - generic:
        - complementary:
          - generic:
            - navigation:
              - button:
                - img
              - button:
                - img
              - button:
                - img
              - button [pressed]:
                - img
              - button:
                - img
              - button:
                - img
        - generic:
          - complementary:
            - generic:
              - generic:
                - generic:
                  - img
                  - heading [level=2]: Операции
                - generic:
                  - button:
                    - img
                  - button:
                    - img
              - generic:
                - generic:
                  - button:
                    - img
                    - generic: Брони
                  - button:
                    - img
                    - generic: Выезды
                  - button:
                    - img
                    - generic: Завершение
                - generic:
                  - button:
                    - img
                    - generic: Представления операций
                  - generic:
                    - button:
                      - img
                      - generic: Конфликт брони
                    - button:
                      - img
                      - generic: Требуют подтверждения
                    - button:
                      - img
                      - generic: Unit не выбран
                    - button:
                      - img
                      - generic: Подрядчик не выбран
                    - button:
                      - img
                      - generic: Готовы к выезду
                    - button:
                      - img
                      - generic: Снятые брони
                    - button:
                      - img
                      - generic: Выезды сегодня
                    - button:
                      - img
                      - generic: Просроченные выезды
                    - button:
                      - img
                      - generic: Без завершения
              - generic:
                - button:
                  - img
                  - generic: Черновик
          - main:
            - generic:
              - generic:
                - generic:
                  - heading [level=1]: Завершение · Без акта
                - generic:
                  - button:
                    - img
                    - generic: Список
                  - button:
                    - img
                    - generic: Таблица
              - generic:
                - generic:
                  - img
                  - textbox:
                    - /placeholder: Поиск завершённых
                    - text: E2E 017 017-1778080205601-216
                - combobox:
                  - generic: Все
                  - img
                - combobox:
                  - generic: Все менеджеры
                  - img
                - combobox:
                  - generic: Все типы
                  - img
                - generic:
                  - button:
                    - img
                    - generic: Сбросить
                  - button:
                    - img
                    - generic: Сохранить вид
              - generic:
                - generic: Записей не найдено
    - region "Notifications alt+T"
  - dialog [active] [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e6]:
          - button "CRM" [ref=e7]:
            - img [ref=e8]
            - generic [ref=e9]: CRM
          - generic [ref=e10]:
            - img [ref=e11]
            - button "Операции" [ref=e13]:
              - generic [ref=e14]: Операции
          - generic [ref=e15]:
            - img [ref=e16]
            - generic [ref=e19]: Завершение
        - generic [ref=e20]:
          - button "Поделиться" [ref=e21]:
            - img [ref=e22]
          - button "Следить за карточкой" [ref=e28]:
            - img [ref=e29]
          - button "Ещё действия" [ref=e32]:
            - img [ref=e33]
          - button [ref=e38]:
            - img [ref=e39]
      - generic [ref=e42]:
        - generic [ref=e45]:
          - banner [ref=e46]:
            - button "Завершение" [ref=e47]:
              - img [ref=e48]
              - generic [ref=e51]: Завершение
              - img [ref=e52]
            - generic [ref=e54]:
              - heading "CMP-CMOU71QE" [level=1] [ref=e55]
              - button "Открыть выезд" [ref=e58]:
                - img
                - text: Открыть выезд
            - generic [ref=e59]:
              - button "DEP-CMOU71NO" [ref=e60]
              - text: ·
              - button "APP-000219" [ref=e61]
              - text: ·
              - button "E2E 017 017-1778080205601-216" [ref=e62]
            - generic [ref=e63]:
              - generic [ref=e65]:
                - img [ref=e66]
                - generic [ref=e69]: Manager User
              - generic [ref=e71]:
                - img [ref=e72]
                - generic [ref=e75]: E2E 017-item
          - generic [ref=e76]:
            - img [ref=e77]
            - generic [ref=e79]: "Следующий шаг: Сохранить комментарий"
          - generic [ref=e80]:
            - heading "Итог завершения" [level=3] [ref=e82]
            - generic [ref=e83]:
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - generic [ref=e86]:
                    - img [ref=e88]
                    - generic [ref=e91]: Исход
                  - generic [ref=e92]: Некачественный
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - img [ref=e96]
                    - generic [ref=e99]: Дата
                  - generic [ref=e100]: 06.05.2026, 20:10
                - generic [ref=e101]:
                  - generic [ref=e102]:
                    - img [ref=e104]
                    - generic [ref=e107]: Менеджер
                  - generic [ref=e108]: Manager User
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - img [ref=e112]
                    - generic [ref=e115]: Позиция
                  - generic [ref=e116]: E2E 017-item
              - textbox "Комментарий по завершению" [ref=e117]
              - textbox "Причина некачественного завершения" [ref=e118]: E2E-017 unqualified reason 017-unq-1778080209436-760
              - button "Сохранить комментарий" [ref=e120]
          - generic [ref=e121]:
            - heading "Контекст" [level=3] [ref=e123]
            - generic [ref=e125]:
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - img [ref=e129]
                  - generic [ref=e131]: Дата и окно
                - generic [ref=e133]: 2026-05-07 · 10:00-14:00
              - generic [ref=e134]:
                - generic [ref=e135]:
                  - img [ref=e137]
                  - generic [ref=e140]: Адрес
                - generic [ref=e141]: Москва, Тестовая улица, 73
              - generic [ref=e142]:
                - generic [ref=e143]:
                  - img [ref=e145]
                  - generic [ref=e149]: Клиент
                - button "E2E 017 017-1778080205601-216" [ref=e151]
              - generic [ref=e152]:
                - generic [ref=e153]:
                  - img [ref=e155]
                  - generic [ref=e158]: Менеджер
                - generic [ref=e159]: Manager User
          - generic [ref=e160]:
            - button "Открыть выезд" [ref=e161]:
              - img [ref=e163]
              - text: Открыть выезд
            - button "Открыть бронь" [ref=e167]:
              - img [ref=e169]
              - text: Открыть бронь
            - button "Открыть заявку" [ref=e172]:
              - img [ref=e174]
              - text: Открыть заявку
            - button "Открыть лид" [ref=e177]:
              - img [ref=e179]
              - text: Открыть лид
            - button "Открыть клиента" [ref=e182]:
              - img [ref=e184]
              - text: Открыть клиента
        - complementary [ref=e188]:
          - generic [ref=e189]:
            - button "Сводка" [ref=e191]:
              - img [ref=e192]
              - generic [ref=e194]: Сводка
            - generic [ref=e195]:
              - generic [ref=e196]:
                - generic [ref=e197]: Статус
                - generic [ref=e199]: Некачественный
              - generic [ref=e200]:
                - generic [ref=e201]: Дата
                - generic [ref=e202]: 06.05.2026, 20:10
              - generic [ref=e203]:
                - generic [ref=e204]: Менеджер
                - generic [ref=e205]: Manager User
          - generic [ref=e206]:
            - button "Связанные записи" [ref=e208]:
              - img [ref=e209]
              - generic [ref=e211]: Связанные записи
            - generic [ref=e212]:
              - generic [ref=e213]:
                - generic [ref=e214]: Лид
                - button "LEAD-CMOU71NA" [ref=e216] [cursor=pointer]
              - generic [ref=e217]:
                - generic [ref=e218]: Заявка
                - button "APP-000219" [ref=e220] [cursor=pointer]
              - generic [ref=e221]:
                - generic [ref=e222]: Бронь
                - button "RSV-CMOU71NI" [ref=e224] [cursor=pointer]
              - generic [ref=e225]:
                - generic [ref=e226]: Выезд
                - button "DEP-CMOU71NO" [ref=e228] [cursor=pointer]
              - generic [ref=e229]:
                - generic [ref=e230]: Завершение
                - button "CMP-CMOU71QE" [ref=e232] [cursor=pointer]
              - generic [ref=e233]:
                - generic [ref=e234]: Клиент
                - button "E2E 017 017-1778080205601-216" [ref=e236] [cursor=pointer]
          - button "Быстрые действия" [ref=e239]:
            - img [ref=e240]
            - generic [ref=e242]: Быстрые действия
```

# Test source

```ts
  49  |   refreshToken: string
  50  |   user: {
  51  |     id: string
  52  |     email: string
  53  |     role: TestRole
  54  |     fullName: string
  55  |   }
  56  | }
  57  | 
  58  | type LeadPayload = {
  59  |   id: string
  60  |   contactName: string
  61  | }
  62  | 
  63  | type CreateLeadResult = {
  64  |   lead: LeadPayload
  65  | }
  66  | 
  67  | type ApplicationsListResult = {
  68  |   items: Array<{ id: string }>
  69  | }
  70  | 
  71  | function apiUrl(path: string): string {
  72  |   const cleanBase = API_BASE_URL.replace(/\/+$/, '')
  73  |   const cleanPath = path.replace(/^\/+/, '')
  74  |   return `${cleanBase}/${cleanPath}`
  75  | }
  76  | 
  77  | export function enableUiFailureGuards(page: Page): void {
  78  |   if (uiFailureGuards.has(page)) {
  79  |     return
  80  |   }
  81  | 
  82  |   const consoleErrors: string[] = []
  83  |   const failedApiRequests: string[] = []
  84  |   const allowedConsoleErrorPatterns: RegExp[] = []
  85  |   const apiBase = API_BASE_URL.replace(/\/+$/, '')
  86  | 
  87  |   const onConsole: UiFailureGuardState['onConsole'] = (message) => {
  88  |     if (message.type() !== 'error') {
  89  |       return
  90  |     }
  91  | 
  92  |     const text = message.text()
  93  |     if (isKnownConsoleBaselineError(text)) {
  94  |       return
  95  |     }
  96  |     if (allowedConsoleErrorPatterns.some((pattern) => pattern.test(text))) {
  97  |       return
  98  |     }
  99  | 
  100 |     const location = message.location()
  101 |     const source = location.url ? `${location.url}:${location.lineNumber ?? 0}:${location.columnNumber ?? 0}` : 'unknown'
  102 |     consoleErrors.push(`${source} :: ${text}`)
  103 |   }
  104 | 
  105 |   const onRequestFailed: UiFailureGuardState['onRequestFailed'] = (request) => {
  106 |     const url = request.url()
  107 |     if (!url.startsWith(apiBase)) {
  108 |       return
  109 |     }
  110 | 
  111 |     const errorText = request.failure()?.errorText ?? 'unknown-error'
  112 |     if (errorText.includes('ERR_ABORTED')) {
  113 |       return
  114 |     }
  115 | 
  116 |     failedApiRequests.push(`${request.method()} ${url} :: ${errorText}`)
  117 |   }
  118 | 
  119 |   page.on('console', onConsole)
  120 |   page.on('requestfailed', onRequestFailed)
  121 |   uiFailureGuards.set(page, {
  122 |     consoleErrors,
  123 |     failedApiRequests,
  124 |     allowedConsoleErrorPatterns,
  125 |     onConsole,
  126 |     onRequestFailed,
  127 |   })
  128 | }
  129 | 
  130 | export async function assertUiFailureGuards(page: Page, options: { failOnIssues?: boolean } = {}): Promise<void> {
  131 |   const state = uiFailureGuards.get(page)
  132 |   if (!state) {
  133 |     return
  134 |   }
  135 | 
  136 |   page.off('console', state.onConsole)
  137 |   page.off('requestfailed', state.onRequestFailed)
  138 |   uiFailureGuards.delete(page)
  139 | 
  140 |   const issues = [
  141 |     ...state.consoleErrors.map((entry) => `console.error ${entry}`),
  142 |     ...state.failedApiRequests.map((entry) => `requestfailed ${entry}`),
  143 |   ]
  144 | 
  145 |   if (issues.length === 0 || options.failOnIssues === false) {
  146 |     return
  147 |   }
  148 | 
> 149 |   expect(issues, `Unexpected UI runtime issues:\n${issues.join('\n')}`).toEqual([])
      |                                                                         ^ Error: Unexpected UI runtime issues:
  150 | }
  151 | 
  152 | export async function sendApiRequest<T>(
  153 |   request: APIRequestContext,
  154 |   path: string,
  155 |   options: {
  156 |     method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  157 |     token?: string
  158 |     body?: unknown
  159 |     expectedStatus?: number
  160 |   } = {},
  161 | ): Promise<T> {
  162 |   const headers: Record<string, string> = { Accept: 'application/json' }
  163 |   if (options.token) {
  164 |     headers.Authorization = `Bearer ${options.token}`
  165 |   }
  166 |   if (options.body !== undefined) {
  167 |     headers['Content-Type'] = 'application/json'
  168 |   }
  169 | 
  170 |   const response = await request.fetch(apiUrl(path), {
  171 |     method: options.method ?? 'GET',
  172 |     headers,
  173 |     data: options.body,
  174 |   })
  175 |   const status = response.status()
  176 | 
  177 |   const raw = await response.text()
  178 |   const payload = raw
  179 |     ? (() => {
  180 |         try {
  181 |           return JSON.parse(raw)
  182 |         } catch {
  183 |           return raw
  184 |         }
  185 |       })()
  186 |     : null
  187 | 
  188 |   if (options.expectedStatus !== undefined && status !== options.expectedStatus) {
  189 |     throw new Error(
  190 |       `API ${options.method ?? 'GET'} ${path} expected ${options.expectedStatus}, got ${status}: ${JSON.stringify(payload)}`,
  191 |     )
  192 |   }
  193 | 
  194 |   if (options.expectedStatus === undefined && !response.ok()) {
  195 |     throw new Error(
  196 |       `API ${options.method ?? 'GET'} ${path} failed with ${status}: ${JSON.stringify(payload)}`,
  197 |     )
  198 |   }
  199 | 
  200 |   return payload as T
  201 | }
  202 | 
  203 | export function uniqueSeed(prefix: string): string {
  204 |   return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  205 | }
  206 | 
  207 | export function uniquePhone(): string {
  208 |   const tail = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`
  209 |   return `+7900${tail}`
  210 | }
  211 | 
  212 | export async function apiLogin(request: APIRequestContext, role: TestRole): Promise<AuthPayload> {
  213 |   const credentials = ROLE_CREDENTIALS[role]
  214 |   return sendApiRequest<AuthPayload>(request, 'auth/login', {
  215 |     method: 'POST',
  216 |     body: credentials,
  217 |   })
  218 | }
  219 | 
  220 | export async function createLeadViaApi(
  221 |   request: APIRequestContext,
  222 |   token: string,
  223 |   overrides: Partial<{
  224 |     contactName: string
  225 |     contactPhone: string
  226 |     equipmentTypeHint: string
  227 |     address: string
  228 |     requestedDate: string
  229 |   }> = {},
  230 | ): Promise<LeadPayload> {
  231 |   const oneDayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000)
  232 | 
  233 |   const response = await sendApiRequest<CreateLeadResult>(request, 'leads', {
  234 |     method: 'POST',
  235 |     token,
  236 |     body: {
  237 |       contactName: overrides.contactName ?? `E2E ${uniqueSeed('lead')}`,
  238 |       contactPhone: overrides.contactPhone ?? uniquePhone(),
  239 |       source: 'manual',
  240 |       equipmentTypeHint: overrides.equipmentTypeHint ?? 'Экскаватор',
  241 |       requestedDate: overrides.requestedDate ?? oneDayAhead.toISOString(),
  242 |       address: overrides.address ?? 'Москва, Тестовая улица, 1',
  243 |       comment: 'Created by Playwright e2e',
  244 |     },
  245 |   })
  246 | 
  247 |   return response.lead
  248 | }
  249 | 
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac-navigation.gwt.spec.ts >> RBAC and Navigation GWT (QA-REQ: 032..035) >> E2E-011 manager is redirected away from direct control routes
- Location: e2e\rbac-navigation.gwt.spec.ts:53:3

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
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - img "Логотип Катет CRM" [ref=e7]
        - generic [ref=e8]: Катет CRM
      - generic [ref=e10]:
        - img
        - textbox "Быстрый поиск" [ref=e11]
        - generic: Ctrl K
      - generic [ref=e12]:
        - button "Уведомления" [ref=e13]:
          - img [ref=e14]
        - button "Помощь" [ref=e17]:
          - img [ref=e18]
        - button "Профиль" [ref=e21]:
          - generic [ref=e22]: MA
          - img [ref=e23]
    - generic [ref=e25]:
      - complementary [ref=e26]:
        - navigation [ref=e29]:
          - button "Главная" [pressed] [ref=e30]:
            - img [ref=e31]
          - button "Продажи" [ref=e35]:
            - img [ref=e36]
          - button "Операции" [ref=e39]:
            - img [ref=e40]
          - button "Клиенты" [ref=e45]:
            - img [ref=e46]
          - button "Справочники" [ref=e51]:
            - img [ref=e52]
      - generic [ref=e56]:
        - complementary [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e60]:
                - img [ref=e61]
                - heading "Главная" [level=2] [ref=e64]
              - generic [ref=e65]:
                - button "Поиск по меню" [ref=e66]:
                  - img [ref=e67]
                - button "Свернуть меню" [ref=e70]:
                  - img [ref=e71]
            - generic [ref=e75]:
              - button "Обзор" [ref=e76]:
                - img [ref=e77]
                - generic [ref=e80]: Обзор
              - button "Мои задачи" [ref=e81]:
                - img [ref=e82]
                - generic [ref=e85]: Мои задачи
              - button "Срочное сегодня" [ref=e86]:
                - img [ref=e87]
                - generic [ref=e89]: Срочное сегодня
              - button "Последние действия" [ref=e90]:
                - img [ref=e91]
                - generic [ref=e93]: Последние действия
              - button "Быстрые переходы" [ref=e94]:
                - img [ref=e95]
                - generic [ref=e100]: Быстрые переходы
            - button "Сообщить о баге" [ref=e102]:
              - img [ref=e103]
              - generic [ref=e112]: Сообщить о баге
        - main [ref=e113]:
          - generic [ref=e114]:
            - heading "Обзор" [level=1] [ref=e117]
            - generic [ref=e120]:
              - generic [ref=e122]:
                - heading "Обзор" [level=2] [ref=e124]
                - paragraph [ref=e125]: Ключевые цифры по воронке и сегодняшние приоритеты
              - generic [ref=e126]:
                - button "Лиды 55" [ref=e127] [cursor=pointer]:
                  - generic [ref=e128]:
                    - img [ref=e130]
                    - generic [ref=e133]: Лиды
                  - generic [ref=e134]: "55"
                - button "Заявки 104" [ref=e135] [cursor=pointer]:
                  - generic [ref=e136]:
                    - img [ref=e138]
                    - generic [ref=e141]: Заявки
                  - generic [ref=e142]: "104"
                - button "Брони 12" [ref=e143] [cursor=pointer]:
                  - generic [ref=e144]:
                    - img [ref=e146]
                    - generic [ref=e150]: Брони
                  - generic [ref=e151]: "12"
                - button "Выезды 0" [ref=e152] [cursor=pointer]:
                  - generic [ref=e153]:
                    - img [ref=e155]
                    - generic [ref=e160]: Выезды
                  - generic [ref=e161]: "0"
                - button "Завершено 32" [ref=e162] [cursor=pointer]:
                  - generic [ref=e163]:
                    - img [ref=e165]
                    - generic [ref=e168]: Завершено
                  - generic [ref=e169]: "32"
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - generic [ref=e174]:
                    - img [ref=e176]
                    - generic [ref=e178]: Требует внимания
                  - list [ref=e180]:
                    - button "Срочные лиды Требуют контакта сегодня 0" [ref=e181] [cursor=pointer]:
                      - img [ref=e183]
                      - generic [ref=e185]:
                        - generic [ref=e186]: Срочные лиды
                        - generic [ref=e187]: Требуют контакта сегодня
                      - generic [ref=e188]: "0"
                    - button "Конфликты броней Пересечения по датам 13" [ref=e189] [cursor=pointer]:
                      - img [ref=e191]
                      - generic [ref=e193]:
                        - generic [ref=e194]: Конфликты броней
                        - generic [ref=e195]: Пересечения по датам
                      - generic [ref=e196]: "13"
                    - button "Выезды сегодня Должны стартовать 5" [ref=e197] [cursor=pointer]:
                      - img [ref=e199]
                      - generic [ref=e204]:
                        - generic [ref=e205]: Выезды сегодня
                        - generic [ref=e206]: Должны стартовать
                      - generic [ref=e207]: "5"
                    - button "Зависшие лиды Без активности > 3 дней 97" [ref=e208] [cursor=pointer]:
                      - img [ref=e210]
                      - generic [ref=e212]:
                        - generic [ref=e213]: Зависшие лиды
                        - generic [ref=e214]: Без активности > 3 дней
                      - generic [ref=e215]: "97"
                - generic [ref=e216]:
                  - generic [ref=e219]:
                    - img [ref=e221]
                    - generic [ref=e223]: Последние действия
                  - list [ref=e225]:
                    - generic [ref=e226]:
                      - img [ref=e228]
                      - generic [ref=e230]:
                        - generic [ref=e231]: Создан лид E2E Manager 011-1779189509206-457
                        - generic [ref=e232]: lead · Manager User
                      - generic [ref=e233]: 16:18
                    - generic [ref=e234]:
                      - img [ref=e236]
                      - generic [ref=e238]:
                        - generic [ref=e239]: "Стадия: lead → application"
                        - generic [ref=e240]: lead · Manager User
                      - generic [ref=e241]: 16:18
                    - generic [ref=e242]:
                      - img [ref=e244]
                      - generic [ref=e246]:
                        - generic [ref=e247]: Создан лид E2E App 003-1779189499437-884
                        - generic [ref=e248]: lead · Manager User
                      - generic [ref=e249]: 16:18
                    - generic [ref=e250]:
                      - img [ref=e252]
                      - generic [ref=e254]:
                        - generic [ref=e255]: Создан лид E2E Lead 001-1779189487651-684
                        - generic [ref=e256]: lead · Manager User
                      - generic [ref=e257]: 16:18
                    - generic [ref=e258]:
                      - img [ref=e260]
                      - generic [ref=e262]:
                        - generic [ref=e263]: Создана бронь для позиции «QA APIC-012 Position»
                        - generic [ref=e264]: application_item · Manager User
                      - generic [ref=e265]: 16:15
                    - generic [ref=e266]:
                      - img [ref=e268]
                      - generic [ref=e270]:
                        - generic [ref=e271]: Добавлена позиция «QA APIC-012 Position» в заявку
                        - generic [ref=e272]: application · Manager User
                      - generic [ref=e273]: 16:15
              - generic [ref=e274]:
                - generic [ref=e277]:
                  - img [ref=e279]
                  - generic [ref=e284]: Быстрые переходы
                - generic [ref=e286]:
                  - button "Лиды" [ref=e287]:
                    - img [ref=e289]
                    - generic [ref=e293]: Лиды
                    - img [ref=e294]
                  - button "Заявки" [ref=e297]:
                    - img [ref=e299]
                    - generic [ref=e303]: Заявки
                    - img [ref=e304]
                  - button "Брони" [ref=e307]:
                    - img [ref=e309]
                    - generic [ref=e314]: Брони
                    - img [ref=e315]
                  - button "Выезды" [ref=e318]:
                    - img [ref=e320]
                    - generic [ref=e326]: Выезды
                    - img [ref=e327]
                  - button "Завершение" [ref=e330]:
                    - img [ref=e332]
                    - generic [ref=e336]: Завершение
                    - img [ref=e337]
                  - button "Клиенты" [ref=e340]:
                    - img [ref=e342]
                    - generic [ref=e348]: Клиенты
                    - img [ref=e349]
  - region "Notifications alt+T"
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
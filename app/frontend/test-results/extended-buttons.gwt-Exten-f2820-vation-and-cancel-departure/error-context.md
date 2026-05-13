# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extended-buttons.gwt.spec.ts >> Extended Buttons GWT (QA-REQ: 025..027, 032) >> E2E-015 departure open reservation and cancel departure
- Location: e2e\extended-buttons.gwt.spec.ts:394:3

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
- generic [active]:
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
              - /placeholder: Поиск по выездам
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
                  - heading [level=1]: Выезды
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
                    - /placeholder: Поиск по выездам
                - combobox:
                  - generic: Все статусы
                  - img
                - combobox:
                  - generic: Все менеджеры
                  - img
                - combobox:
                  - generic: Все типы
                  - img
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - text: Просроченные
                      - generic: "6"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmot09s1b002r588g462g9ccg
                            - generic: QA APIC007-1778008361306-5789 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778008361306-5789 Type
                          - cell: 2026-05-05 · 23:12-01:12
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0aywo002r149l8sb0u8bu
                            - generic: QA APIC007-1778008416880-7627 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778008416880-7627 Type
                          - cell: 2026-05-05 · 23:13-01:13
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0fzaq002rp9pfekm0lfme
                            - generic: QA APIC007-1778008650682-4099 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778008650682-4099 Type
                          - cell: 2026-05-05 · 23:17-01:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0a4od002zntp0uhwfydgf
                            - generic: QA INT005-1778008377739-9308 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA INT005-1778008377739-9308 Type
                          - cell: 2026-05-06 · 00:12-02:12
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0becv002z10n1dvl67i42
                            - generic: QA INT005-1778008436889-2557 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA INT005-1778008436889-2557 Type
                          - cell: 2026-05-06 · 00:13-02:13
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0gdd4002zla1crqfqlpxk
                            - generic: QA INT005-1778008668902-896 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA INT005-1778008668902-896 Type
                          - cell: 2026-05-06 · 00:17-02:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                  - generic:
                    - generic:
                      - text: Скоро
                      - generic: "4"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmou6yb3l002rzg8a4gv8kljd
                            - generic: QA APIC007-1778080049584-9066 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1778080049584-9066 Type
                          - cell: 2026-05-06 · 19:07-21:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6z48x002ryitkpiyclwbh
                            - generic: QA APIC007-1778080087448-4144 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1778080087448-4144 Type
                          - cell: 2026-05-06 · 19:08-21:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6yrxn002ztkwt5mm5nhyc
                            - generic: QA INT005-1778080071419-8697 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA INT005-1778080071419-8697 Type
                          - cell: 2026-05-06 · 20:07-22:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6zaal00aayitkt8r2kjvk
                            - generic: QA INT005-1778080095267-9319 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA INT005-1778080095267-9319 Type
                          - cell: 2026-05-06 · 20:08-22:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                  - generic:
                    - generic:
                      - text: Ожидается
                      - generic: "57"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmolb8o290080nmht8mpbut2a
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-04 · 09:57-17:57
                          - cell: —
                          - cell: Manager User
                          - cell: 6 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmolbnlwa00ienmhtaes9juys
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: RBAC Type 00bafafd updated
                          - cell: 2026-05-04 · 10:09-18:09
                          - cell: —
                          - cell: Manager User
                          - cell: 6 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmolbr04l00sdnmhts4h5wus4
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: RBAC Type 00bafafd updated
                          - cell: 2026-05-04 · 10:11-18:11
                          - cell: —
                          - cell: Manager User
                          - cell: 6 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmolf2u91007ybd33kzxgvrok
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: RBAC Type 00bafafd updated
                          - cell: 2026-05-04 · 11:45-19:45
                          - cell: —
                          - cell: Manager User
                          - cell: 6 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmolpn4ef007yp93r3dfxeg21
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: RBAC Type 00bafafd updated
                          - cell: 2026-05-04 · 16:40-00:40
                          - cell: —
                          - cell: Manager User
                          - cell: 5 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmolqevjo00m7p93rtikn6jk1
                            - generic: manager LLC
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: RBAC Type 00bafafd updated
                          - cell: 2026-05-04 · 17:02-01:02
                          - cell: —
                          - cell: Manager User
                          - cell: 5 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmot09s9r003h588gppmc1rr1
                            - generic: QA APIC008-1778008361671-9738 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778008361671-9738 Type
                          - cell: 2026-05-06 · 00:12-02:12
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0az5o003h149l1k2aiqgz
                            - generic: QA APIC008-1778008417234-8907 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778008417234-8907 Type
                          - cell: 2026-05-06 · 00:13-02:13
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0fzix003hp9pfv3nese7j
                            - generic: QA APIC008-1778008651020-5476 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778008651020-5476 Type
                          - cell: 2026-05-06 · 00:17-02:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot09snd004g588guyd0jln6
                            - generic: QA APIC009-1778008362170-529 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778008362170-529 Type
                          - cell: 2026-05-06 · 01:12-03:12
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0azot0058149lkzwphoar
                            - generic: QA APIC009-1778008417949-4092 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778008417949-4092 Type
                          - cell: 2026-05-06 · 01:13-03:13
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0g00c0058p9pfofg3h2r3
                            - generic: QA APIC009-1778008651649-9823 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778008651649-9823 Type
                          - cell: 2026-05-06 · 01:17-03:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0gdl8003pla1ccm876ass
                            - generic: QA INT006-1778008669242-9931 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT006-1778008669242-9931 Type
                          - cell: 2026-05-06 · 01:17-03:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0g0vk006ep9pfesvslgc0
                            - generic: QA APIC010-1778008652198-3321 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778008652198-3321 Type
                          - cell: 2026-05-06 · 02:17-04:37
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0gdym004wla1c7rvdf7gs
                            - generic: QA INT007-1778008669671-6516 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT007-1778008669671-6516 Type
                          - cell: 2026-05-06 · 02:17-04:17
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0azfs004g149lt7ylzko6
                            - generic: QA APIC008CANCEL-1778008417588-9816 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778008417588-9816 Type
                          - cell: 2026-05-06 · 03:33-05:33
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0fzri004gp9pf7u0pis84
                            - generic: QA APIC008CANCEL-1778008651326-4386 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778008651326-4386 Type
                          - cell: 2026-05-06 · 03:37-05:37
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0ge9q005vla1ccyekrmp4
                            - generic: QA INT008-1778008670137-350 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT008-1778008670137-350 Type
                          - cell: 2026-05-06 · 03:37-05:37
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot0geky006yla1cmzbsj6yp
                            - generic: QA INT009-1778008670547-2432 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT009-1778008670547-2432 Type
                          - cell: 2026-05-06 · 04:37-06:57
                          - cell: —
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ybc7003hzg8a9jwqnb7v
                            - generic: QA APIC008-1778080049982-7439 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778080049982-7439 Type
                          - cell: 2026-05-06 · 20:07-22:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6z4gm003hyitkql4bcrp8
                            - generic: QA APIC008-1778080087716-1091 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778080087716-1091 Type
                          - cell: 2026-05-06 · 20:08-22:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ycfc0058zg8aw80aflle
                            - generic: QA APIC009-1778080050823-9950 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778080050823-9950 Type
                          - cell: 2026-05-06 · 21:07-23:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ys8t003ptkwtwyb6dx3f
                            - generic: QA INT006-1778080071820-3886 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT006-1778080071820-3886 Type
                          - cell: 2026-05-06 · 21:07-23:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6z4v50058yitkv2xvm4mw
                            - generic: QA APIC009-1778080088284-501 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778080088284-501 Type
                          - cell: 2026-05-06 · 21:08-23:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6zai500b0yitk3vc3bqaw
                            - generic: QA INT006-1778080095585-1411 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT006-1778080095585-1411 Type
                          - cell: 2026-05-06 · 21:08-23:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6yd2q006ezg8a578ycwhq
                            - generic: QA APIC010-1778080052176-5675 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778080052176-5675 Type
                          - cell: 2026-05-06 · 22:07-00:27
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ysri004wtkwtn95pqafu
                            - generic: QA INT007-1778080072479-9196 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT007-1778080072479-9196 Type
                          - cell: 2026-05-06 · 22:07-00:07
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6z56l006eyitk1bu3vxxu
                            - generic: QA APIC010-1778080088726-1443 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778080088726-1443 Type
                          - cell: 2026-05-06 · 22:08-00:28
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6zatj00c7yitkmvtapyfp
                            - generic: QA INT007-1778080095991-7623 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT007-1778080095991-7623 Type
                          - cell: 2026-05-06 · 22:08-00:08
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ybp4004gzg8abff4pp3a
                            - generic: QA APIC008CANCEL-1778080050358-9220 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778080050358-9220 Type
                          - cell: 2026-05-06 · 23:27-01:27
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6z4ne004gyitk6yu8rjoc
                            - generic: QA APIC008CANCEL-1778080088035-5005 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778080088035-5005 Type
                          - cell: 2026-05-06 · 23:28-01:28
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6yt56005vtkwtwydkpeko
                            - generic: QA INT008-1778080073062-8572 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT008-1778080073062-8572 Type
                          - cell: 2026-05-06 · 23:27-01:27
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6zb5k00d6yitk9xid2f8k
                            - generic: QA INT008-1778080096402-1417 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT008-1778080096402-1417 Type
                          - cell: 2026-05-06 · 23:28-01:28
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6ythp006ytkwtw110tunm
                            - generic: QA INT009-1778080073529-7524 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT009-1778080073529-7524 Type
                          - cell: 2026-05-07 · 00:27-02:47
                          - cell: —
                          - cell: Manager User
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou6zbge00e9yitk1l8u6p7t
                            - generic: QA INT009-1778080096824-4996 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT009-1778080096824-4996 Type
                          - cell: 2026-05-07 · 00:28-02:48
                          - cell: —
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou71ah60020dd4ba7ju1x9p
                            - generic: E2E 015 015-1778080188534-336
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 37
                          - cell: Manager User
                          - cell: только что
                        - row:
                          - cell:
                            - generic: DEP-cmot1oi3b009hrcnu15ewbw45
                            - generic: E2E 006 006-1778010724306-803
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 66
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2093e002ykcyd2iesnxtj
                            - generic: E2E 006 006-1778011273043-743
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 56
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot22ym4002yfnob64mql1jv
                            - generic: E2E 006 006-1778011399225-85
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 51
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot29u2e002yizc0nx8bvm7p
                            - generic: E2E 006 006-1778011720058-402
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 10
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2ozei002y2ux0jq4cq7kl
                            - generic: E2E 006 006-1778012425233-183
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 90
                          - cell: Manager User
                          - cell: 18 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot1mgwl0053rcnu1o6xy6mh
                            - generic: E2E 007 007-1778010633005-288
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 76
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot1oitf00a6rcnu44o9hwbg
                            - generic: E2E 007 007-1778010728857-431
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 49
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot209vm003nkcyd45dx5hbm
                            - generic: E2E 007 007-1778011277143-630
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 11
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot22zc1003nfnobklhz096c
                            - generic: E2E 007 007-1778011403421-635
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 83
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot29ute003nizc0yurmuibd
                            - generic: E2E 007 007-1778011724187-87
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 50
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2p0f1003n2ux0tf83hkxa
                            - generic: E2E 007 007-1778012431203-974
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 47
                          - cell: Manager User
                          - cell: 18 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot1mke7005zrcnuc7i5nems
                            - generic: E2E 008 008-1778010637614-688
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 55
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot1om6900b2rcnuvlstcr21
                            - generic: E2E 008 008-1778010733146-638
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 84
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot20cw1004jkcydl0fehu0s
                            - generic: E2E 008 008-1778011281065-379
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 88
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot232eh004jfnobhshahch4
                            - generic: E2E 008 008-1778011407425-206
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 17
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot29xrh004jizc0awgoe5wk
                            - generic: E2E 008 008-1778011728026-804
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 88
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2p3ze004j2ux05303tcdc
                            - generic: E2E 008 008-1778012435845-220
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 12
                          - cell: Manager User
                          - cell: 18 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot238av005mfnobfjaw0h07
                            - generic: E2E 009 009-1778011411284-878
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 12
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2apbr005uizc002vx6ccu
                            - generic: E2E 009 009-1778011760331-964
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 77
                          - cell: Manager User
                          - cell: 19 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2ksp9001a12gv5qq1watm
                            - generic: E2E 009 009-1778012230575-867
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 96
                          - cell: Manager User
                          - cell: 18 ч назад
                        - row:
                          - cell:
                            - generic: DEP-cmot2pxpg005u2ux0ut5u9ymj
                            - generic: E2E 009 009-1778012468358-109
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-06 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 66
                          - cell: Manager User
                          - cell: 18 ч назад
    - region "Notifications alt+T"
  - dialog [ref=e2]:
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
            - generic [ref=e19]: Выезд
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
            - button "Выезд" [ref=e47]:
              - img [ref=e48]
              - generic [ref=e53]: Выезд
              - img [ref=e54]
            - generic [ref=e56]:
              - heading "DEP-CMOU71AH" [level=1] [ref=e57]
              - generic [ref=e58]:
                - generic [ref=e59]:
                  - button "Выезд отменен" [disabled]:
                    - text: Выезд отменен
                    - img
                - generic [ref=e60]:
                  - button "Отменить выезд" [disabled]
            - generic [ref=e61]:
              - button "APP-000217" [ref=e62]
              - text: ·
              - button "E2E 015 015-1778080188534-336" [ref=e63]
              - text: · E2E 015-item
            - generic [ref=e64]:
              - generic [ref=e66]: Отменен
              - generic [ref=e68]:
                - img [ref=e69]
                - generic [ref=e71]: 09.05.2026
              - generic [ref=e73]:
                - img [ref=e74]
                - generic [ref=e77]: Manager User
          - generic [ref=e78]:
            - img [ref=e79]
            - generic [ref=e81]: "Следующий шаг: Выезд отменен"
            - generic [ref=e82]: · E2E-015 cancel reason 015-cancel-1778080194881-880
          - generic [ref=e83]:
            - heading "План и факт" [level=3] [ref=e85]
            - generic [ref=e87]:
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - img [ref=e91]
                  - generic [ref=e95]: Клиент
                - button "E2E 015 015-1778080188534-336" [ref=e97] [cursor=pointer]
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - img [ref=e101]
                  - generic [ref=e104]: Менеджер
                - generic [ref=e105]: Manager User
              - generic [ref=e106]:
                - generic [ref=e107]:
                  - img [ref=e109]
                  - generic [ref=e114]: Позиция
                - generic [ref=e115]: E2E 015-item
              - generic [ref=e116]:
                - generic [ref=e117]:
                  - img [ref=e119]
                  - generic [ref=e124]: Техника
                - generic [ref=e125]: Бетононасос
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - img [ref=e129]
                  - generic [ref=e132]: Адрес
                - generic [ref=e133]: Москва, Тестовая улица, 37
              - generic [ref=e134]:
                - generic [ref=e135]:
                  - img [ref=e137]
                  - generic [ref=e139]: План дата
                - generic [ref=e140]: 2026-05-07T15:09:48.700Z
              - generic [ref=e141]:
                - generic [ref=e142]:
                  - img [ref=e144]
                  - generic [ref=e147]: План окно
                - generic [ref=e148]: 10:00-14:00
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - img [ref=e152]
                  - generic [ref=e155]: Старт
                - generic [ref=e156]: —
              - generic [ref=e157]:
                - generic [ref=e158]:
                  - img [ref=e160]
                  - generic [ref=e163]: Прибытие
                - generic [ref=e164]: —
              - generic [ref=e165]:
                - generic [ref=e166]:
                  - img [ref=e168]
                  - generic [ref=e171]: Завершение
                - generic [ref=e172]: —
              - generic [ref=e173]:
                - generic [ref=e174]:
                  - img [ref=e176]
                  - generic [ref=e180]: Отмена
                - generic [ref=e181]: 06.05.2026, 20:09
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - img [ref=e185]
                  - generic [ref=e188]: Причина отмены
                - generic [ref=e189]: E2E-015 cancel reason 015-cancel-1778080194881-880
          - generic [ref=e190]:
            - heading "Управление этапом" [level=3] [ref=e192]
            - generic [ref=e194]:
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - img [ref=e197]
                  - generic [ref=e199]:
                    - generic [ref=e200]: Старт выезда
                    - generic [ref=e201]: —
                - generic [ref=e202]:
                  - img [ref=e203]
                  - generic [ref=e205]:
                    - generic [ref=e206]: Прибытие
                    - generic [ref=e207]: —
                - generic [ref=e208]:
                  - img [ref=e209]
                  - generic [ref=e211]:
                    - generic [ref=e212]: Итог
                    - generic [ref=e213]: —
              - generic [ref=e214]:
                - generic [ref=e217]:
                  - generic [ref=e218]: Состояние этапа
                  - generic [ref=e219]: Отменен
                  - generic [ref=e220]: Выезд отменен. Новые переходы по этапу недоступны.
                  - generic [ref=e221]:
                    - img [ref=e222]
                    - text: E2E-015 cancel reason 015-cancel-1778080194881-880
                - generic [ref=e224]:
                  - generic [ref=e226]:
                    - generic [ref=e227]: Финальный исход
                    - generic [ref=e228]: Закройте выезд результатом работ
                  - generic [ref=e229]:
                    - button "Выполнен" [disabled]:
                      - img
                      - text: Выполнен
                    - button "Некачественный" [disabled]:
                      - img
                      - text: Некачественный
              - generic [ref=e230]:
                - textbox "Комментарий к итогу выезда" [ref=e231]
                - generic [ref=e233]: "Для выполненного: Отмененный выезд нельзя завершить"
          - generic [ref=e234]:
            - button "Открыть бронь" [ref=e235]:
              - img [ref=e237]
              - text: Открыть бронь
            - button "Открыть заявку" [ref=e241]:
              - img [ref=e243]
              - text: Открыть заявку
            - button "Открыть лид" [ref=e246]:
              - img [ref=e248]
              - text: Открыть лид
            - button "Открыть клиента" [ref=e251]:
              - img [ref=e253]
              - text: Открыть клиента
        - complementary [ref=e257]:
          - generic [ref=e258]:
            - button "Сводка" [ref=e260]:
              - img [ref=e261]
              - generic [ref=e263]: Сводка
            - generic [ref=e264]:
              - generic [ref=e265]:
                - generic [ref=e266]: Статус
                - generic [ref=e268]: Отменен
              - generic [ref=e269]:
                - generic [ref=e270]: План
                - generic [ref=e271]: 09.05.2026, 21:09
              - generic [ref=e272]:
                - generic [ref=e273]: Старт
                - generic [ref=e274]: —
              - generic [ref=e275]:
                - generic [ref=e276]: Прибытие
                - generic [ref=e277]: —
              - generic [ref=e278]:
                - generic [ref=e279]: Завершен
                - generic [ref=e280]: —
              - generic [ref=e281]:
                - generic [ref=e282]: Алерт
                - generic [ref=e283]: Нет
          - generic [ref=e284]:
            - button "Связанные записи" [ref=e286]:
              - img [ref=e287]
              - generic [ref=e289]: Связанные записи
            - generic [ref=e290]:
              - generic [ref=e291]:
                - generic [ref=e292]: Лид
                - button "LEAD-CMOU71A5" [ref=e294] [cursor=pointer]
              - generic [ref=e295]:
                - generic [ref=e296]: Заявка
                - button "APP-000217" [ref=e298] [cursor=pointer]
              - generic [ref=e299]:
                - generic [ref=e300]: Бронь
                - button "RSV-CMOU71AC" [ref=e302] [cursor=pointer]
              - generic [ref=e303]:
                - generic [ref=e304]: Выезд
                - button "DEP-CMOU71AH" [ref=e306] [cursor=pointer]
              - generic [ref=e307]:
                - generic [ref=e308]: Завершение
                - button "—" [disabled] [ref=e310]
          - button "Быстрые действия" [ref=e313]:
            - img [ref=e314]
            - generic [ref=e316]: Быстрые действия
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
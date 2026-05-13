# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: terminal-branch.gwt.spec.ts >> Terminal Branch GWT (QA-REQ: 025..027) >> E2E-009 unqualified branch behavior
- Location: e2e\terminal-branch.gwt.spec.ts:113:3

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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
                  - generic:
                    - generic:
                      - text: Ожидается
                      - generic: "63"
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 4 мин назад
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
                          - cell: 3 мин назад
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
                          - cell: 2 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou71hr6002rdd4bqpn7xbjk
                            - generic: E2E 016 016-1778080198119-30
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 12
                          - cell: Manager User
                          - cell: 1 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmou71noq003tdd4b09y4p3ky
                            - generic: E2E 017 017-1778080205601-216
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 73
                          - cell: Manager User
                          - cell: 1 мин назад
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
                            - generic: DEP-cmou72zh3006zdd4bryd4b6d6
                            - generic: E2E 006 006-1778080263574-992
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 39
                          - cell: Manager User
                          - cell: только что
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
                            - generic: DEP-cmou731kf007odd4busz4wrr8
                            - generic: E2E 007 007-1778080270577-546
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 74
                          - cell: Manager User
                          - cell: только что
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
                            - generic: DEP-cmou735nd008kdd4br47sskm1
                            - generic: E2E 008 008-1778080275898-298
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 78
                          - cell: Manager User
                          - cell: только что
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
                        - row:
                          - cell:
                            - generic: DEP-cmou741im009vdd4bgryg2r1b
                            - generic: E2E 009 009-1778080313994-207
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: Бетононасос
                          - cell: 2026-05-07 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 87
                          - cell: Manager User
                          - cell: только что
    - region "Notifications alt+T"
  - dialog:
    - generic:
      - generic:
        - generic:
          - generic:
            - button:
              - img
              - generic: CRM
            - generic:
              - img
              - button:
                - generic: Операции
            - generic:
              - img
              - generic:
                - generic: Выезд
        - generic:
          - button:
            - img
          - button:
            - img
          - button:
            - img
          - button:
            - img
      - generic:
        - generic:
          - generic:
            - generic:
              - banner:
                - button:
                  - img
                  - generic: Выезд
                  - img
                - generic:
                  - heading [level=1]: DEP-CMOU741I
                  - generic:
                    - generic:
                      - button [disabled]:
                        - text: Выезд отменен
                        - img
                    - generic:
                      - button [disabled]: Отменить выезд
                - generic:
                  - button: APP-000226
                  - text: ·
                  - button: E2E 009 009-1778080313994-207
                  - text: · E2E 009-item
                - generic:
                  - generic:
                    - generic: Отменен
                  - generic:
                    - generic:
                      - img
                      - generic: 13.05.2026
                  - generic:
                    - generic:
                      - img
                      - generic: Manager User
              - generic:
                - img
                - generic: "Следующий шаг: Выезд отменен"
                - generic: · E2E-009 unqualified reason 009-1778080314089-68
              - generic:
                - generic:
                  - heading [level=3]: План и факт
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Клиент
                      - generic:
                        - button: E2E 009 009-1778080313994-207
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Менеджер
                      - generic: Manager User
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Позиция
                      - generic: E2E 009-item
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Техника
                      - generic: Бетононасос
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Адрес
                      - generic: Москва, Тестовая улица, 87
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: План дата
                      - generic: 2026-05-07T15:11:56.357Z
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: План окно
                      - generic: 10:00-14:00
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Старт
                      - generic: —
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Прибытие
                      - generic: —
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Завершение
                      - generic: —
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Отмена
                      - generic: 06.05.2026, 20:11
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Причина отмены
                      - generic: E2E-009 unqualified reason 009-1778080314089-68
              - generic:
                - generic:
                  - heading [level=3]: Управление этапом
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - img
                        - generic:
                          - generic: Старт выезда
                          - generic: —
                      - generic:
                        - img
                        - generic:
                          - generic: Прибытие
                          - generic: —
                      - generic:
                        - img
                        - generic:
                          - generic: Итог
                          - generic: —
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - generic: Состояние этапа
                            - generic: Отменен
                            - generic: Выезд отменен. Новые переходы по этапу недоступны.
                            - generic:
                              - img
                              - text: E2E-009 unqualified reason 009-1778080314089-68
                      - generic:
                        - generic:
                          - generic:
                            - generic: Финальный исход
                            - generic: Закройте выезд результатом работ
                          - button:
                            - img
                            - text: Открыть
                        - generic: "Завершение уже создано: некачественно · 06.05.2026, 20:11"
              - generic:
                - button:
                  - generic:
                    - img
                  - text: Открыть бронь
                - button:
                  - generic:
                    - img
                  - text: Открыть заявку
                - button:
                  - generic:
                    - img
                  - text: Открыть лид
                - button:
                  - generic:
                    - img
                  - text: Открыть клиента
        - complementary:
          - generic:
            - generic:
              - button:
                - img
                - generic: Сводка
            - generic:
              - generic:
                - generic: Статус
                - generic:
                  - generic: Отменен
              - generic:
                - generic: План
                - generic: 13.05.2026, 21:11
              - generic:
                - generic: Старт
                - generic: —
              - generic:
                - generic: Прибытие
                - generic: —
              - generic:
                - generic: Завершен
                - generic: —
              - generic:
                - generic: Алерт
                - generic: Нет
          - generic:
            - generic:
              - button:
                - img
                - generic: Связанные записи
            - generic:
              - generic:
                - generic: Лид
                - generic:
                  - button: LEAD-CMOU73YX
              - generic:
                - generic: Заявка
                - generic:
                  - button: APP-000226
              - generic:
                - generic: Бронь
                - generic:
                  - button: RSV-CMOU740S
              - generic:
                - generic: Выезд
                - generic:
                  - button: DEP-CMOU741I
              - generic:
                - generic: Завершение
                - generic:
                  - button: CMP-CMOU7422
          - generic:
            - generic:
              - button:
                - img
                - generic: Быстрые действия
  - dialog [active] [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e7]:
          - button "CRM" [ref=e8]:
            - img [ref=e9]
            - generic [ref=e10]: CRM
          - generic [ref=e11]:
            - img [ref=e12]
            - button "Операции" [ref=e14]:
              - generic [ref=e15]: Операции
          - generic [ref=e16]:
            - img [ref=e17]
            - generic [ref=e20]: Завершение
        - generic [ref=e21]:
          - button "Поделиться" [ref=e22]:
            - img [ref=e23]
          - button "Следить за карточкой" [ref=e29]:
            - img [ref=e30]
          - button "Ещё действия" [ref=e33]:
            - img [ref=e34]
          - button [ref=e39]:
            - img [ref=e40]
      - generic [ref=e43]:
        - generic [ref=e46]:
          - banner [ref=e47]:
            - button "Завершение" [ref=e48]:
              - img [ref=e49]
              - generic [ref=e52]: Завершение
              - img [ref=e53]
            - generic [ref=e55]:
              - heading "CMP-CMOU7422" [level=1] [ref=e56]
              - button "Открыть выезд" [ref=e59]:
                - img
                - text: Открыть выезд
            - generic [ref=e60]:
              - button "DEP-CMOU741I" [ref=e61]
              - text: ·
              - button "APP-000226" [ref=e62]
              - text: ·
              - button "E2E 009 009-1778080313994-207" [ref=e63]
            - generic [ref=e64]:
              - generic [ref=e66]:
                - img [ref=e67]
                - generic [ref=e70]: Manager User
              - generic [ref=e72]:
                - img [ref=e73]
                - generic [ref=e76]: E2E 009-item
          - generic [ref=e77]:
            - img [ref=e78]
            - generic [ref=e80]: "Следующий шаг: Сохранить комментарий"
          - generic [ref=e81]:
            - heading "Итог завершения" [level=3] [ref=e83]
            - generic [ref=e84]:
              - generic [ref=e85]:
                - generic [ref=e86]:
                  - generic [ref=e87]:
                    - img [ref=e89]
                    - generic [ref=e92]: Исход
                  - generic [ref=e93]: Некачественный
                - generic [ref=e94]:
                  - generic [ref=e95]:
                    - img [ref=e97]
                    - generic [ref=e100]: Дата
                  - generic [ref=e101]: 06.05.2026, 20:11
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - img [ref=e105]
                    - generic [ref=e108]: Менеджер
                  - generic [ref=e109]: Manager User
                - generic [ref=e110]:
                  - generic [ref=e111]:
                    - img [ref=e113]
                    - generic [ref=e116]: Позиция
                  - generic [ref=e117]: E2E 009-item
              - textbox "Комментарий по завершению" [ref=e118]: E2E-009 unqualified reason 009-1778080314089-68
              - textbox "Причина некачественного завершения" [ref=e119]: E2E-009 unqualified reason 009-1778080314089-68
              - button "Сохранить комментарий" [ref=e121]
          - generic [ref=e122]:
            - heading "Контекст" [level=3] [ref=e124]
            - generic [ref=e126]:
              - generic [ref=e127]:
                - generic [ref=e128]:
                  - img [ref=e130]
                  - generic [ref=e132]: Дата и окно
                - generic [ref=e134]: 2026-05-07 · 10:00-14:00
              - generic [ref=e135]:
                - generic [ref=e136]:
                  - img [ref=e138]
                  - generic [ref=e141]: Адрес
                - generic [ref=e142]: Москва, Тестовая улица, 87
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - img [ref=e146]
                  - generic [ref=e150]: Клиент
                - button "E2E 009 009-1778080313994-207" [ref=e152]
              - generic [ref=e153]:
                - generic [ref=e154]:
                  - img [ref=e156]
                  - generic [ref=e159]: Менеджер
                - generic [ref=e160]: Manager User
          - generic [ref=e161]:
            - button "Открыть выезд" [ref=e162]:
              - img [ref=e164]
              - text: Открыть выезд
            - button "Открыть бронь" [ref=e168]:
              - img [ref=e170]
              - text: Открыть бронь
            - button "Открыть заявку" [ref=e173]:
              - img [ref=e175]
              - text: Открыть заявку
            - button "Открыть лид" [ref=e178]:
              - img [ref=e180]
              - text: Открыть лид
            - button "Открыть клиента" [ref=e183]:
              - img [ref=e185]
              - text: Открыть клиента
        - complementary [ref=e189]:
          - generic [ref=e190]:
            - button "Сводка" [ref=e192]:
              - img [ref=e193]
              - generic [ref=e195]: Сводка
            - generic [ref=e196]:
              - generic [ref=e197]:
                - generic [ref=e198]: Статус
                - generic [ref=e200]: Некачественный
              - generic [ref=e201]:
                - generic [ref=e202]: Дата
                - generic [ref=e203]: 06.05.2026, 20:11
              - generic [ref=e204]:
                - generic [ref=e205]: Менеджер
                - generic [ref=e206]: Manager User
          - generic [ref=e207]:
            - button "Связанные записи" [ref=e209]:
              - img [ref=e210]
              - generic [ref=e212]: Связанные записи
            - generic [ref=e213]:
              - generic [ref=e214]:
                - generic [ref=e215]: Лид
                - button "LEAD-CMOU73YX" [ref=e217] [cursor=pointer]
              - generic [ref=e218]:
                - generic [ref=e219]: Заявка
                - button "APP-000226" [ref=e221] [cursor=pointer]
              - generic [ref=e222]:
                - generic [ref=e223]: Бронь
                - button "RSV-CMOU740S" [ref=e225] [cursor=pointer]
              - generic [ref=e226]:
                - generic [ref=e227]: Выезд
                - button "DEP-CMOU741I" [ref=e229] [cursor=pointer]
              - generic [ref=e230]:
                - generic [ref=e231]: Завершение
                - button "CMP-CMOU7422" [ref=e233] [cursor=pointer]
              - generic [ref=e234]:
                - generic [ref=e235]: Клиент
                - button "E2E 009 009-1778080313994-207" [ref=e237] [cursor=pointer]
          - button "Быстрые действия" [ref=e240]:
            - img [ref=e241]
            - generic [ref=e243]: Быстрые действия
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
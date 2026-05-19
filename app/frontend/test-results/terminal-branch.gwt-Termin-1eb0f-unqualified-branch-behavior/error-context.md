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
          - generic:
            - img
          - generic: Катет CRM
        - generic:
          - generic:
            - img
            - textbox:
              - /placeholder: Поиск по выездам
            - generic: Ctrl K
        - generic:
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
                  - generic: Сообщить о баге
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
                      - generic: "8"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmou0wo4h002zopdi25s8r5c6
                            - generic: QA INT005-1778069895475-2699 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA INT005-1778069895475-2699 Type
                          - cell: 2026-05-06 · 17:18-19:18
                          - cell: —
                          - cell: Manager User
                          - cell: 5 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5eq6us00561pfpii3x9g8a
                            - generic: QA APIC007-1778758235794-4607 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778758235794-4607 Type
                          - cell: 2026-05-14 · 15:30-17:30
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f1qw70056959abocxs46p
                            - generic: QA APIC007-1778758774995-5265 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778758774995-5265 Type
                          - cell: 2026-05-14 · 15:39-17:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f28vg0056twchb1vhswdv
                            - generic: QA APIC007-1778758798295-8188 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778758798295-8188 Type
                          - cell: 2026-05-14 · 15:39-17:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f3b3b005614jbk7udfks5
                            - generic: QA APIC007-1778758847851-42 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778758847851-42 Type
                          - cell: 2026-05-14 · 15:40-17:40
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5fjcfh0056dpp9v8a581to
                            - generic: QA APIC007-1778759596054-5075 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778759596054-5075 Type
                          - cell: 2026-05-14 · 15:53-17:53
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hhifk00567ojela3aw4zp
                            - generic: QA APIC007-1778762869755-1931 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778762869755-1931 Type
                          - cell: 2026-05-14 · 16:47-18:47
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hixl00056d2p4n0spx6ig
                            - generic: QA APIC007-1778762936058-6587 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Просрочен
                          - cell: QA APIC007-1778762936058-6587 Type
                          - cell: 2026-05-14 · 16:48-18:48
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                  - generic:
                    - generic:
                      - text: Скоро
                      - generic: "5"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmpcj49re00568pgxmncvvzqg
                            - generic: QA APIC007-1779188874467-7071 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1779188874467-7071 Type
                          - cell: 2026-05-19 · 15:07-17:07
                          - cell: —
                          - cell: Manager User
                          - cell: 10 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj5yjb0056rbohv9quuwwv
                            - generic: QA APIC007-1779188953254-3471 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1779188953254-3471 Type
                          - cell: 2026-05-19 · 15:09-17:09
                          - cell: —
                          - cell: Manager User
                          - cell: 9 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjauvh00521mmf33sumal1
                            - generic: QA APIC007-1779189181747-1354 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1779189181747-1354 Type
                          - cell: 2026-05-19 · 15:13-17:13
                          - cell: —
                          - cell: Manager User
                          - cell: 5 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjc5kq0052qzen87yixg6s
                            - generic: QA APIC007-1779189242303-3782 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1779189242303-3782 Type
                          - cell: 2026-05-19 · 15:14-17:14
                          - cell: —
                          - cell: Manager User
                          - cell: 4 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjdo5k005213xeqlja5p78
                            - generic: QA APIC007-1779189313061-9597 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Скоро
                          - cell: QA APIC007-1779189313061-9597 Type
                          - cell: 2026-05-19 · 15:15-17:15
                          - cell: —
                          - cell: Manager User
                          - cell: 3 мин назад
                  - generic:
                    - generic:
                      - text: Ожидается
                      - generic: "53"
                    - table:
                      - rowgroup:
                        - row:
                          - cell:
                            - generic: DEP-cmou0wodt003popdi5hk9mzls
                            - generic: QA INT006-1778069895868-9866 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT006-1778069895868-9866 Type
                          - cell: 2026-05-06 · 18:18-20:18
                          - cell: —
                          - cell: Manager User
                          - cell: 12 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmou0wotn004wopdifwzt93hf
                            - generic: QA INT007-1778069896375-9613 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT007-1778069896375-9613 Type
                          - cell: 2026-05-06 · 19:18-21:18
                          - cell: —
                          - cell: Manager User
                          - cell: 12 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmou0wpb4005vopdijliuwx5k
                            - generic: QA INT008-1778069896946-4908 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT008-1778069896946-4908 Type
                          - cell: 2026-05-06 · 20:38-22:38
                          - cell: —
                          - cell: Manager User
                          - cell: 12 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmou0wppb006yopdii3nz75rb
                            - generic: QA INT009-1778069897587-8915 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA INT009-1778069897587-8915 Type
                          - cell: 2026-05-06 · 21:38-23:58
                          - cell: —
                          - cell: Manager User
                          - cell: 12 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5eq72b005w1pfp30zo38qz
                            - generic: QA APIC008-1778758236092-5431 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778758236092-5431 Type
                          - cell: 2026-05-14 · 16:30-18:30
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f1r2f005w959a4brbu4gg
                            - generic: QA APIC008-1778758775255-9350 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778758775255-9350 Type
                          - cell: 2026-05-14 · 16:39-18:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f291f005wtwchq8dmyctz
                            - generic: QA APIC008-1778758798552-3549 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778758798552-3549 Type
                          - cell: 2026-05-14 · 16:39-18:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f3b8s005w14jb2p9f6ti4
                            - generic: QA APIC008-1778758848075-9989 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778758848075-9989 Type
                          - cell: 2026-05-14 · 16:40-18:40
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5fjclo005wdpp9pgno12mu
                            - generic: QA APIC008-1778759596326-8110 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778759596326-8110 Type
                          - cell: 2026-05-14 · 16:53-18:53
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5eq7he007n1pfpble7krtk
                            - generic: QA APIC009-1778758236647-5304 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778758236647-5304 Type
                          - cell: 2026-05-14 · 17:30-19:30
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f1rgd007n959a8azbom5r
                            - generic: QA APIC009-1778758775757-8923 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778758775757-8923 Type
                          - cell: 2026-05-14 · 17:39-19:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f29e7007ntwchakfq2yy4
                            - generic: QA APIC009-1778758799015-2954 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778758799015-2954 Type
                          - cell: 2026-05-14 · 17:39-19:39
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f3bkb007n14jb9pozzvad
                            - generic: QA APIC009-1778758848497-3781 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778758848497-3781 Type
                          - cell: 2026-05-14 · 17:40-19:40
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hhilv005w7ojet3jzqp44
                            - generic: QA APIC008-1778762870015-7303 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778762870015-7303 Type
                          - cell: 2026-05-14 · 17:47-19:47
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hixrg005wd2p4t7jhxc4l
                            - generic: QA APIC008-1778762936310-2704 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1778762936310-2704 Type
                          - cell: 2026-05-14 · 17:48-19:48
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5fjcyi007ndpp9h5sjk0oi
                            - generic: QA APIC009-1778759596781-9843 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778759596781-9843 Type
                          - cell: 2026-05-14 · 17:53-19:53
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5eq7sw008t1pfpuzdgys6b
                            - generic: QA APIC010-1778758237037-9855 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778758237037-9855 Type
                          - cell: 2026-05-14 · 18:30-20:50
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f1rqc008t959asixql59t
                            - generic: QA APIC010-1778758776122-4960 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778758776122-4960 Type
                          - cell: 2026-05-14 · 18:39-20:59
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f29ol008ttwcheznsyd9c
                            - generic: QA APIC010-1778758799387-1302 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778758799387-1302 Type
                          - cell: 2026-05-14 · 18:39-20:59
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f3bu8008t14jbbmdspxte
                            - generic: QA APIC010-1778758848837-5246 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778758848837-5246 Type
                          - cell: 2026-05-14 · 18:40-21:00
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hhiyp007n7ojepo6t2fk2
                            - generic: QA APIC009-1778762870493-7546 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778762870493-7546 Type
                          - cell: 2026-05-14 · 18:47-20:47
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hiy2v007nd2p4ussa5exs
                            - generic: QA APIC009-1778762936750-1413 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1778762936750-1413 Type
                          - cell: 2026-05-14 · 18:48-20:48
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5fjd8b008tdpp9b9pf7j9o
                            - generic: QA APIC010-1778759597142-7691 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778759597142-7691 Type
                          - cell: 2026-05-14 · 18:53-21:13
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5eq79n006v1pfpxy8nmkhf
                            - generic: QA APIC008CANCEL-1778758236363-1995 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778758236363-1995 Type
                          - cell: 2026-05-14 · 19:50-21:50
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hhj7y008t7ojehmnmh1wb
                            - generic: QA APIC010-1778762870822-958 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778762870822-958 Type
                          - cell: 2026-05-14 · 19:47-22:07
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hiyba008td2p4d5rkuwif
                            - generic: QA APIC010-1778762937051-1615 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1778762937051-1615 Type
                          - cell: 2026-05-14 · 19:48-22:08
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f1r9e006v959a7jc0gz3r
                            - generic: QA APIC008CANCEL-1778758775495-1995 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778758775495-1995 Type
                          - cell: 2026-05-14 · 19:59-21:59
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f297k006vtwchvoomv5ag
                            - generic: QA APIC008CANCEL-1778758798775-6991 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778758798775-6991 Type
                          - cell: 2026-05-14 · 19:59-21:59
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5f3beq006v14jb7ev3ac97
                            - generic: QA APIC008CANCEL-1778758848285-5070 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778758848285-5070 Type
                          - cell: 2026-05-14 · 20:00-22:00
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5fjcrv006vdpp9a7el14iy
                            - generic: QA APIC008CANCEL-1778759596548-8034 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778759596548-8034 Type
                          - cell: 2026-05-14 · 20:13-22:13
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hhis7006v7ojernv09g2f
                            - generic: QA APIC008CANCEL-1778762870258-4986 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778762870258-4986 Type
                          - cell: 2026-05-14 · 21:07-23:07
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmp5hixxj006vd2p4fn54x2va
                            - generic: QA APIC008CANCEL-1778762936552-3688 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1778762936552-3688 Type
                          - cell: 2026-05-14 · 21:08-23:08
                          - cell: —
                          - cell: Manager User
                          - cell: 4 дн назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj49x6005w8pgxypb0u23b
                            - generic: QA APIC008-1779188874708-5094 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1779188874708-5094 Type
                          - cell: 2026-05-19 · 16:07-18:07
                          - cell: —
                          - cell: Manager User
                          - cell: 10 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj5yog005wrbohtuiiqomq
                            - generic: QA APIC008-1779188953463-3917 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1779188953463-3917 Type
                          - cell: 2026-05-19 · 16:09-18:09
                          - cell: —
                          - cell: Manager User
                          - cell: 9 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjav0n005s1mmf5qk8m5ho
                            - generic: QA APIC008-1779189181998-5667 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1779189181998-5667 Type
                          - cell: 2026-05-19 · 16:13-18:13
                          - cell: —
                          - cell: Manager User
                          - cell: 5 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjc5ps005sqzenqf8jd92l
                            - generic: QA APIC008-1779189242521-7488 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1779189242521-7488 Type
                          - cell: 2026-05-19 · 16:14-18:14
                          - cell: —
                          - cell: Manager User
                          - cell: 4 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjdoae005s13xevvgj05d8
                            - generic: QA APIC008-1779189313254-7847 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008-1779189313254-7847 Type
                          - cell: 2026-05-19 · 16:15-18:15
                          - cell: —
                          - cell: Manager User
                          - cell: 3 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj4a81007n8pgxxa90gj1t
                            - generic: QA APIC009-1779188875117-5914 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1779188875117-5914 Type
                          - cell: 2026-05-19 · 17:07-19:07
                          - cell: —
                          - cell: Manager User
                          - cell: 10 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj5yyq007nrbohugy4zhi0
                            - generic: QA APIC009-1779188953840-7073 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1779188953840-7073 Type
                          - cell: 2026-05-19 · 17:09-19:09
                          - cell: —
                          - cell: Manager User
                          - cell: 9 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjavbo007j1mmftgsmy4te
                            - generic: QA APIC009-1779189182403-8912 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1779189182403-8912 Type
                          - cell: 2026-05-19 · 17:13-19:13
                          - cell: —
                          - cell: Manager User
                          - cell: 5 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjc60z007jqzeng2btp1g4
                            - generic: QA APIC009-1779189242926-682 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1779189242926-682 Type
                          - cell: 2026-05-19 · 17:14-19:14
                          - cell: —
                          - cell: Manager User
                          - cell: 4 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjdoj9007j13xeriruido6
                            - generic: QA APIC009-1779189313586-6060 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC009-1779189313586-6060 Type
                          - cell: 2026-05-19 · 17:15-19:15
                          - cell: —
                          - cell: Manager User
                          - cell: 3 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj4ag1008t8pgx0fd9fblc
                            - generic: QA APIC010-1779188875406-6527 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1779188875406-6527 Type
                          - cell: 2026-05-19 · 18:07-20:27
                          - cell: —
                          - cell: Manager User
                          - cell: 10 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj5z6o008trbohr6pbvcmx
                            - generic: QA APIC010-1779188954127-7212 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1779188954127-7212 Type
                          - cell: 2026-05-19 · 18:09-20:29
                          - cell: —
                          - cell: Manager User
                          - cell: 9 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjavjj008p1mmfn6jsmezl
                            - generic: QA APIC010-1779189182686-7722 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1779189182686-7722 Type
                          - cell: 2026-05-19 · 18:13-20:33
                          - cell: —
                          - cell: Manager User
                          - cell: 5 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjc692008pqzenp2lv2v76
                            - generic: QA APIC010-1779189243218-683 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1779189243218-683 Type
                          - cell: 2026-05-19 · 18:14-20:34
                          - cell: —
                          - cell: Manager User
                          - cell: 4 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjdopy008p13xe1fvjug2o
                            - generic: QA APIC010-1779189313826-4774 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC010-1779189313826-4774 Type
                          - cell: 2026-05-19 · 18:15-20:35
                          - cell: —
                          - cell: Manager User
                          - cell: 3 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj4a2p006v8pgxqny7zic8
                            - generic: QA APIC008CANCEL-1779188874925-2377 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1779188874925-2377 Type
                          - cell: 2026-05-19 · 19:27-21:27
                          - cell: —
                          - cell: Manager User
                          - cell: 10 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcj5ytk006vrboh1adrq6vl
                            - generic: QA APIC008CANCEL-1779188953652-4024 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1779188953652-4024 Type
                          - cell: 2026-05-19 · 19:29-21:29
                          - cell: —
                          - cell: Manager User
                          - cell: 9 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjav64006r1mmfwe4ggnnm
                            - generic: QA APIC008CANCEL-1779189182191-1214 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1779189182191-1214 Type
                          - cell: 2026-05-19 · 19:33-21:33
                          - cell: —
                          - cell: Manager User
                          - cell: 5 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjc5vh006rqzenwn207b49
                            - generic: QA APIC008CANCEL-1779189242714-6935 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1779189242714-6935 Type
                          - cell: 2026-05-19 · 19:34-21:34
                          - cell: —
                          - cell: Manager User
                          - cell: 4 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjdoeo006r13xevs1d2pb8
                            - generic: QA APIC008CANCEL-1779189313417-5447 Lead
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC008CANCEL-1779189313417-5447 Type
                          - cell: 2026-05-19 · 19:35-21:35
                          - cell: —
                          - cell: Manager User
                          - cell: 3 мин назад
                        - row:
                          - cell:
                            - generic: DEP-cmpcjiaee001aaj8zqdku5l29
                            - generic: E2E 009 009-1779189525924-406
                          - cell:
                            - generic:
                              - img
                              - text: Ожидается
                          - cell: QA APIC006-1778758235503-888 Type
                          - cell: 2026-05-20 · 10:00-14:00
                          - cell: Москва, Тестовая улица, 66
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
                  - heading [level=1]: DEP-CMPCJIAE
                  - generic:
                    - generic:
                      - button [disabled]:
                        - text: Выезд отменен
                        - img
                    - generic:
                      - button [disabled]: Отменить выезд
                    - generic:
                      - generic:
                        - button:
                          - img
                          - text: Откатить стадию
                - generic:
                  - button: APP-000172
                  - text: ·
                  - button: E2E 009 009-1779189525924-406
                  - text: · E2E 009-item
                - generic:
                  - generic:
                    - generic: Отменен
                  - generic:
                    - generic:
                      - img
                      - generic: 26.05.2026
                  - generic:
                    - generic:
                      - img
                      - generic: Manager User
              - generic:
                - img
                - generic: "Следующий шаг: Выезд отменен"
                - generic: · E2E-009 unqualified reason 009-1779189525996-18
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
                        - button: E2E 009 009-1779189525924-406
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
                      - generic: QA APIC006-1778758235503-888 Type
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Адрес
                      - generic: Москва, Тестовая улица, 66
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: План дата
                      - generic: 2026-05-20T11:18:47.976Z
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
                      - generic: 19.05.2026, 16:18
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Причина отмены
                      - generic: E2E-009 unqualified reason 009-1779189525996-18
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
                              - text: E2E-009 unqualified reason 009-1779189525996-18
                      - generic:
                        - generic:
                          - generic:
                            - generic: Финальный исход
                            - generic: Закройте выезд результатом работ
                          - button:
                            - img
                            - text: Открыть
                        - generic: "Завершение уже создано: некачественно · 19.05.2026, 16:18"
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
                - generic: 26.05.2026, 17:18
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
                  - button: LEAD-CMPCJI8B
              - generic:
                - generic: Заявка
                - generic:
                  - button: APP-000172
              - generic:
                - generic: Бронь
                - generic:
                  - button: RSV-CMPCJI9X
              - generic:
                - generic: Выезд
                - generic:
                  - button: DEP-CMPCJIAE
              - generic:
                - generic: Завершение
                - generic:
                  - button: CMP-CMPCJIAV
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
              - heading "CMP-CMPCJIAV" [level=1] [ref=e56]
              - generic [ref=e57]:
                - button "Открыть выезд" [ref=e59]:
                  - img
                  - text: Открыть выезд
                - button "Откатить стадию" [ref=e62]:
                  - img
                  - text: Откатить стадию
            - generic [ref=e63]:
              - button "DEP-CMPCJIAE" [ref=e64]
              - text: ·
              - button "APP-000172" [ref=e65]
              - text: ·
              - button "E2E 009 009-1779189525924-406" [ref=e66]
            - generic [ref=e67]:
              - generic [ref=e69]:
                - img [ref=e70]
                - generic [ref=e73]: Manager User
              - generic [ref=e75]:
                - img [ref=e76]
                - generic [ref=e79]: E2E 009-item
          - generic [ref=e80]:
            - img [ref=e81]
            - generic [ref=e83]: "Следующий шаг: Сохранить комментарий"
          - generic [ref=e84]:
            - heading "Итог завершения" [level=3] [ref=e86]
            - generic [ref=e87]:
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - generic [ref=e90]:
                    - img [ref=e92]
                    - generic [ref=e95]: Исход
                  - generic [ref=e96]: Некачественный
                - generic [ref=e97]:
                  - generic [ref=e98]:
                    - img [ref=e100]
                    - generic [ref=e103]: Дата
                  - generic [ref=e104]: 19.05.2026, 16:18
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - img [ref=e108]
                    - generic [ref=e111]: Менеджер
                  - generic [ref=e112]: Manager User
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - img [ref=e116]
                    - generic [ref=e119]: Позиция
                  - generic [ref=e120]: E2E 009-item
              - textbox "Комментарий по завершению" [ref=e121]: E2E-009 unqualified reason 009-1779189525996-18
              - textbox "Причина некачественного завершения" [ref=e122]: E2E-009 unqualified reason 009-1779189525996-18
              - button "Сохранить комментарий" [ref=e124]
          - generic [ref=e125]:
            - heading "Контекст" [level=3] [ref=e127]
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - img [ref=e133]
                  - generic [ref=e135]: Дата и окно
                - generic [ref=e137]: 2026-05-20 · 10:00-14:00
              - generic [ref=e138]:
                - generic [ref=e139]:
                  - img [ref=e141]
                  - generic [ref=e144]: Адрес
                - generic [ref=e145]: Москва, Тестовая улица, 66
              - generic [ref=e146]:
                - generic [ref=e147]:
                  - img [ref=e149]
                  - generic [ref=e153]: Клиент
                - button "E2E 009 009-1779189525924-406" [ref=e155]
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - img [ref=e159]
                  - generic [ref=e162]: Менеджер
                - generic [ref=e163]: Manager User
          - generic [ref=e164]:
            - button "Открыть выезд" [ref=e165]:
              - img [ref=e167]
              - text: Открыть выезд
            - button "Открыть бронь" [ref=e171]:
              - img [ref=e173]
              - text: Открыть бронь
            - button "Открыть заявку" [ref=e176]:
              - img [ref=e178]
              - text: Открыть заявку
            - button "Открыть лид" [ref=e181]:
              - img [ref=e183]
              - text: Открыть лид
            - button "Открыть клиента" [ref=e186]:
              - img [ref=e188]
              - text: Открыть клиента
        - complementary [ref=e192]:
          - generic [ref=e193]:
            - button "Сводка" [ref=e195]:
              - img [ref=e196]
              - generic [ref=e198]: Сводка
            - generic [ref=e199]:
              - generic [ref=e200]:
                - generic [ref=e201]: Статус
                - generic [ref=e203]: Некачественный
              - generic [ref=e204]:
                - generic [ref=e205]: Дата
                - generic [ref=e206]: 19.05.2026, 16:18
              - generic [ref=e207]:
                - generic [ref=e208]: Менеджер
                - generic [ref=e209]: Manager User
          - generic [ref=e210]:
            - button "Связанные записи" [ref=e212]:
              - img [ref=e213]
              - generic [ref=e215]: Связанные записи
            - generic [ref=e216]:
              - generic [ref=e217]:
                - generic [ref=e218]: Лид
                - button "LEAD-CMPCJI8B" [ref=e220] [cursor=pointer]
              - generic [ref=e221]:
                - generic [ref=e222]: Заявка
                - button "APP-000172" [ref=e224] [cursor=pointer]
              - generic [ref=e225]:
                - generic [ref=e226]: Бронь
                - button "RSV-CMPCJI9X" [ref=e228] [cursor=pointer]
              - generic [ref=e229]:
                - generic [ref=e230]: Выезд
                - button "DEP-CMPCJIAE" [ref=e232] [cursor=pointer]
              - generic [ref=e233]:
                - generic [ref=e234]: Завершение
                - button "CMP-CMPCJIAV" [ref=e236] [cursor=pointer]
              - generic [ref=e237]:
                - generic [ref=e238]: Клиент
                - button "E2E 009 009-1779189525924-406" [ref=e240] [cursor=pointer]
          - button "Быстрые действия" [ref=e243]:
            - img [ref=e244]
            - generic [ref=e246]: Быстрые действия
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
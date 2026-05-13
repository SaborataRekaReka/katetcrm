# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extended-buttons.gwt.spec.ts >> Extended Buttons GWT (QA-REQ: 025..027, 032) >> E2E-016 completion open reservation and repeat-order API parity
- Location: e2e\extended-buttons.gwt.spec.ts:443:3

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
                  - heading [level=1]: Завершение
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
                - generic:
                  - table:
                    - rowgroup:
                      - row:
                        - columnheader: Завершение · Клиент
                        - columnheader: Акт
                        - columnheader: Техника
                        - columnheader: Дата завершения
                        - columnheader: Менеджер
                        - columnheader: Обновлено
                    - rowgroup:
                      - row:
                        - cell:
                          - generic: CMP-cmou71hr6002rdd4bqpn7xbjk
                          - generic: E2E 016 016-1778080198119-30
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: только что
                      - row:
                        - cell:
                          - generic: CMP-cmou6zbge00e9yitk1l8u6p7t
                          - generic: QA INT009-1778080096824-4996 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT009-1778080096824-4996 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6zb5k00d6yitk9xid2f8k
                          - generic: QA INT008-1778080096402-1417 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT008-1778080096402-1417 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6zatj00c7yitkmvtapyfp
                          - generic: QA INT007-1778080095991-7623 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT007-1778080095991-7623 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6zai500b0yitk3vc3bqaw
                          - generic: QA INT006-1778080095585-1411 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT006-1778080095585-1411 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6z56l006eyitk1bu3vxxu
                          - generic: QA APIC010-1778080088726-1443 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC010-1778080088726-1443 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6z4v50058yitkv2xvm4mw
                          - generic: QA APIC009-1778080088284-501 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC009-1778080088284-501 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6z4gm003hyitkql4bcrp8
                          - generic: QA APIC008-1778080087716-1091 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC008-1778080087716-1091 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 1 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6ythp006ytkwtw110tunm
                          - generic: QA INT009-1778080073529-7524 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT009-1778080073529-7524 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6yt56005vtkwtwydkpeko
                          - generic: QA INT008-1778080073062-8572 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT008-1778080073062-8572 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6ysri004wtkwtn95pqafu
                          - generic: QA INT007-1778080072479-9196 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT007-1778080072479-9196 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6ys8t003ptkwtwyb6dx3f
                          - generic: QA INT006-1778080071820-3886 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT006-1778080071820-3886 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6yd2q006ezg8a578ycwhq
                          - generic: QA APIC010-1778080052176-5675 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC010-1778080052176-5675 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6ycfc0058zg8aw80aflle
                          - generic: QA APIC009-1778080050823-9950 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC009-1778080050823-9950 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmou6ybc7003hzg8a9jwqnb7v
                          - generic: QA APIC008-1778080049982-7439 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC008-1778080049982-7439 Type
                        - cell: 2026-05-06
                        - cell: Manager User
                        - cell: 2 мин назад
                      - row:
                        - cell:
                          - generic: CMP-cmot2pxpg005u2ux0ut5u9ymj
                          - generic: E2E 009 009-1778012468358-109
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 18 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot2p3ze004j2ux05303tcdc
                          - generic: E2E 008 008-1778012435845-220
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 18 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot2p0f1003n2ux0tf83hkxa
                          - generic: E2E 007 007-1778012431203-974
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 18 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot2ksp9001a12gv5qq1watm
                          - generic: E2E 009 009-1778012230575-867
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 18 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot2apbr005uizc002vx6ccu
                          - generic: E2E 009 009-1778011760331-964
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot29xrh004jizc0awgoe5wk
                          - generic: E2E 008 008-1778011728026-804
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot29ute003nizc0yurmuibd
                          - generic: E2E 007 007-1778011724187-87
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot238av005mfnobfjaw0h07
                          - generic: E2E 009 009-1778011411284-878
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot232eh004jfnobhshahch4
                          - generic: E2E 008 008-1778011407425-206
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot22zc1003nfnobklhz096c
                          - generic: E2E 007 007-1778011403421-635
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot20cw1004jkcydl0fehu0s
                          - generic: E2E 008 008-1778011281065-379
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot209vm003nkcyd45dx5hbm
                          - generic: E2E 007 007-1778011277143-630
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot1om6900b2rcnuvlstcr21
                          - generic: E2E 008 008-1778010733146-638
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot1oitf00a6rcnu44o9hwbg
                          - generic: E2E 007 007-1778010728857-431
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot1mke7005zrcnuc7i5nems
                          - generic: E2E 008 008-1778010637614-688
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot1mgwl0053rcnu1o6xy6mh
                          - generic: E2E 007 007-1778010633005-288
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0geky006yla1cmzbsj6yp
                          - generic: QA INT009-1778008670547-2432 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT009-1778008670547-2432 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0ge9q005vla1ccyekrmp4
                          - generic: QA INT008-1778008670137-350 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT008-1778008670137-350 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0gdym004wla1c7rvdf7gs
                          - generic: QA INT007-1778008669671-6516 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT007-1778008669671-6516 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0gdl8003pla1ccm876ass
                          - generic: QA INT006-1778008669242-9931 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA INT006-1778008669242-9931 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0g0vk006ep9pfesvslgc0
                          - generic: QA APIC010-1778008652198-3321 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC010-1778008652198-3321 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0g00c0058p9pfofg3h2r3
                          - generic: QA APIC009-1778008651649-9823 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC009-1778008651649-9823 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0fzix003hp9pfv3nese7j
                          - generic: QA APIC008-1778008651020-5476 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC008-1778008651020-5476 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0azot0058149lkzwphoar
                          - generic: QA APIC009-1778008417949-4092 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC009-1778008417949-4092 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot0az5o003h149l1k2aiqgz
                          - generic: QA APIC008-1778008417234-8907 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC008-1778008417234-8907 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot09snd004g588guyd0jln6
                          - generic: QA APIC009-1778008362170-529 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC009-1778008362170-529 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmot09s9r003h588gppmc1rr1
                          - generic: QA APIC008-1778008361671-9738 Lead
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: QA APIC008-1778008361671-9738 Type
                        - cell: 2026-05-05
                        - cell: Manager User
                        - cell: 19 ч назад
                      - row:
                        - cell:
                          - generic: CMP-cmolqevjo00m7p93rtikn6jk1
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: RBAC Type 00bafafd updated
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 5 дн назад
                      - row:
                        - cell:
                          - generic: CMP-cmolpn4ef007yp93r3dfxeg21
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: RBAC Type 00bafafd updated
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 5 дн назад
                      - row:
                        - cell:
                          - generic: CMP-cmolf2u91007ybd33kzxgvrok
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: RBAC Type 00bafafd updated
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 6 дн назад
                      - row:
                        - cell:
                          - generic: CMP-cmolbr04l00sdnmhts4h5wus4
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: RBAC Type 00bafafd updated
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 6 дн назад
                      - row:
                        - cell:
                          - generic: CMP-cmolbnlwa00ienmhtaes9juys
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: RBAC Type 00bafafd updated
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 6 дн назад
                      - row:
                        - cell:
                          - generic: CMP-cmolb8o290080nmht8mpbut2a
                          - generic: manager LLC
                        - cell:
                          - generic:
                            - img
                            - text: Закрыт
                        - cell: Бетононасос
                        - cell: 2026-04-30
                        - cell: Manager User
                        - cell: 6 дн назад
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
                - generic: Завершение
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
                  - generic: Завершение
                  - img
                - generic:
                  - heading [level=1]: CMP-CMOU71HV
                  - generic:
                    - generic:
                      - button:
                        - img
                        - text: Открыть выезд
                - generic:
                  - button: DEP-CMOU71HR
                  - text: ·
                  - button: APP-000218
                  - text: ·
                  - button: E2E 016 016-1778080198119-30
                - generic:
                  - generic:
                    - generic:
                      - img
                      - generic: Manager User
                  - generic:
                    - generic:
                      - img
                      - generic: E2E 016-item
              - generic:
                - img
                - generic: "Следующий шаг: Сохранить комментарий"
              - generic:
                - generic:
                  - heading [level=3]: Итог завершения
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Исход
                      - generic: Завершен
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Дата
                      - generic: 06.05.2026, 20:09
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
                      - generic: E2E 016-item
                  - textbox:
                    - /placeholder: Комментарий по завершению
                    - text: E2E-016 complete note 016-complete-1778080198563-275
                  - generic:
                    - button: Сохранить комментарий
              - generic:
                - generic:
                  - heading [level=3]: Контекст
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Дата и окно
                      - generic:
                        - generic: 2026-05-07 · 10:00-14:00
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Адрес
                      - generic: Москва, Тестовая улица, 12
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Клиент
                      - generic:
                        - button: E2E 016 016-1778080198119-30
                    - generic:
                      - generic:
                        - generic:
                          - img
                        - generic: Менеджер
                      - generic: Manager User
              - generic:
                - button:
                  - generic:
                    - img
                  - text: Открыть выезд
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
              - generic:
                - generic:
                  - img
                  - generic: Повторный заказ
                - generic: Заказ клиента закрыт — можно сразу создать новый лид по шаблону прошлого заказа.
                - generic:
                  - button:
                    - img
                    - text: Создать повторный заказ
                  - button:
                    - img
                    - text: Карточка клиента
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
                  - generic: Завершен
              - generic:
                - generic: Дата
                - generic: 06.05.2026, 20:09
              - generic:
                - generic: Менеджер
                - generic: Manager User
          - generic:
            - generic:
              - button:
                - img
                - generic: Связанные записи
            - generic:
              - generic:
                - generic: Лид
                - generic:
                  - button: LEAD-CMOU71HI
              - generic:
                - generic: Заявка
                - generic:
                  - button: APP-000218
              - generic:
                - generic: Бронь
                - generic:
                  - button: RSV-CMOU71HN
              - generic:
                - generic: Выезд
                - generic:
                  - button: DEP-CMOU71HR
              - generic:
                - generic: Завершение
                - generic:
                  - button: CMP-CMOU71HV
              - generic:
                - generic: Клиент
                - generic:
                  - button: E2E 016 016-1778080198119-30
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
            - generic [ref=e20]: Бронь
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
            - button "Бронь" [ref=e48]:
              - img [ref=e49]
              - generic [ref=e52]: Бронь
              - img [ref=e53]
            - heading "cmou71hnb002ldd4blxy1qxgy" [level=1] [ref=e56]
            - generic [ref=e57]:
              - 'button "Заявка #APP-000218" [ref=e58]'
              - text: ·
              - button "E2E 016 016-1778080198119-30" [ref=e59]
              - text: · Бетононасос
            - generic [ref=e60]:
              - generic [ref=e63]: Снята
              - generic [ref=e65]:
                - img [ref=e66]
                - generic [ref=e69]: Manager User
              - generic [ref=e71]:
                - img [ref=e72]
                - generic [ref=e74]: 2026-05-09
              - generic [ref=e76]:
                - img [ref=e77]
                - generic [ref=e82]: Своя техника
              - generic [ref=e84]:
                - img [ref=e85]
                - generic [ref=e87]: "Единица: 123"
              - generic [ref=e89]:
                - img [ref=e90]
                - text: Конфликт
          - alert [ref=e92]:
            - img [ref=e93]
            - generic [ref=e95]: Обнаружен конфликт
            - generic [ref=e96]:
              - text: Обнаружено пересечение по интервалу брони. Подробные данные конфликта будут доступны после расширения backend-проекции.
              - generic [ref=e97]:
                - button "Открыть конфликт" [ref=e98]
                - button "Выбрать альтернативу" [ref=e99]
          - generic [ref=e100]:
            - heading "Основные данные" [level=3] [ref=e102]
            - generic [ref=e104]:
              - generic [ref=e105]:
                - generic [ref=e106]:
                  - img [ref=e108]
                  - generic [ref=e111]: ID
                - generic [ref=e113]: cmou71hnb002ldd4blxy1qxgy
              - generic [ref=e114]:
                - generic [ref=e115]:
                  - img [ref=e117]
                  - generic [ref=e119]: Статус
                - generic [ref=e121]: Снята
              - generic [ref=e122]:
                - generic [ref=e123]:
                  - img [ref=e125]
                  - generic [ref=e129]: Клиент
                - button "E2E 016 016-1778080198119-30" [ref=e131]
              - generic [ref=e132]:
                - generic [ref=e133]:
                  - img [ref=e135]
                  - generic [ref=e140]: Тип техники
                - generic [ref=e142]: Бетононасос
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - img [ref=e146]
                  - generic [ref=e148]: Единица
                - generic [ref=e150]: "123"
              - generic [ref=e151]:
                - generic [ref=e152]:
                  - img [ref=e154]
                  - generic [ref=e157]: Создал
                - generic [ref=e159]: Manager User
              - generic [ref=e160]:
                - generic [ref=e161]:
                  - img [ref=e163]
                  - generic [ref=e165]: Создано
                - generic [ref=e167]: 2026-05-06 20:09
              - generic [ref=e168]:
                - generic [ref=e169]:
                  - img [ref=e171]
                  - generic [ref=e175]: Снята
                - generic [ref=e177]: 2026-05-06 20:09
              - generic [ref=e178]:
                - generic [ref=e179]:
                  - img [ref=e181]
                  - generic [ref=e184]: Причина
                - generic [ref=e186]: completion:completed
          - generic [ref=e187]:
            - generic [ref=e188]:
              - generic [ref=e189]: Позиция заявки · E2E 016-item
              - button "Открыть заявку" [ref=e190]:
                - img [ref=e191]
                - text: Открыть заявку
            - generic [ref=e195]:
              - generic [ref=e196]:
                - generic [ref=e197]:
                  - img [ref=e199]
                  - generic [ref=e204]: Техника
                - generic [ref=e206]: Бетононасос × 1
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - img [ref=e210]
                  - generic [ref=e212]: Дата
                - generic [ref=e214]: 2026-05-09
              - generic [ref=e215]:
                - generic [ref=e216]:
                  - img [ref=e218]
                  - generic [ref=e220]: Время
                - generic [ref=e222]: 15:09–19:09
              - generic [ref=e223]:
                - generic [ref=e224]:
                  - img [ref=e226]
                  - generic [ref=e229]: Адрес
                - generic [ref=e230]: Empty
          - generic [ref=e232]:
            - generic [ref=e233]:
              - img [ref=e234]
              - generic [ref=e239]: Источник
            - generic [ref=e240]:
              - generic [ref=e241]:
                - img [ref=e242]
                - text: Своя техника
              - button "Сменить на подрядчика" [ref=e247]:
                - img [ref=e248]
                - generic [ref=e252]: Сменить на подрядчика
          - generic [ref=e254]:
            - img [ref=e255]
            - generic [ref=e257]: "Следующий шаг: Открыть выезд"
          - generic [ref=e258]:
            - generic [ref=e259]: Здесь показывается только своя техника из справочника «Единицы техники». Партнерская техника выбирается через источник «Подрядчик».
            - generic [ref=e260]:
              - img [ref=e261]
              - generic [ref=e263]:
                - text: "Выбрана единица: 123"
                - generic [ref=e264]:
                  - img [ref=e265]
                  - text: Конфликт
              - group [ref=e267]:
                - generic "Сменить единицу" [ref=e268] [cursor=pointer]:
                  - img [ref=e269]
                  - text: Сменить единицу
          - generic [ref=e271]:
            - button "Открыть заявку" [ref=e272]:
              - img [ref=e274]
              - text: Открыть заявку
            - button "Открыть клиента" [ref=e278]:
              - img [ref=e280]
              - text: Открыть клиента
          - generic [ref=e284]:
            - generic [ref=e285]: Журнал изменений
            - generic [ref=e287]:
              - img [ref=e288]
              - generic [ref=e290]:
                - generic [ref=e291]:
                  - generic [ref=e292]: Manager User
                  - generic [ref=e293]: только что
                - generic [ref=e294]: обновлено · Обновлена бронь
        - complementary [ref=e295]:
          - generic [ref=e296]:
            - button "Статус" [ref=e298]:
              - img [ref=e299]
              - generic [ref=e301]: Статус
            - generic [ref=e302]:
              - generic [ref=e303]:
                - generic [ref=e304]: Статус
                - generic [ref=e306]: Снята
              - generic [ref=e307]:
                - generic [ref=e308]: Внутренняя стадия
                - generic [ref=e309]: Снята
              - generic [ref=e310]:
                - generic [ref=e311]: Источник
                - generic [ref=e313]: Своя техника
              - generic [ref=e314]:
                - generic [ref=e315]: Создано
                - generic [ref=e316]: 2026-05-06 20:09
              - generic [ref=e317]:
                - generic [ref=e318]: Создал
                - generic [ref=e319]: Manager User
          - generic [ref=e320]:
            - button "Готовность к выезду" [ref=e322]:
              - img [ref=e323]
              - generic [ref=e325]: Готовность к выезду
            - generic [ref=e326]:
              - generic [ref=e327]:
                - generic [ref=e328]:
                  - img [ref=e329]
                  - generic [ref=e331]: Бронь активна
                - generic [ref=e332]:
                  - img [ref=e333]
                  - generic [ref=e336]: Источник выбран
                - generic [ref=e337]:
                  - img [ref=e338]
                  - generic [ref=e341]: Единица выбрана
              - button "Открыть выезд" [ref=e343]
          - generic [ref=e344]:
            - button "Процесс брони" [ref=e346]:
              - img [ref=e347]
              - generic [ref=e349]: Процесс брони
            - generic [ref=e351]:
              - generic [ref=e352]:
                - img [ref=e353]
                - generic [ref=e355]: Нужен выбор источника
              - generic [ref=e356]:
                - img [ref=e357]
                - generic [ref=e359]: Подбор своей техники
              - generic [ref=e360]:
                - img [ref=e361]
                - generic [ref=e363]: Подбор подрядчика
              - generic [ref=e364]:
                - img [ref=e365]
                - generic [ref=e367]: Подрядчик подтверждён
              - generic [ref=e368]:
                - img [ref=e369]
                - generic [ref=e371]: Тип забронирован
              - generic [ref=e372]:
                - img [ref=e373]
                - generic [ref=e375]: Единица уточнена
              - generic [ref=e376]:
                - img [ref=e377]
                - generic [ref=e379]: Готово к выезду
          - generic [ref=e380]:
            - button "Связанные записи" [ref=e382]:
              - img [ref=e383]
              - generic [ref=e385]: Связанные записи
            - generic [ref=e386]:
              - generic [ref=e387]:
                - generic [ref=e388]: Лид
                - button "LEAD-CMOU71HI" [ref=e390] [cursor=pointer]
              - generic [ref=e391]:
                - generic [ref=e392]: Заявка
                - 'button "Заявка #APP-000218" [ref=e394] [cursor=pointer]'
              - generic [ref=e395]:
                - generic [ref=e396]: Бронь
                - button "RSV-CMOU71HN" [ref=e398] [cursor=pointer]
              - generic [ref=e399]:
                - generic [ref=e400]: Выезд
                - button "DEP-CMOU71HR" [ref=e402] [cursor=pointer]
              - generic [ref=e403]:
                - generic [ref=e404]: Завершение
                - button "CMP-CMOU71HV" [ref=e406] [cursor=pointer]
              - generic [ref=e407]:
                - generic [ref=e408]: Позиция
                - generic [ref=e409]: E2E 016-item
              - generic [ref=e410]:
                - generic [ref=e411]: Клиент
                - button "E2E 016 016-1778080198119-30" [ref=e413] [cursor=pointer]
          - button "Быстрые действия" [ref=e416]:
            - img [ref=e417]
            - generic [ref=e419]: Быстрые действия
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
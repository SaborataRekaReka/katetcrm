import { useMemo, useState } from 'react';
import { Upload, Settings as SettingsIcon, Users as UsersIcon, Shield, Plus, Check, X, Building2, Workflow, Bell } from 'lucide-react';
import { useLayout } from '../shell/layoutStore';
import { getModuleMeta } from '../shell/navConfig';
import { ListScaffold } from '../shell/ListScaffold';
import { SimpleToolbar } from '../shell/SimpleToolbar';
import { Button } from '../ui/button';
import { DashboardPage, CompactPageHeader, WidgetCard } from '../shell/dashboard';

export function AdminWorkspacePage() {
  const { activeSecondaryNav } = useLayout();
  if (activeSecondaryNav === 'imports') return <ImportsPage />;
  if (activeSecondaryNav === 'settings') return <SettingsPage />;
  if (activeSecondaryNav === 'users') return <UsersPage />;
  if (activeSecondaryNav === 'permissions') return <PermissionsPage />;
  return <ImportsPage />;
}

function ImportsPage() {
  const meta = getModuleMeta('imports');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const IMPORTS = [
    { id: 'IMP-001', at: '2026-04-20 14:32', file: 'leads-2024-q1.csv', rows: 124, status: 'ok' },
    { id: 'IMP-002', at: '2026-04-18 10:05', file: 'clients-crm-legacy.xlsx', rows: 412, status: 'ok' },
    { id: 'IMP-003', at: '2026-04-15 18:40', file: 'equipment-units.csv', rows: 32, status: 'partial' },
    { id: 'IMP-004', at: '2026-04-10 12:20', file: 'reservations-history.csv', rows: 98, status: 'error' },
  ];
  const filtered = IMPORTS.filter((i) => {
    if (status !== 'all' && i.status !== status) return false;
    const q = query.trim().toLowerCase();
    return !q || `${i.id} ${i.file}`.toLowerCase().includes(q);
  });

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'status',
          value: status,
          placeholder: 'Статус',
          width: 120,
          options: [
            { value: 'all', label: 'Все' },
            { value: 'ok', label: 'Успешно' },
            { value: 'partial', label: 'Частично' },
            { value: 'error', label: 'Ошибка' },
          ],
          onChange: setStatus,
        },
      ]}
      hasActive={query.length > 0 || status !== 'all'}
      onReset={() => {
        setQuery('');
        setStatus('all');
      }}
      extraUtility={
        <Button size="sm" className="h-7 gap-1 bg-[#2a6af0] px-2.5 text-[12px] text-white hover:bg-[#2358d1]">
          <Upload className="h-3.5 w-3.5" />
          Новый импорт
        </Button>
      }
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[700px] border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Файл</th>
              <th className="px-3 py-2 text-left font-medium">Строк</th>
              <th className="px-3 py-2 text-left font-medium">Дата</th>
              <th className="px-3 py-2 text-left font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-border/40 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{i.id}</td>
                <td className="px-3 py-2.5 text-foreground">{i.file}</td>
                <td className="px-3 py-2.5 tabular-nums text-foreground/80">{i.rows}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{i.at}</td>
                <td className="px-3 py-2.5">
                  <ImportStatusPill status={i.status as 'ok' | 'partial' | 'error'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListScaffold>
  );
}

function ImportStatusPill({ status }: { status: 'ok' | 'partial' | 'error' }) {
  const map = {
    ok: { label: 'Успешно', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partial: { label: 'Частично', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    error: { label: 'Ошибка', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  } as const;
  const it = map[status];
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] ${it.cls}`}>{it.label}</span>;
}

function SettingsPage() {
  const SECTIONS = [
    {
      id: 'company',
      title: 'Организация',
      description: 'Общая информация о компании',
      icon: <Building2 className="h-3.5 w-3.5" />,
      rows: [
        { label: 'Название', value: 'ООО «Катет»' },
        { label: 'ИНН / КПП', value: '7701234567 / 770101001' },
        { label: 'Юр. адрес', value: 'г. Москва, ул. Ленина, д. 1' },
        { label: 'Основной менеджер', value: 'Петров А.' },
      ],
    },
    {
      id: 'stages',
      title: 'Этапы воронки',
      description: 'Условия перехода между стадиями',
      icon: <Workflow className="h-3.5 w-3.5" />,
      rows: [
        { label: 'lead → application', value: 'Требуются: контакт, тип техники' },
        { label: 'application → reservation', value: 'Требуется: подтверждённая позиция' },
        { label: 'reservation → departure', value: 'Требуется: назначенная единица' },
        { label: 'departure → completed', value: 'Требуется: акт выполнения' },
      ],
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      description: 'Каналы и события',
      icon: <Bell className="h-3.5 w-3.5" />,
      rows: [
        { label: 'Срочный лид', value: 'Email + в интерфейсе' },
        { label: 'Конфликт брони', value: 'В интерфейсе' },
        { label: 'Просроченный выезд', value: 'Email + SMS ответственному' },
      ],
    },
  ];

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader
          title="Настройки"
          subtitle="Базовые параметры рабочего пространства"
          icon={<SettingsIcon className="h-3.5 w-3.5" />}
        />
        {SECTIONS.map((s) => (
          <WidgetCard key={s.id} title={s.title} description={s.description} icon={s.icon} bodyPadded={false}>
            <dl className="divide-y divide-border/40">
              {s.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[220px_1fr] gap-4 px-4 py-2.5 text-[12px]">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
          </WidgetCard>
        ))}
      </DashboardPage>
    </ListScaffold>
  );
}

function UsersPage() {
  const meta = getModuleMeta('users');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');

  const USERS = useMemo(
    () => [
      { id: 'U-001', name: 'Петров А.', email: 'petrov@katet.ru', role: 'manager', active: true, lastLogin: '2026-04-22 09:12' },
      { id: 'U-002', name: 'Сидоров Б.', email: 'sidorov@katet.ru', role: 'manager', active: true, lastLogin: '2026-04-22 08:40' },
      { id: 'U-003', name: 'Иванова С.', email: 'ivanova@katet.ru', role: 'operator', active: true, lastLogin: '2026-04-21 17:05' },
      { id: 'U-004', name: 'Admin', email: 'admin@katet.ru', role: 'admin', active: true, lastLogin: '2026-04-22 10:00' },
      { id: 'U-005', name: 'Кузнецов Д.', email: 'kuznetsov@katet.ru', role: 'manager', active: false, lastLogin: '2025-12-02 14:20' },
    ],
    [],
  );

  const filtered = USERS.filter((u) => {
    if (role !== 'all' && u.role !== role) return false;
    const q = query.trim().toLowerCase();
    return !q || `${u.name} ${u.email}`.toLowerCase().includes(q);
  });

  const toolbar = (
    <SimpleToolbar
      searchPlaceholder={meta.searchPlaceholder}
      query={query}
      onQueryChange={setQuery}
      filters={[
        {
          id: 'role',
          value: role,
          placeholder: 'Роль',
          width: 120,
          options: [
            { value: 'all', label: 'Все роли' },
            { value: 'admin', label: 'Админ' },
            { value: 'manager', label: 'Менеджер' },
            { value: 'operator', label: 'Оператор' },
          ],
          onChange: setRole,
        },
      ]}
      hasActive={query.length > 0 || role !== 'all'}
      onReset={() => {
        setQuery('');
        setRole('all');
      }}
      extraUtility={
        <Button size="sm" className="h-7 gap-1 bg-[#2a6af0] px-2.5 text-[12px] text-white hover:bg-[#2358d1]">
          <Plus className="h-3.5 w-3.5" />
          Новый пользователь
        </Button>
      }
    />
  );

  return (
    <ListScaffold toolbar={toolbar}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[800px] border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Имя</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Роль</th>
              <th className="px-3 py-2 text-left font-medium">Активен</th>
              <th className="px-3 py-2 text-left font-medium">Последний вход</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border/40 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{u.id}</td>
                <td className="px-3 py-2.5 text-foreground">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {u.name}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-foreground/80">{u.email}</td>
                <td className="px-3 py-2.5 text-foreground/80">{u.role}</td>
                <td className="px-3 py-2.5">
                  {u.active ? (
                    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                      <Check className="h-3 w-3" /> Да
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                      <X className="h-3 w-3" /> Нет
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{u.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListScaffold>
  );
}

function PermissionsPage() {
  const ROLES = ['admin', 'manager', 'operator'] as const;
  const CAPABILITIES: Array<{ id: string; label: string; matrix: Record<(typeof ROLES)[number], boolean> }> = [
    { id: 'leads.read', label: 'Чтение лидов', matrix: { admin: true, manager: true, operator: true } },
    { id: 'leads.write', label: 'Редактирование лидов', matrix: { admin: true, manager: true, operator: false } },
    { id: 'applications.write', label: 'Редактирование заявок', matrix: { admin: true, manager: true, operator: false } },
    { id: 'reservations.confirm', label: 'Подтверждение броней', matrix: { admin: true, manager: true, operator: false } },
    { id: 'departures.start', label: 'Запуск выездов', matrix: { admin: true, manager: true, operator: true } },
    { id: 'completion.sign', label: 'Подписание актов', matrix: { admin: true, manager: true, operator: false } },
    { id: 'catalogs.write', label: 'Управление справочниками', matrix: { admin: true, manager: false, operator: false } },
    { id: 'admin.users', label: 'Управление пользователями', matrix: { admin: true, manager: false, operator: false } },
    { id: 'admin.permissions', label: 'Управление правами', matrix: { admin: true, manager: false, operator: false } },
    { id: 'admin.imports', label: 'Импорты', matrix: { admin: true, manager: false, operator: false } },
  ];

  return (
    <ListScaffold>
      <DashboardPage>
        <CompactPageHeader
          title="Роли и права"
          subtitle="Матрица возможностей по ролям. Редактирование отключено в MVP-макете."
          icon={<Shield className="h-3.5 w-3.5" />}
        />
        <WidgetCard bodyPadded={false}>
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Возможность</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-2 text-center font-medium">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((c) => (
                <tr key={c.id} className="border-b border-border/40 last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-foreground">{c.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {c.matrix[r] ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </WidgetCard>
      </DashboardPage>
    </ListScaffold>
  );
}

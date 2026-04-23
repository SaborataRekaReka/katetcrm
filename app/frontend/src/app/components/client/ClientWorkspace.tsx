import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Star,
  Truck,
  User as UserIcon,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { Lead } from '../../types/kanban';
import {
  Client,
  ClientLeadStatus,
  ClientOrderHistoryItem,
  ClientOrderStatus,
  ClientTagTone,
} from '../../types/client';
import { buildMockClient } from '../../data/mockClient';
import { useClientQuery } from '../../hooks/useClientsQuery';
import { useUpdateClient } from '../../hooks/useClientMutations';
import { USE_API } from '../../lib/featureFlags';
import { InlineText } from '../detail/InlineEdit/InlineText';
import { badgeBase, badgeTones } from '../kanban/badgeTokens';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import {
  DetailShell,
  Breadcrumb,
  ToolbarPill,
  PropertyRow,
  InlineValue,
  EmptyValue,
  SidebarSection,
  SidebarField,
  ActionButton,
} from '../detail/DetailShell';
import { EntityModalHeader, EntitySection } from '../detail/EntityModalFramework';
import { PhoneLink, EmailLink } from '../detail/ContactAtoms';
import { RepeatOrderDialog } from './RepeatOrderDialog';
import { EditClientDialog } from './EditClientDialog';
import { NewLeadDialog } from '../leads/NewLeadDialog';

interface Props {
  lead?: Lead;
  onClose: () => void;
  /** Real client id from API. If set + USE_API, detail поля подтягиваются
   * через `GET /clients/:id` и становятся редактируемыми инлайн. */
  apiClientId?: string;
}

const tagTone: Record<ClientTagTone, string> = {
  success: badgeTones.success,
  caution: badgeTones.caution,
  progress: badgeTones.progress,
  warning: badgeTones.warning,
  muted: badgeTones.muted,
  source: badgeTones.source,
};

const orderStatusMeta: Record<ClientOrderStatus, { label: string; tone: string }> = {
  completed: { label: 'Завершён', tone: badgeTones.success },
  in_progress: { label: 'В работе', tone: badgeTones.progress },
  cancelled: { label: 'Отменён', tone: badgeTones.muted },
};

const leadStatusMeta: Record<ClientLeadStatus, { label: string; tone: string }> = {
  converted: { label: 'Конверсия', tone: badgeTones.success },
  lost: { label: 'Потерян', tone: badgeTones.muted },
  in_progress: { label: 'В работе', tone: badgeTones.progress },
  unqualified: { label: 'Некачественный', tone: badgeTones.muted },
};

export function ClientWorkspace({ lead, onClose, apiClientId }: Props) {
  const mockBase: Client = useMemo(() => buildMockClient(lead), [lead]);

  // Real detail (когда есть apiClientId) — persisted-поля (name, company, phone, email,
  // notes) перекрывают mock. Остальное (orders/leads/contacts/requisites/activity) —
  // остаётся из мока, т.к. отдельных endpoints нет. См. docs/dead-buttons-session-10.md §5.
  const clientQuery = useClientQuery(apiClientId, USE_API && !!apiClientId);
  const updateClientMutation = useUpdateClient();

  const base: Client = useMemo(() => {
    if (clientQuery.data) {
      const api = clientQuery.data;
      const isCompany = !!api.company;
      return {
        ...mockBase,
        id: api.id,
        type: isCompany ? 'company' : 'person',
        displayName: isCompany ? api.company ?? api.name : api.name,
        shortName: isCompany ? api.name : undefined,
        primaryPhone: api.phone,
        primaryEmail: api.email ?? undefined,
        totalOrders: api.totalOrders,
        workingNotes: api.notes ?? mockBase.workingNotes,
      };
    }
    return mockBase;
  }, [clientQuery.data, mockBase]);

  const canInlineEditClient = USE_API && !!apiClientId;

  /** Фабрика save-обработчиков для инлайн-полей клиента. */
  const makeClientFieldSaver = (
    apply: (next: string) => Parameters<typeof updateClientMutation.mutateAsync>[0]['patch'],
  ) => {
    return async (next: string) => {
      if (!apiClientId) return;
      await updateClientMutation.mutateAsync({ id: apiClientId, patch: apply(next) });
    };
  };

  const [comment, setComment] = useState<string>(base.comment ?? '');
  const [commentEditing, setCommentEditing] = useState(false);
  const [notes, setNotes] = useState<string>(base.workingNotes ?? '');
  const [notesEditing, setNotesEditing] = useState(false);

  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatSource, setRepeatSource] = useState<ClientOrderHistoryItem | null>(null);
  const [createdAppId, setCreatedAppId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1200);
    } catch {
      /* ignore */
    }
  };

  const telHref = base.primaryPhone
    ? `tel:${base.primaryPhone.replace(/[^\d+]/g, '')}`
    : null;
  const mailHref = base.primaryEmail ? `mailto:${base.primaryEmail}` : null;

  const leadPrefill = {
    contactName: base.displayName,
    contactCompany: base.type === 'company' ? base.displayName : (base.shortName ?? ''),
    contactPhone: base.primaryPhone ?? '',
  };

  const completedOrders = base.ordersHistory.filter((o) => o.status === 'completed');
  const lastCompleted = completedOrders[0] ?? null;

  // Primary CTA: повторить заказ (если есть завершённый) или создать лид.
  const primary = lastCompleted
    ? {
        label: 'Повторить заказ',
        onClick: () => {
          setRepeatSource(lastCompleted);
          setRepeatOpen(true);
        },
      }
    : {
        label: 'Создать лид',
        onClick: () => setIsNewLeadOpen(true),
      };

  const handleRepeatFromOrder = (order: ClientOrderHistoryItem) => {
    setRepeatSource(order);
    setRepeatOpen(true);
  };

  const handleConfirmRepeat = (newAppId: string) => {
    setCreatedAppId(newAppId);
    setRepeatOpen(false);
  };

  const main = (
    <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10">
      <EntityModalHeader
        entityIcon={
          base.type === 'company'
            ? <Building2 className="w-3 h-3" />
            : <UserIcon className="w-3 h-3" />
        }
        entityLabel="Клиент"
        title={base.displayName}
        subtitle={
          <>
            {base.type === 'company' ? 'Юр. лицо' : 'Физ. лицо'}
            {base.shortName ? ` · ${base.shortName}` : ''}
            {base.totalOrders ? ` · Всего заказов: ${base.totalOrders}` : ''}
            {base.totalRevenue ? ` · ${base.totalRevenue}` : ''}
          </>
        }
        primaryAction={{
          label: primary.label,
          icon: <ArrowRight className="w-3 h-3" />,
          onClick: primary.onClick,
        }}
        secondaryActions={[
          ...(telHref
            ? [
                {
                  label: 'Позвонить',
                  iconBefore: <Phone className="w-3 h-3" />,
                  onClick: () => window.open(telHref),
                },
              ]
            : []),
          ...(mailHref
            ? [
                {
                  label: 'Написать',
                  iconBefore: <MessageSquare className="w-3 h-3" />,
                  onClick: () => window.open(mailHref),
                },
              ]
            : []),
          ...(canInlineEditClient
            ? [
                {
                  label: 'Редактировать',
                  iconBefore: <Edit3 className="w-3 h-3" />,
                  onClick: () => setIsEditOpen(true),
                },
              ]
            : []),
        ]}
        chips={[
          <span key="type" className={`${badgeBase} ${badgeTones.source}`}>
            {base.type === 'company'
              ? <Building2 className="w-3 h-3" />
              : <UserIcon className="w-3 h-3" />}
            {base.type === 'company' ? 'Юр. лицо' : 'Физ. лицо'}
          </span>,
          ...(base.manager
            ? [<ToolbarPill key="mgr" icon={<UserPlus className="w-3 h-3" />} label={base.manager} />]
            : []),
          <ToolbarPill key="act" icon={<Activity className="w-3 h-3" />} label={base.lastActivity} />,
          ...(base.activeRecords.topActiveApplication
            ? [
                <ToolbarPill
                  key="app"
                  icon={<FileText className="w-3 h-3 text-blue-500" />}
                  label={`Заявка ${base.activeRecords.topActiveApplication.id}`}
                />,
              ]
            : []),
          ...(base.activeRecords.topActiveReservation
            ? [
                <ToolbarPill
                  key="rsv"
                  icon={<FileText className="w-3 h-3 text-blue-500" />}
                  label={`Бронь ${base.activeRecords.topActiveReservation.id}`}
                />,
              ]
            : []),
          ...(base.activeRecords.topActiveDeparture
            ? [
                <ToolbarPill
                  key="dep"
                  icon={<Truck className="w-3 h-3 text-blue-500" />}
                  label={`Выезд ${base.activeRecords.topActiveDeparture.id}`}
                />,
              ]
            : []),
          ...(base.favoriteCategories[0]
            ? [
                <ToolbarPill
                  key="fav"
                  icon={<Star className="w-3 h-3 text-amber-500" />}
                  label={`${base.favoriteCategories[0].category} ×${base.favoriteCategories[0].count}`}
                />,
              ]
            : []),
        ]}
        className="mb-5"
      />

      {/* Tags / business context strip */}
      {base.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-5">
          {base.tags.map((t) => (
            <span key={t.label} className={`${badgeBase} ${tagTone[t.tone]}`}>
              {t.tone === 'success' && <CheckCircle2 className="w-3 h-3" />}
              {t.tone === 'caution' && <AlertTriangle className="w-3 h-3" />}
              {t.tone === 'progress' && <Activity className="w-3 h-3" />}
              {t.tone === 'warning' && <AlertCircle className="w-3 h-3" />}
              {t.label}
            </span>
          ))}
        </div>
      )}

      {/* Repeat-order success banner */}
      {createdAppId && (
        <Alert className="mb-4 py-1.5 px-2.5 border-emerald-200 bg-emerald-50/60">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-[12px] text-emerald-900">
            Создана новая заявка {createdAppId}
          </AlertTitle>
          <AlertDescription className="text-[10px] text-emerald-800/85 mt-0.5 leading-snug">
            Скопированы клиент, позиции и заметка. Активные брони/выезды не переносились.
          </AlertDescription>
        </Alert>
      )}

      {/* Stale-client soft alert */}
      {base.daysSinceLastOrder && base.daysSinceLastOrder > 60 && (
        <Alert className="mb-5 py-2 px-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-[12px]">Давно не было заказов</AlertTitle>
          <AlertDescription className="text-[11px] mt-0.5">
            Последний заказ был {base.daysSinceLastOrder} дн. назад. Стоит написать клиенту.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview */}
      <EntitySection title="Основные данные" className="mb-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-0">
          <PropertyRow
            icon={<FileText className="w-3 h-3" />}
            label="ID"
            value={<InlineValue>{base.id}</InlineValue>}
          />
          <PropertyRow
            icon={<UserIcon className="w-3 h-3" />}
            label="Тип"
            value={<InlineValue>{base.type === 'company' ? 'Юр. лицо' : 'Физ. лицо'}</InlineValue>}
          />
          <PropertyRow
            icon={base.type === 'company' ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
            label={base.type === 'company' ? 'Название' : 'ФИО'}
            value={
              canInlineEditClient ? (
                <InlineText
                  value={base.type === 'company' ? (base.displayName ?? '') : base.displayName}
                  ariaLabel={base.type === 'company' ? 'Название компании' : 'ФИО клиента'}
                  required
                  onSave={makeClientFieldSaver((v) => (
                    base.type === 'company' ? { company: v.trim() } : { name: v.trim() }
                  ))}
                />
              ) : (
                <InlineValue>{base.displayName}</InlineValue>
              )
            }
          />
          <PropertyRow
            icon={<Phone className="w-3 h-3" />}
            label="Основной телефон"
            value={
              canInlineEditClient ? (
                <InlineText
                  value={base.primaryPhone}
                  ariaLabel="Телефон клиента"
                  required
                  onSave={makeClientFieldSaver((v) => ({ phone: v.trim() }))}
                />
              ) : (
                <PhoneLink value={base.primaryPhone} />
              )
            }
          />
          <PropertyRow
            icon={<Mail className="w-3 h-3" />}
            label="Основной email"
            value={
              canInlineEditClient ? (
                <InlineText
                  value={base.primaryEmail ?? ''}
                  ariaLabel="Email клиента"
                  placeholder="Добавить email…"
                  emptyDisplay={<EmptyValue />}
                  onSave={makeClientFieldSaver((v) => ({ email: v.trim() || undefined }))}
                />
              ) : base.primaryEmail ? (
                <EmailLink value={base.primaryEmail} />
              ) : (
                <EmptyValue />
              )
            }
          />
          {base.manager && (
            <PropertyRow
              icon={<UserPlus className="w-3 h-3" />}
              label="Ответственный"
              value={<InlineValue>{base.manager}</InlineValue>}
            />
          )}
          <PropertyRow
            icon={<Calendar className="w-3 h-3" />}
            label="Создан"
            value={<InlineValue>{base.createdAt}</InlineValue>}
          />
          <PropertyRow
            icon={<Activity className="w-3 h-3" />}
            label="Последняя активность"
            value={<InlineValue>{base.lastActivity}</InlineValue>}
          />
          <PropertyRow
            icon={<Package className="w-3 h-3" />}
            label="Всего заказов"
            value={<InlineValue>{base.totalOrders}</InlineValue>}
          />
        </div>
      </EntitySection>

      {/* Contacts */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Контакты</div>
        </div>
        <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
          {base.contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-[10px] inline-flex items-center justify-center flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-gray-900 truncate">{c.name}</span>
                  {c.isPrimary && (
                    <span className={`${badgeBase} ${badgeTones.success}`}>
                      <CheckCircle2 className="w-3 h-3" /> Основной
                    </span>
                  )}
                  {c.role && (
                    <span className="text-[10px] text-gray-500">· {c.role}</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 flex-wrap">
                  <PhoneLink value={c.phone} />
                  {c.email ? <><span className="text-gray-300">·</span><EmailLink value={c.email} /></> : null}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {c.phone && (
                  <a
                    href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                    className="h-6 px-2 text-[11px] gap-1 inline-flex items-center rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Phone className="w-3 h-3" /> Позвонить
                  </a>
                )}
                {c.email && (
                  <a
                    href={`mailto:${c.email}`}
                    className="h-6 px-2 text-[11px] gap-1 inline-flex items-center rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Mail className="w-3 h-3" /> Написать
                  </a>
                )}
                {(c.phone || c.email) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => handleCopy(c.email || c.phone || '', `contact-${c.id}`)}
                    title="Скопировать"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedKey === `contact-${c.id}` ? 'Ok' : ''}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requisites */}
      {base.type === 'company' && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Реквизиты</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0">
            {base.requisites.inn && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="ИНН" value={<InlineValue>{base.requisites.inn}</InlineValue>} />
            )}
            {base.requisites.kpp && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="КПП" value={<InlineValue>{base.requisites.kpp}</InlineValue>} />
            )}
            {base.requisites.ogrn && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="ОГРН" value={<InlineValue>{base.requisites.ogrn}</InlineValue>} />
            )}
            {base.requisites.legalAddress && (
              <PropertyRow icon={<MapPin className="w-3 h-3" />} label="Юр. адрес" value={<InlineValue>{base.requisites.legalAddress}</InlineValue>} />
            )}
            {base.requisites.bankName && (
              <PropertyRow icon={<Building2 className="w-3 h-3" />} label="Банк" value={<InlineValue>{base.requisites.bankName}</InlineValue>} />
            )}
            {base.requisites.bankAccount && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="Расч. счёт" value={<InlineValue>{base.requisites.bankAccount}</InlineValue>} />
            )}
            {base.requisites.correspondentAccount && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="Корр. счёт" value={<InlineValue>{base.requisites.correspondentAccount}</InlineValue>} />
            )}
            {base.requisites.bik && (
              <PropertyRow icon={<FileText className="w-3 h-3" />} label="БИК" value={<InlineValue>{base.requisites.bik}</InlineValue>} />
            )}
          </div>
        </div>
      )}
      {base.type === 'person' && base.requisites.inn && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Реквизиты</div>
          <PropertyRow icon={<FileText className="w-3 h-3" />} label="ИНН" value={<InlineValue>{base.requisites.inn}</InlineValue>} />
        </div>
      )}

      {/* Business context */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Бизнес-контекст</div>
          {!canInlineEditClient && (
            <button
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
              onClick={() => setNotesEditing((v) => !v)}
            >
              <Edit3 className="w-3 h-3" /> {notesEditing ? 'Готово' : 'Редактировать заметки'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Любимые категории техники</div>
            <div className="flex flex-wrap gap-1">
              {base.favoriteCategories.map((f) => (
                <span key={f.category} className={`${badgeBase} ${badgeTones.source}`}>
                  <Truck className="w-3 h-3" />
                  {f.category}
                  <span className="text-[10px] text-gray-500">×{f.count}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Рабочие заметки</div>
            {canInlineEditClient ? (
              <div className="text-[11px] text-gray-700 leading-relaxed">
                <InlineText
                  value={base.workingNotes ?? ''}
                  ariaLabel="Рабочие заметки о клиенте"
                  placeholder="Условия работы, особенности, договорённости…"
                  multiline
                  emptyDisplay={<span className="text-gray-400 italic">Добавить заметку…</span>}
                  onSave={makeClientFieldSaver((v) => ({ notes: v.trim() || undefined }))}
                />
              </div>
            ) : notesEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Условия работы, особенности, договорённости…"
                className="text-[12px]"
              />
            ) : (
              <div className="text-[11px] text-gray-700 leading-relaxed">{notes || '—'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Active records summary inline */}
      {(base.activeRecords.applicationsCount +
        base.activeRecords.reservationsCount +
        base.activeRecords.departuresCount +
        base.activeRecords.leadsCount) > 0 && (
        <div className="mb-5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Активные записи</div>
          <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
            {base.activeRecords.topActiveApplication && (
              <ActiveRow
                icon={<FileText className="w-3.5 h-3.5 text-blue-500" />}
                label="Активная заявка"
                value={base.activeRecords.topActiveApplication.title}
              />
            )}
            {base.activeRecords.topActiveReservation && (
              <ActiveRow
                icon={<FileText className="w-3.5 h-3.5 text-blue-500" />}
                label="Активная бронь"
                value={base.activeRecords.topActiveReservation.title}
              />
            )}
            {base.activeRecords.topActiveDeparture && (
              <ActiveRow
                icon={<Truck className="w-3.5 h-3.5 text-blue-500" />}
                label="Активный выезд"
                value={base.activeRecords.topActiveDeparture.title}
              />
            )}
          </div>
        </div>
      )}

      {/* Repeat order — quick + history */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Повторный заказ</div>
        </div>

        {lastCompleted ? (
          <div className="border border-gray-200 rounded-md bg-white p-2.5 space-y-2 mb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-gray-500">Как в прошлый раз</div>
                <div className="text-[12px] text-gray-900 truncate">
                  {lastCompleted.equipmentSummary}
                </div>
                <div className="text-[10px] text-gray-500">
                  {lastCompleted.number} · {lastCompleted.date}
                  {lastCompleted.address ? ` · ${lastCompleted.address}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
                  onClick={() => handleRepeatFromOrder(lastCompleted)}
                >
                  Повторить как в прошлый раз
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 border border-dashed border-gray-200 rounded-md px-3 py-2 mb-2">
            У клиента ещё нет завершённых заказов — повтор недоступен.
          </div>
        )}

        {completedOrders.length > 0 && (
          <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
            {completedOrders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-gray-900">{o.number}</span>
                    <span className={`${badgeBase} ${orderStatusMeta[o.status].tone}`}>
                      {orderStatusMeta[o.status].label}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {o.date} · {o.equipmentSummary}
                    {o.address ? ` · ${o.address}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={() => handleRepeatFromOrder(o)}
                  >
                    <Copy className="w-3 h-3" /> Повторить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders history (full) */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">
            История заказов ({base.ordersHistory.length})
          </div>
        </div>
        <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
          {base.ordersHistory.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-3 py-1.5">
              <span className={`${badgeBase} ${orderStatusMeta[o.status].tone} flex-shrink-0`}>
                {orderStatusMeta[o.status].label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-900">{o.number}</span>
                  <span className="text-[10px] text-gray-500">· {o.date}</span>
                  {o.amount && (
                    <span className="text-[10px] text-gray-500">· {o.amount}</span>
                  )}
                  {o.hasActiveReservation && (
                    <span className={`${badgeBase} ${badgeTones.progress}`}>Бронь</span>
                  )}
                  {o.hasActiveDeparture && (
                    <span className={`${badgeBase} ${badgeTones.progress}`}>Выезд</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{o.equipmentSummary}{o.address ? ` · ${o.address}` : ''}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {o.status === 'completed' && (
                  <button
                    className="text-[11px] text-blue-600 hover:underline"
                    onClick={() => handleRepeatFromOrder(o)}
                  >
                    Повторить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leads history */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">
            История лидов ({base.leadsHistory.length})
          </div>
        </div>
        <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-200 overflow-hidden">
          {base.leadsHistory.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-3 py-1.5">
              <span className={`${badgeBase} ${leadStatusMeta[l.status].tone} flex-shrink-0`}>
                {leadStatusMeta[l.status].label}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-900">{l.id}</span>
                  <span className="text-[10px] text-gray-500">· {l.date}</span>
                  <span className="text-[10px] text-gray-500">· {l.source}</span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {l.equipmentType}{l.address ? ` · ${l.address}` : ''} · {l.manager}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment / notes */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] text-gray-500 uppercase tracking-wide">Комментарий</div>
          <button
            className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800"
            onClick={() => setCommentEditing((v) => !v)}
          >
            <Edit3 className="w-3 h-3" /> {commentEditing ? 'Готово' : 'Редактировать'}
          </button>
        </div>
        {commentEditing ? (
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Внутренние заметки и контекст…"
            className="text-[12px]"
          />
        ) : (
          <div className="text-[11px] text-gray-700 leading-relaxed">{comment || '—'}</div>
        )}
      </div>

      {/* Quick links */}
      <div className="space-y-0.5 mb-6">
        <ActionButton
          icon={<UserPlus className="w-3.5 h-3.5" />}
          label="Создать лид"
          onClick={() => setIsNewLeadOpen(true)}
        />
        {lastCompleted ? (
          <ActionButton
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Создать заявку (повторить заказ)"
            onClick={() => handleRepeatFromOrder(lastCompleted)}
          />
        ) : null}
      </div>

      {/* Possible duplicates */}
      {base.possibleDuplicates.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Возможные дубли</div>
          <div className="border border-amber-200 rounded-md bg-amber-50/40 divide-y divide-amber-100 overflow-hidden">
            {base.possibleDuplicates.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                <span className="text-gray-900">{d.name}</span>
                <span className="text-gray-500 truncate">· {d.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">
          Журнал изменений
        </div>
        <div className="space-y-2">
          {base.activity.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-gray-300 fill-gray-300 flex-shrink-0" />
              <span className="text-gray-900">{a.actor}</span>
              <span className="text-gray-500 truncate">{a.message}</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">{a.at}</span>
            </div>
          ))}
          {createdAppId && (
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400 flex-shrink-0" />
              <span className="text-gray-900">{base.manager ?? 'Менеджер'}</span>
              <span className="text-gray-500 truncate">Повтор заказа → {createdAppId}</span>
              <span className="text-gray-400 ml-auto flex-shrink-0">только что</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <SidebarSection title="Статус">
        <SidebarField
          label="Тип"
          value={
            <span className={`${badgeBase} ${badgeTones.source}`}>
              {base.type === 'company' ? 'Юр. лицо' : 'Физ. лицо'}
            </span>
          }
        />
        {base.manager && <SidebarField label="Менеджер" value={base.manager} />}
        <SidebarField label="Создан" value={base.createdAt} />
        <SidebarField label="Обновлён" value={base.updatedAt} />
        <SidebarField label="Заказов" value={String(base.totalOrders)} />
        {base.totalRevenue && <SidebarField label="Оборот" value={base.totalRevenue} />}
        {typeof base.daysSinceLastOrder === 'number' && (
          <SidebarField
            label="Был заказ"
            value={`${base.daysSinceLastOrder} дн. назад`}
          />
        )}
      </SidebarSection>

      <SidebarSection title="Активные записи">
        <div className="space-y-1">
          <ActiveCounter label="Лиды" count={base.activeRecords.leadsCount} />
          <ActiveCounter label="Заявки" count={base.activeRecords.applicationsCount} />
          <ActiveCounter label="Брони" count={base.activeRecords.reservationsCount} />
          <ActiveCounter label="Выезды" count={base.activeRecords.departuresCount} />
        </div>
      </SidebarSection>

      <SidebarSection title="Любимые категории">
        <div className="flex flex-wrap gap-1">
          {base.favoriteCategories.map((f) => (
            <span key={f.category} className={`${badgeBase} ${badgeTones.source}`}>
              <Truck className="w-3 h-3" />
              {f.category}
              <span className="text-[10px] text-gray-500">×{f.count}</span>
            </span>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title="Быстрый repeat order">
        {lastCompleted ? (
          <>
            <div className="text-[11px] text-gray-700 leading-snug">
              {lastCompleted.equipmentSummary}
            </div>
            <div className="text-[10px] text-gray-500">
              {lastCompleted.number} · {lastCompleted.date}
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                className="h-7 w-full text-[11px] bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleRepeatFromOrder(lastCompleted)}
              >
                <Copy className="w-3 h-3 mr-1" /> Повторить заказ
              </Button>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-gray-500">Нет завершённых заказов.</div>
        )}
      </SidebarSection>

      <SidebarSection title="Связанные записи">
        {base.activeRecords.topActiveApplication && (
          <SidebarField
            label="Заявка"
            value={
              <span className="text-gray-700">
                {base.activeRecords.topActiveApplication.title}
              </span>
            }
          />
        )}
        {base.activeRecords.topActiveReservation && (
          <SidebarField
            label="Бронь"
            value={
              <span className="text-gray-700">
                {base.activeRecords.topActiveReservation.title}
              </span>
            }
          />
        )}
        {base.activeRecords.topActiveDeparture && (
          <SidebarField
            label="Выезд"
            value={
              <span className="text-gray-700">
                {base.activeRecords.topActiveDeparture.title}
              </span>
            }
          />
        )}
        <SidebarField
          label="Последний завершён"
          value={
            lastCompleted ? (
              <span className="text-gray-700">
                {lastCompleted.number}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )
          }
        />
        <SidebarField
          label="Лиды"
          value={`${base.leadsHistory.length} в истории`}
        />
      </SidebarSection>

      <SidebarSection title="Последние изменения" defaultOpen={false}>
        <div className="space-y-1">
          {base.activity.slice(-3).map((a) => (
            <div key={a.id} className="text-[10px] text-gray-500 leading-tight">
              <span className="text-gray-700">{a.actor}</span> · {a.message}
              <div className="text-gray-500">{a.at}</div>
            </div>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection title="Быстрые действия" defaultOpen={false}>
        <div className="space-y-1">
          <a
            href={telHref ?? undefined}
            aria-disabled={!telHref}
            className={`h-6 w-full justify-start text-[11px] inline-flex items-center rounded border border-gray-200 px-2 ${telHref ? 'hover:bg-gray-50 text-gray-700' : 'opacity-50 pointer-events-none text-gray-400'}`}
          >
            <Phone className="w-3 h-3 mr-1" /> Позвонить
          </a>
          <a
            href={mailHref ?? undefined}
            aria-disabled={!mailHref}
            className={`h-6 w-full justify-start text-[11px] inline-flex items-center rounded border border-gray-200 px-2 ${mailHref ? 'hover:bg-gray-50 text-gray-700' : 'opacity-50 pointer-events-none text-gray-400'}`}
          >
            <MessageSquare className="w-3 h-3 mr-1" /> Написать
          </a>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-full justify-start text-[11px]"
            onClick={() => setIsNewLeadOpen(true)}
          >
            <UserPlus className="w-3 h-3 mr-1" /> Создать лид
          </Button>
          {lastCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => handleRepeatFromOrder(lastCompleted)}
            >
              <Copy className="w-3 h-3 mr-1" /> Повторить заказ
            </Button>
          )}
          {canInlineEditClient && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-full justify-start text-[11px]"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit3 className="w-3 h-3 mr-1" /> Редактировать
            </Button>
          )}
        </div>
      </SidebarSection>
    </>
  );

  return (
    <>
      <DetailShell
        breadcrumb={<Breadcrumb items={['CRM', 'Sales', 'Clients']} />}
        onClose={onClose}
        main={main}
        sidebar={sidebar}
      />
      <RepeatOrderDialog
        open={repeatOpen}
        onOpenChange={setRepeatOpen}
        source={repeatSource}
        clientName={base.displayName}
        defaultManager={base.manager}
        onConfirm={handleConfirmRepeat}
      />
      <NewLeadDialog
        open={isNewLeadOpen}
        onOpenChange={setIsNewLeadOpen}
        prefill={leadPrefill}
      />
      {canInlineEditClient && (
        <EditClientDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          client={clientQuery.data ?? null}
        />
      )}
    </>
  );
}

function ActiveRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <span className="flex-shrink-0">{icon}</span>
      <div className="text-[11px] text-gray-500 w-[120px] flex-shrink-0">{label}</div>
      <div className="flex-1 min-w-0 text-[11px] text-gray-700 truncate">
        {value}
      </div>
    </div>
  );
}

function ActiveCounter({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {count > 0 ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
      ) : (
        <Circle className="w-3 h-3 text-gray-300 flex-shrink-0" />
      )}
      <span className={count > 0 ? 'text-gray-700' : 'text-gray-500'}>{label}</span>
      <span className="ml-auto text-[10px] text-gray-500">{count}</span>
    </div>
  );
}

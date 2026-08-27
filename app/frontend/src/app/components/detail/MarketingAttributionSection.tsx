import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Fingerprint,
  Globe2,
  LoaderCircle,
  MousePointerClick,
  Send,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { LeadAttributionApi, MetrikaConversionApi } from '../../lib/leadsApi';
import { EntitySection } from './EntityModalFramework';

interface MarketingAttributionSectionProps {
  attributions?: LeadAttributionApi[];
  conversions?: MetrikaConversionApi[];
}

interface ConversionPresentation {
  label: string;
  className: string;
  Icon: typeof CheckCircle2;
  detail?: string;
}

const CONVERSION_TARGETS = [
  { target: 'MARKETING_QUAL', label: 'Маркетинговый квал', goalId: '601866056' },
  { target: 'SALES_QUAL', label: 'Квалифицированный', goalId: '601866057' },
] as const;

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function pluralizeSubmissions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} отправка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} отправки`;
  return `${count} отправок`;
}

function maskClientId(value: string | null): string {
  if (!value) return '—';
  const visible = value.slice(-6);
  return `${'•'.repeat(Math.min(8, Math.max(4, value.length - visible.length)))}${visible}`;
}

function compactIdentifier(value: string | null): string {
  if (!value) return '—';
  if (value.length <= 20) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function AttributionValue({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <div
      className={`min-w-0 break-words text-[11px] leading-4 text-gray-800 ${mono ? 'font-mono' : ''}`}
    >
      {children}
    </div>
  );
}

function AttributionField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-md border border-gray-200 bg-white px-3 py-2 ${className}`}>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      {children}
    </div>
  );
}

function UrlValue({ value, emptyText = 'Прямой заход' }: { value: string | null; emptyText?: string }) {
  if (!value) return <AttributionValue><span className="text-gray-500">{emptyText}</span></AttributionValue>;
  if (!isExternalUrl(value)) return <AttributionValue>{value}</AttributionValue>;
  return (
    <AttributionValue>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="inline-flex max-w-full items-center gap-1 text-blue-600 hover:underline"
        title={value}
      >
        <span className="truncate">{value}</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    </AttributionValue>
  );
}

function conversionPresentation(conversion?: MetrikaConversionApi): ConversionPresentation {
  if (!conversion) {
    return {
      label: 'Не отправлялась',
      className: 'border-gray-200 bg-gray-50 text-gray-600',
      Icon: Clock3,
    };
  }

  if (conversion.status === 'sent') {
    return {
      label: 'Отправлена',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: CheckCircle2,
      detail: formatDateTime(conversion.sentAt) ?? undefined,
    };
  }

  if (conversion.status === 'processing') {
    return {
      label: 'Отправляется',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      Icon: LoaderCircle,
      detail: conversion.attempts > 0 ? `Попытка ${conversion.attempts}` : undefined,
    };
  }

  if (conversion.status === 'waiting_identity') {
    return {
      label: 'Ожидает ClientID или yclid',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      Icon: Clock3,
      detail: formatDateTime(conversion.nextAttemptAt)
        ? `Повтор ${formatDateTime(conversion.nextAttemptAt)}`
        : undefined,
    };
  }

  if (conversion.status === 'failed') {
    const nextAttempt = formatDateTime(conversion.nextAttemptAt);
    return {
      label: 'Ошибка отправки',
      className: 'border-red-200 bg-red-50 text-red-700',
      Icon: AlertCircle,
      detail: nextAttempt
        ? `Автоповтор ${nextAttempt}`
        : conversion.lastErrorCode ?? undefined,
    };
  }

  return {
    label: 'Ожидает отправки',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    Icon: Clock3,
    detail: formatDateTime(conversion.nextAttemptAt) ?? undefined,
  };
}

function ConversionCard({
  label,
  goalId,
  conversion,
}: {
  label: string;
  goalId: string;
  conversion?: MetrikaConversionApi;
}) {
  const presentation = conversionPresentation(conversion);
  const { Icon } = presentation;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <Send className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-gray-800">{label}</div>
          <div className="mt-0.5 text-[10px] text-gray-500">Цель {goalId}</div>
        </div>
        <span
          className={`inline-flex max-w-[190px] flex-shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-4 ${presentation.className}`}
        >
          <Icon className={`h-3 w-3 flex-shrink-0 ${conversion?.status === 'processing' ? 'animate-spin' : ''}`} />
          <span>{presentation.label}</span>
        </span>
      </div>
      {presentation.detail ? (
        <div className="mt-1.5 pl-5.5 text-[10px] text-gray-500">{presentation.detail}</div>
      ) : null}
    </div>
  );
}

export function MarketingAttributionSection({
  attributions = [],
  conversions = [],
}: MarketingAttributionSectionProps) {
  const latestAttribution = attributions.at(-1);
  const utmValues = latestAttribution
    ? ([
        ['source', latestAttribution.utmSource],
        ['medium', latestAttribution.utmMedium],
        ['campaign', latestAttribution.utmCampaign],
        ['content', latestAttribution.utmContent],
        ['term', latestAttribution.utmTerm],
      ] as Array<[string, string | null]>).filter((item): item is [string, string] => Boolean(item[1]))
    : [];

  return (
    <EntitySection
      title="Маркетинговая атрибуция"
      action={
        attributions.length > 0 ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
            {pluralizeSubmissions(attributions.length)}
          </span>
        ) : null
      }
    >
      <div className="space-y-3" data-testid="marketing-attribution-section">
        {latestAttribution ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <div className="mb-3 flex items-start gap-2">
              <Globe2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-gray-800">Последняя отправка формы с сайта</div>
                <div className="mt-0.5 text-[10px] text-gray-500">
                  {formatDateTime(latestAttribution.capturedAt) ?? 'Время не указано'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AttributionField label="ClientID Яндекс Метрики">
                <AttributionValue mono>{maskClientId(latestAttribution.metrikaClientId)}</AttributionValue>
              </AttributionField>
              <AttributionField label="yclid">
                <AttributionValue mono>
                  <span title={latestAttribution.yclid ?? undefined}>
                    {compactIdentifier(latestAttribution.yclid)}
                  </span>
                </AttributionValue>
              </AttributionField>
              <AttributionField label="UTM-метки" className="sm:col-span-2">
                {utmValues.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {utmValues.map(([key, value]) => (
                      <span
                        key={key}
                        className="max-w-full rounded border border-blue-100 bg-white px-1.5 py-0.5 text-[10px] text-gray-700"
                        title={`${key}: ${value}`}
                      >
                        <span className="text-gray-400">{key}=</span>{value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <AttributionValue><span className="text-gray-500">Не переданы</span></AttributionValue>
                )}
              </AttributionField>
              <AttributionField label="Первая посадочная страница">
                <UrlValue value={latestAttribution.firstLandingPage} emptyText="Не передана" />
              </AttributionField>
              <AttributionField label="Referrer">
                <UrlValue value={latestAttribution.referrer} />
              </AttributionField>
              <AttributionField label="ID отправки формы" className="sm:col-span-2">
                <div className="flex min-w-0 items-start gap-1.5">
                  <Fingerprint className="mt-0.5 h-3 w-3 flex-shrink-0 text-gray-400" />
                  <AttributionValue mono>{latestAttribution.submissionId}</AttributionValue>
                </div>
              </AttributionField>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
            <MousePointerClick className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
            <div>
              <div className="text-[11px] text-gray-700">Данных с сайта нет</div>
              <div className="mt-0.5 text-[10px] text-gray-500">
                Лид создан вручную или форма не передала маркетинговые параметры.
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-gray-500">Конверсии в Яндекс Метрику</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CONVERSION_TARGETS.map((item) => (
              <ConversionCard
                key={item.target}
                label={item.label}
                goalId={item.goalId}
                conversion={conversions.find((conversion) => conversion.target === item.target)}
              />
            ))}
          </div>
        </div>
      </div>
    </EntitySection>
  );
}

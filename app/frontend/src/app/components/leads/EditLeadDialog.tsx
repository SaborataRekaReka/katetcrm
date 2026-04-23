/**
 * EditLeadDialog — shell-редактирование лида.
 *
 * Тот же EntityModalFramework, что у NewLeadDialog / LeadDetailModal — но
 * работает в режиме edit (используется `useUpdateLead`). Save disabled пока
 * ничего не изменено или сломаны required-поля.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Radio,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  EntityMetaGrid,
  EntityModalHeader,
  EntityModalShell,
  EntitySection,
} from '../detail/EntityModalFramework';
import { PropertyRow } from '../detail/DetailShell';
import {
  FieldInput,
  FieldSelect,
  FieldTextarea,
  ShellDialog,
} from '../detail/ShellFormPrimitives';
import { useUpdateLead } from '../../hooks/useLeadMutations';
import type { Lead } from '../../types/kanban';
import type { SourceChannel } from '../../lib/leadsApi';

type EditLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
};

type FormState = {
  contactName: string;
  contactCompany: string;
  contactPhone: string;
  source: SourceChannel;
  equipmentTypeHint: string;
  requestedDate: string;
  address: string;
  comment: string;
};

const SOURCE_OPTIONS: { value: SourceChannel; label: string }[] = [
  { value: 'manual', label: 'Ручной ввод' },
  { value: 'site', label: 'Сайт' },
  { value: 'mango', label: 'Mango (звонок)' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'other', label: 'Другое' },
];

function leadToForm(lead: Lead): FormState {
  const sourceValue = (SOURCE_OPTIONS.find((o) => o.value === lead.sourceChannel)?.value ?? 'manual') as SourceChannel;
  return {
    contactName: lead.client ?? '',
    contactCompany: lead.company ?? '',
    contactPhone: lead.phone ?? '',
    source: sourceValue,
    equipmentTypeHint: lead.equipmentType === '—' ? '' : lead.equipmentType ?? '',
    requestedDate: lead.date ?? '',
    address: lead.address ?? '',
    comment: '',
  };
}

export function EditLeadDialog({ open, onOpenChange, lead }: EditLeadDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateLead();

  useEffect(() => {
    if (open && lead) {
      const next = leadToForm(lead);
      setForm(next);
      setInitial(next);
      setTouched(false);
      setError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const nameValid = !!form && form.contactName.trim().length >= 2;
  const phoneValid = !!form && form.contactPhone.trim().length >= 3;
  const dirty = useMemo(() => {
    if (!form || !initial) return false;
    return (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);
  }, [form, initial]);
  const canSave = nameValid && phoneValid && dirty && !mutation.isPending;

  const submit = async () => {
    setTouched(true);
    if (!form || !lead || !canSave) return;
    setError(null);
    try {
      await mutation.mutateAsync({
        id: lead.id,
        patch: {
          contactName: form.contactName.trim(),
          contactCompany: form.contactCompany.trim() || null,
          contactPhone: form.contactPhone.trim(),
          source: form.source,
          equipmentTypeHint: form.equipmentTypeHint.trim() || null,
          requestedDate: form.requestedDate || null,
          address: form.address.trim() || null,
          ...(form.comment.trim() ? { comment: form.comment.trim() } : {}),
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  if (!form || !lead) {
    return (
      <ShellDialog open={open} onOpenChange={onOpenChange}>
        <EntityModalShell>
          <div className="p-6 text-[12px] text-muted-foreground">Загружаем…</div>
        </EntityModalShell>
      </ShellDialog>
    );
  }

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<UserIcon className="h-3 w-3 text-gray-500" />}
          entityLabel="Лид"
          title={lead.client || 'Лид'}
          subtitle="Редактирование данных лида."
          primaryAction={{
            label: mutation.isPending ? 'Сохраняем…' : 'Сохранить',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Контакт">
            <EntityMetaGrid>
              <PropertyRow
                icon={<UserIcon className="h-3 w-3" />}
                label="Имя *"
                value={
                  <FieldInput
                    value={form.contactName}
                    onChange={(v) => {
                      set('contactName', v);
                      setTouched(true);
                    }}
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="Компания"
                value={
                  <FieldInput
                    value={form.contactCompany}
                    onChange={(v) => set('contactCompany', v)}
                  />
                }
              />
              <PropertyRow
                icon={<Phone className="h-3 w-3" />}
                label="Телефон *"
                value={
                  <FieldInput
                    type="tel"
                    value={form.contactPhone}
                    onChange={(v) => {
                      set('contactPhone', v);
                      setTouched(true);
                    }}
                    invalid={touched && !phoneValid}
                  />
                }
              />
              <PropertyRow
                icon={<Radio className="h-3 w-3" />}
                label="Источник"
                value={
                  <FieldSelect
                    value={form.source}
                    onChange={(v) => set('source', v as SourceChannel)}
                    options={SOURCE_OPTIONS}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Запрос клиента">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Package className="h-3 w-3" />}
                label="Тип техники"
                value={
                  <FieldInput
                    value={form.equipmentTypeHint}
                    onChange={(v) => set('equipmentTypeHint', v)}
                  />
                }
              />
              <PropertyRow
                icon={<Calendar className="h-3 w-3" />}
                label="Желаемая дата"
                value={
                  <FieldInput
                    type="date"
                    value={form.requestedDate}
                    onChange={(v) => set('requestedDate', v)}
                  />
                }
              />
              <PropertyRow
                icon={<MapPin className="h-3 w-3" />}
                label="Адрес"
                value={
                  <FieldInput
                    value={form.address}
                    onChange={(v) => set('address', v)}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Комментарий">
            <PropertyRow
              icon={<MessageSquare className="h-3 w-3" />}
              label="Заметки"
              value={
                <FieldTextarea
                  value={form.comment}
                  onChange={(v) => set('comment', v)}
                  placeholder="Добавить комментарий к изменению"
                  rows={3}
                />
              }
            />
          </EntitySection>

          {error && (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>
      </EntityModalShell>
    </ShellDialog>
  );
}

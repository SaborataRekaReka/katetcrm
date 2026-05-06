/**
 * NewLeadDialog — shell-create для Лида.
 *
 * Mode: create-only. Использует тот же EntityModalFramework, что и
 * LeadDetailModal — пустая форма в shell-модалке, Save disabled пока не
 * заполнены обязательные поля (имя + телефон).
 */

import { useEffect, useState } from 'react';
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
import { useCreateLead } from '../../hooks/useLeadMutations';
import type { SourceChannel } from '../../lib/leadsApi';

type LeadPrefill = Partial<{
  contactName: string;
  contactCompany: string;
  contactPhone: string;
  clientId: string;
}>;

type NewLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: LeadPrefill;
  onCreated?: (leadId: string) => void;
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

const EMPTY_FORM: FormState = {
  contactName: '',
  contactCompany: '',
  contactPhone: '',
  source: 'manual',
  equipmentTypeHint: '',
  requestedDate: '',
  address: '',
  comment: '',
};

const SOURCE_OPTIONS: { value: SourceChannel; label: string }[] = [
  { value: 'manual', label: 'Ручной ввод' },
  { value: 'site', label: 'Сайт' },
  { value: 'mango', label: 'Mango (звонок)' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'other', label: 'Другое' },
];

export function NewLeadDialog({ open, onOpenChange, prefill, onCreated }: NewLeadDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateLead();

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY_FORM,
      contactName: prefill?.contactName ?? '',
      contactCompany: prefill?.contactCompany ?? '',
      contactPhone: prefill?.contactPhone ?? '',
    });
    setTouched(false);
    setError(null);
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const nameValid = form.contactName.trim().length >= 2;
  const phoneValid = form.contactPhone.trim().length >= 3;
  const canSave = nameValid && phoneValid && !mutation.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    try {
      const result = await mutation.mutateAsync({
        contactName: form.contactName.trim(),
        contactCompany: form.contactCompany.trim() || undefined,
        contactPhone: form.contactPhone.trim(),
        clientId: prefill?.clientId,
        source: form.source,
        equipmentTypeHint: form.equipmentTypeHint.trim() || undefined,
        requestedDate: form.requestedDate || undefined,
        address: form.address.trim() || undefined,
        comment: form.comment.trim() || undefined,
      });
      onOpenChange(false);
      onCreated?.(result.lead.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать лид');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<UserIcon className="h-3 w-3 text-gray-500" />}
          entityLabel="Лид"
          title="Новый лид"
          subtitle="Заполните имя и телефон контакта — остальное можно дозаполнить позже."
          primaryAction={{
            label: mutation.isPending ? 'Создаём…' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mutation.isPending ? 'Создаём…' : 'Создать'}
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
                    placeholder="Иван Иванов"
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
                    placeholder="ООО Ромашка"
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
                    placeholder="+7 (999) 000-00-00"
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
                    placeholder="Самосвал, эвакуатор…"
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
                    placeholder="Москва, ул. ..."
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
                  placeholder="Детали разговора, предпочтения клиента"
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

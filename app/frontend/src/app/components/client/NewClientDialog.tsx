/**
 * NewClientDialog — shell-create для Клиента.
 *
 * Один и тот же shell, что и у LeadDetailModal / NewLeadDialog. Save disabled
 * пока не заполнены обязательные поля (имя + телефон).
 */

import { useEffect, useState } from 'react';
import {
  Building2,
  Mail,
  MessageSquare,
  Phone,
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
  FieldTextarea,
  ShellDialog,
} from '../detail/ShellFormPrimitives';
import { useCreateClient } from '../../hooks/useClientMutations';

type NewClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormState = {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  phone: '',
  email: '',
  notes: '',
};

export function NewClientDialog({ open, onOpenChange }: NewClientDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateClient();

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setTouched(false);
    setError(null);
    mutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const nameValid = form.name.trim().length >= 2;
  const phoneValid = form.phone.trim().length >= 3;
  const canSave = nameValid && phoneValid && !mutation.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    try {
      await mutation.mutateAsync({
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать клиента');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<UserIcon className="h-3 w-3 text-gray-500" />}
          entityLabel="Клиент"
          title="Новый клиент"
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
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
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
                    value={form.company}
                    onChange={(v) => set('company', v)}
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
                    value={form.phone}
                    onChange={(v) => {
                      set('phone', v);
                      setTouched(true);
                    }}
                    placeholder="+7 (999) 000-00-00"
                    invalid={touched && !phoneValid}
                  />
                }
              />
              <PropertyRow
                icon={<Mail className="h-3 w-3" />}
                label="Email"
                value={
                  <FieldInput
                    type="email"
                    value={form.email}
                    onChange={(v) => set('email', v)}
                    placeholder="client@example.com"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Заметки">
            <PropertyRow
              icon={<MessageSquare className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={form.notes}
                  onChange={(v) => set('notes', v)}
                  placeholder="Особенности клиента, предпочтения"
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

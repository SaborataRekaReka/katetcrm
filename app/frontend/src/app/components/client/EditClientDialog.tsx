/**
 * EditClientDialog — shell-редактирование клиента.
 *
 * Тот же EntityModalFramework, что у NewClientDialog — работает в режиме edit
 * через `useUpdateClient`. Save disabled пока ничего не изменено или сломаны
 * required-поля.
 */

import { useEffect, useMemo, useState } from 'react';
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
import { useUpdateClient } from '../../hooks/useClientMutations';
import type { ClientDetailApi } from '../../lib/clientsApi';

type EditClientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDetailApi | null;
};

type FormState = {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
};

function clientToForm(c: ClientDetailApi): FormState {
  return {
    name: c.name ?? '',
    company: c.company ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    notes: c.notes ?? '',
  };
}

export function EditClientDialog({ open, onOpenChange, client }: EditClientDialogProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateClient();

  useEffect(() => {
    if (open && client) {
      const next = clientToForm(client);
      setForm(next);
      setInitial(next);
      setTouched(false);
      setError(null);
      mutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const nameValid = !!form && form.name.trim().length >= 2;
  const phoneValid = !!form && form.phone.trim().length >= 3;
  const dirty = useMemo(() => {
    if (!form || !initial) return false;
    return (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== initial[k]);
  }, [form, initial]);
  const canSave = nameValid && phoneValid && dirty && !mutation.isPending;

  const submit = async () => {
    setTouched(true);
    if (!form || !client || !canSave) return;
    setError(null);
    try {
      await mutation.mutateAsync({
        id: client.id,
        patch: {
          name: form.name.trim(),
          company: form.company.trim() || undefined,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  if (!form || !client) {
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
          entityLabel="Клиент"
          title={client.company || client.name}
          subtitle="Редактирование данных клиента."
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
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
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
                    value={form.company}
                    onChange={(v) => set('company', v)}
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

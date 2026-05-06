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
  Plus,
  Phone,
  Trash2,
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
  FieldCheckbox,
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
  contacts: ContactFormState[];
  requisites: RequisitesFormState;
};

type ContactFormState = {
  localId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
};

type RequisitesFormState = {
  inn: string;
  kpp: string;
  ogrn: string;
  legalAddress: string;
  bankName: string;
  bankAccount: string;
  correspondentAccount: string;
  bik: string;
};

function createContactLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

function createContactDraft(partial: Partial<ContactFormState> = {}): ContactFormState {
  return {
    localId: partial.localId ?? createContactLocalId(),
    name: partial.name ?? '',
    role: partial.role ?? '',
    phone: partial.phone ?? '',
    email: partial.email ?? '',
    isPrimary: partial.isPrimary ?? false,
  };
}

function createRequisitesDraft(): RequisitesFormState {
  return {
    inn: '',
    kpp: '',
    ogrn: '',
    legalAddress: '',
    bankName: '',
    bankAccount: '',
    correspondentAccount: '',
    bik: '',
  };
}

function clientToForm(c: ClientDetailApi): FormState {
  return {
    name: c.name ?? '',
    company: c.company ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    notes: c.notes ?? '',
    contacts: (c.contacts ?? []).map((contact, index) =>
      createContactDraft({
        name: contact.name ?? '',
        role: contact.role ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        isPrimary: contact.isPrimary ?? index === 0,
      }),
    ),
    requisites: {
      ...createRequisitesDraft(),
      ...(c.requisites
        ? {
            inn: c.requisites.inn ?? '',
            kpp: c.requisites.kpp ?? '',
            ogrn: c.requisites.ogrn ?? '',
            legalAddress: c.requisites.legalAddress ?? '',
            bankName: c.requisites.bankName ?? '',
            bankAccount: c.requisites.bankAccount ?? '',
            correspondentAccount: c.requisites.correspondentAccount ?? '',
            bik: c.requisites.bik ?? '',
          }
        : {}),
    },
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

  const setRequisites = <K extends keyof RequisitesFormState>(
    key: K,
    value: RequisitesFormState[K],
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            requisites: {
              ...prev.requisites,
              [key]: value,
            },
          }
        : prev,
    );
  };

  const setContact = <K extends keyof ContactFormState>(
    localId: string,
    key: K,
    value: ContactFormState[K],
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            contacts: prev.contacts.map((contact) =>
              contact.localId === localId
                ? {
                    ...contact,
                    [key]: value,
                  }
                : contact,
            ),
          }
        : prev,
    );
  };

  const setPrimaryContact = (localId: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            contacts: prev.contacts.map((contact) => ({
              ...contact,
              isPrimary: contact.localId === localId,
            })),
          }
        : prev,
    );
  };

  const addContact = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            contacts: [
              ...prev.contacts,
              createContactDraft({
                isPrimary: prev.contacts.length === 0,
              }),
            ],
          }
        : prev,
    );
  };

  const removeContact = (localId: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const filtered = prev.contacts.filter((contact) => contact.localId !== localId);
      if (filtered.length === 0) {
        return {
          ...prev,
          contacts: [],
        };
      }

      const hasPrimary = filtered.some((contact) => contact.isPrimary);
      return {
        ...prev,
        contacts: filtered.map((contact, index) => ({
          ...contact,
          isPrimary: hasPrimary ? contact.isPrimary : index === 0,
        })),
      };
    });
  };

  const nameValid = !!form && form.name.trim().length >= 2;
  const phoneValid = !!form && form.phone.trim().length >= 3;
  const contactsValid =
    !!form && form.contacts.every((contact) => contact.name.trim().length >= 1);
  const dirty = useMemo(() => {
    if (!form || !initial) return false;
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial]);
  const canSave = nameValid && phoneValid && contactsValid && dirty && !mutation.isPending;

  const submit = async () => {
    setTouched(true);
    if (!form || !client || !canSave) return;

    const normalizedContacts = form.contacts
      .map((contact) => ({
        name: contact.name.trim(),
        role: contact.role.trim() || undefined,
        phone: contact.phone.trim() || undefined,
        email: contact.email.trim() || undefined,
        isPrimary: contact.isPrimary,
      }))
      .filter(
        (contact) =>
          contact.name.length > 0
          || !!contact.phone
          || !!contact.email
          || !!contact.role,
      );
    const hasPrimaryContact = normalizedContacts.some((contact) => contact.isPrimary);
    const contactsPatch = normalizedContacts.map((contact, index) => ({
      ...contact,
      isPrimary: hasPrimaryContact ? contact.isPrimary : index === 0,
    }));

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
          contacts: contactsPatch,
          requisites: {
            inn: form.requisites.inn.trim() || undefined,
            kpp: form.requisites.kpp.trim() || undefined,
            ogrn: form.requisites.ogrn.trim() || undefined,
            legalAddress: form.requisites.legalAddress.trim() || undefined,
            bankName: form.requisites.bankName.trim() || undefined,
            bankAccount: form.requisites.bankAccount.trim() || undefined,
            correspondentAccount: form.requisites.correspondentAccount.trim() || undefined,
            bik: form.requisites.bik.trim() || undefined,
          },
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
                label="Эл. почта"
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

          <EntitySection title="Контактные лица">
            <div className="space-y-2">
              {form.contacts.length > 0 ? (
                form.contacts.map((contact, index) => (
                  <div
                    key={contact.localId}
                    className="rounded border border-gray-200 bg-white/80 p-2"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-600">Контакт #{index + 1}</div>
                      <div className="flex items-center gap-3">
                        <FieldCheckbox
                          checked={contact.isPrimary}
                          onChange={(checked) => {
                            setTouched(true);
                            if (checked) setPrimaryContact(contact.localId);
                            else setContact(contact.localId, 'isPrimary', false);
                          }}
                          label="Основной"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => {
                            setTouched(true);
                            removeContact(contact.localId);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Удалить
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FieldInput
                        value={contact.name}
                        onChange={(v) => {
                          setTouched(true);
                          setContact(contact.localId, 'name', v);
                        }}
                        placeholder="Имя контакта"
                        invalid={touched && contact.name.trim().length < 1}
                      />
                      <FieldInput
                        value={contact.role}
                        onChange={(v) => {
                          setTouched(true);
                          setContact(contact.localId, 'role', v);
                        }}
                        placeholder="Роль"
                      />
                      <FieldInput
                        type="tel"
                        value={contact.phone}
                        onChange={(v) => {
                          setTouched(true);
                          setContact(contact.localId, 'phone', v);
                        }}
                        placeholder="Телефон"
                      />
                      <FieldInput
                        type="email"
                        value={contact.email}
                        onChange={(v) => {
                          setTouched(true);
                          setContact(contact.localId, 'email', v);
                        }}
                        placeholder="Эл. почта"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded border border-dashed border-gray-200 px-3 py-2 text-[11px] text-gray-500">
                  Контакты не добавлены.
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px]"
                onClick={() => {
                  setTouched(true);
                  addContact();
                }}
              >
                <Plus className="h-3 w-3" />
                Добавить контакт
              </Button>
            </div>
          </EntitySection>

          <EntitySection title="Реквизиты">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="ИНН"
                value={
                  <FieldInput
                    value={form.requisites.inn}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('inn', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="КПП"
                value={
                  <FieldInput
                    value={form.requisites.kpp}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('kpp', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="ОГРН"
                value={
                  <FieldInput
                    value={form.requisites.ogrn}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('ogrn', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="Юр. адрес"
                value={
                  <FieldInput
                    value={form.requisites.legalAddress}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('legalAddress', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="Банк"
                value={
                  <FieldInput
                    value={form.requisites.bankName}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('bankName', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="Расчётный счёт"
                value={
                  <FieldInput
                    value={form.requisites.bankAccount}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('bankAccount', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="Корр. счёт"
                value={
                  <FieldInput
                    value={form.requisites.correspondentAccount}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('correspondentAccount', v);
                    }}
                  />
                }
              />
              <PropertyRow
                icon={<Building2 className="h-3 w-3" />}
                label="БИК"
                value={
                  <FieldInput
                    value={form.requisites.bik}
                    onChange={(v) => {
                      setTouched(true);
                      setRequisites('bik', v);
                    }}
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

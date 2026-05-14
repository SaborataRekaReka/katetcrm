/**
 * PositionDialog — shell-модалка позиции заявки (добавление + редактирование).
 *
 * Тот же EntityModalFramework, что у детального лид/брони.
 * Save disabled пока не заполнены обязательные поля подготовки позиции к брони.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  Layers,
  MapPin,
  Package,
  Truck,
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
import {
  useAddApplicationItem,
  useUpdateApplicationItem,
} from '../../hooks/useApplicationMutations';
import { useEquipmentTypesQuery } from '../../hooks/useDirectoriesQuery';
import type { ApplicationPosition, SourcingType } from '../../types/application';

type PositionDialogMode = 'add' | 'edit';

type PositionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PositionDialogMode;
  applicationId: string;
  position?: ApplicationPosition;
};

type FormState = {
  equipmentTypeId: string; // '' = ручной ввод по label
  equipmentTypeLabel: string;
  quantity: string;
  shiftCount: string;
  plannedDate: string;
  plannedTimeFrom: string;
  plannedTimeTo: string;
  address: string;
  comment: string;
  sourcingType: SourcingType;
  pricePerShift: string;
  deliveryPrice: string;
  surcharge: string;
};

const EMPTY_FORM: FormState = {
  equipmentTypeId: '',
  equipmentTypeLabel: '',
  quantity: '1',
  shiftCount: '1',
  plannedDate: '',
  plannedTimeFrom: '',
  plannedTimeTo: '',
  address: '',
  comment: '',
  sourcingType: 'undecided',
  pricePerShift: '',
  deliveryPrice: '',
  surcharge: '',
};

const SOURCING_OPTIONS: { value: SourcingType; label: string }[] = [
  { value: 'undecided', label: 'Не выбран' },
  { value: 'own', label: 'Свой парк' },
  { value: 'subcontractor', label: 'Подрядчик' },
];

function parseMoneyInput(value: string): { valid: boolean; normalized?: string } {
  const raw = value.trim();
  if (!raw) return { valid: true };
  const normalized = raw.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { valid: false };
  }
  return { valid: true, normalized };
}

function positionToForm(pos: ApplicationPosition): FormState {
  return {
    equipmentTypeId: '',
    equipmentTypeLabel: pos.equipmentType,
    quantity: String(pos.quantity),
    shiftCount: String(pos.shiftCount),
    plannedDate: pos.plannedDate ?? '',
    plannedTimeFrom: pos.plannedTimeFrom ?? '',
    plannedTimeTo: pos.plannedTimeTo ?? '',
    address: pos.address ?? '',
    comment: pos.comment ?? '',
    sourcingType: pos.sourcingType,
    pricePerShift: pos.pricePerShift !== undefined ? String(pos.pricePerShift) : '',
    deliveryPrice: pos.deliveryPrice !== undefined ? String(pos.deliveryPrice) : '',
    surcharge: pos.surcharge !== undefined ? String(pos.surcharge) : '',
  };
}

export function PositionDialog({
  open,
  onOpenChange,
  mode,
  applicationId,
  position,
}: PositionDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addMutation = useAddApplicationItem();
  const updateMutation = useUpdateApplicationItem();
  const mutation = mode === 'add' ? addMutation : updateMutation;
  const typesQuery = useEquipmentTypesQuery(undefined, open);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && position) {
      setForm(positionToForm(position));
    } else {
      setForm(EMPTY_FORM);
    }
    setTouched(false);
    setError(null);
    addMutation.reset();
    updateMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, position?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const label = form.equipmentTypeLabel.trim();
  const qty = Number(form.quantity);
  const shifts = Number(form.shiftCount);
  const labelValid = label.length >= 1;
  const qtyValid = Number.isFinite(qty) && qty >= 1;
  const shiftsValid = Number.isFinite(shifts) && shifts >= 1;
  const priceCheck = parseMoneyInput(form.pricePerShift);
  const deliveryCheck = parseMoneyInput(form.deliveryPrice);
  const surchargeCheck = parseMoneyInput(form.surcharge);
  const moneyValid = priceCheck.valid && deliveryCheck.valid && surchargeCheck.valid;
  const plannedDateReady = Boolean(form.plannedDate);
  const plannedTimeFromReady = Boolean(form.plannedTimeFrom);
  const plannedTimeToReady = Boolean(form.plannedTimeTo);
  const plannedTimeReady = plannedTimeFromReady && plannedTimeToReady;
  const addressReady = form.address.trim().length > 0;
  const reservationReady =
    labelValid &&
    qtyValid &&
    shiftsValid &&
    plannedDateReady &&
    plannedTimeReady &&
    addressReady;
  const canSave = reservationReady && moneyValid && !mutation.isPending;
  const reservationMissing = [
    !labelValid ? 'тип техники' : null,
    !qtyValid ? 'количество' : null,
    !shiftsValid ? 'смены' : null,
    !plannedDateReady ? 'дата' : null,
    !plannedTimeFromReady ? 'время с' : null,
    !plannedTimeToReady ? 'время до' : null,
    !addressReady ? 'адрес' : null,
  ].filter(Boolean);

  const typeOptions = useMemo(
    () => [
      { value: '__manual__', label: 'Ручной ввод' },
      ...(typesQuery.data ?? []).map((t) => ({
        value: t.id,
        label: t.category ? `${t.name} · ${t.category.name}` : t.name,
      })),
    ],
    [typesQuery.data],
  );

  const handleTypeSelect = (value: string) => {
    if (value === '__manual__') {
      set('equipmentTypeId', '');
      return;
    }
    const picked = typesQuery.data?.find((t) => t.id === value);
    if (picked) {
      setForm((prev) => ({
        ...prev,
        equipmentTypeId: picked.id,
        equipmentTypeLabel: picked.name,
      }));
      setTouched(true);
    }
  };

  const buildBody = () => {
    const body: Record<string, unknown> = {
      equipmentTypeLabel: label,
      quantity: qty,
      shiftCount: shifts,
      sourcingType: form.sourcingType,
      readyForReservation: reservationReady,
    };
    if (form.equipmentTypeId) body.equipmentTypeId = form.equipmentTypeId;
    if (form.plannedDate) body.plannedDate = form.plannedDate;
    if (form.plannedTimeFrom) body.plannedTimeFrom = form.plannedTimeFrom;
    if (form.plannedTimeTo) body.plannedTimeTo = form.plannedTimeTo;
    if (form.address.trim()) body.address = form.address.trim();
    if (form.comment.trim()) body.comment = form.comment.trim();
    if (priceCheck.normalized) body.pricePerShift = priceCheck.normalized;
    if (deliveryCheck.normalized) body.deliveryPrice = deliveryCheck.normalized;
    if (surchargeCheck.normalized) body.surcharge = surchargeCheck.normalized;
    return body;
  };

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    try {
      const body = buildBody();
      if (mode === 'add') {
        await addMutation.mutateAsync({ applicationId, body });
      } else if (position) {
        await updateMutation.mutateAsync({ itemId: position.id, body });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить позицию');
    }
  };

  const isEdit = mode === 'edit';

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<ClipboardList className="h-3 w-3 text-gray-500" />}
          entityLabel="Позиция заявки"
          title={isEdit ? position?.equipmentType || 'Позиция' : 'Новая позиция'}
          subtitle={
            isEdit
              ? `${form.quantity || 1} шт · ${form.shiftCount || 1} смен`
              : 'Укажите тип техники, количество и смены.'
          }
          primaryAction={{
            label: mutation.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Добавить',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-[var(--brand-accent)] text-white hover:bg-[var(--brand-accent-hover)] text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mutation.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Добавить'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Тип техники">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Layers className="h-3 w-3" />}
                label="Из справочника"
                value={
                  <FieldSelect
                    value={form.equipmentTypeId || '__manual__'}
                    onChange={handleTypeSelect}
                    options={typeOptions}
                    disabled={typesQuery.isLoading}
                    placeholder={typesQuery.isLoading ? 'Загружаем…' : 'Выберите тип'}
                  />
                }
              />
              <PropertyRow
                icon={<Package className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={form.equipmentTypeLabel}
                    onChange={(v) => {
                      set('equipmentTypeLabel', v);
                      setTouched(true);
                    }}
                    placeholder="Экскаватор 1.5т"
                    invalid={touched && !labelValid}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Объём">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Package className="h-3 w-3" />}
                label="Кол-во *"
                value={
                  <FieldInput
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(v) => {
                      set('quantity', v);
                      setTouched(true);
                    }}
                    invalid={touched && !qtyValid}
                  />
                }
              />
              <PropertyRow
                icon={<Clock className="h-3 w-3" />}
                label="Смен *"
                value={
                  <FieldInput
                    type="number"
                    min={1}
                    value={form.shiftCount}
                    onChange={(v) => {
                      set('shiftCount', v);
                      setTouched(true);
                    }}
                    invalid={touched && !shiftsValid}
                  />
                }
              />
              <PropertyRow
                icon={<Truck className="h-3 w-3" />}
                label="Источник для брони"
                value={
                  <div className="space-y-1">
                    <FieldSelect
                      value={form.sourcingType}
                      onChange={(v) => set('sourcingType', v as SourcingType)}
                      options={SOURCING_OPTIONS}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Можно выбрать позже на стадии брони.
                    </div>
                  </div>
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Расписание">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Calendar className="h-3 w-3" />}
                label="Дата для брони *"
                value={
                  <FieldInput
                    type="date"
                    value={form.plannedDate}
                    onChange={(v) => {
                      set('plannedDate', v);
                      setTouched(true);
                    }}
                    invalid={touched && !plannedDateReady}
                  />
                }
              />
              <PropertyRow
                icon={<MapPin className="h-3 w-3" />}
                label="Адрес для брони *"
                value={
                  <FieldInput
                    value={form.address}
                    onChange={(v) => {
                      set('address', v);
                      setTouched(true);
                    }}
                    placeholder="Москва, ул. ..."
                    invalid={touched && !addressReady}
                  />
                }
              />
              <PropertyRow
                icon={<Clock className="h-3 w-3" />}
                label="С *"
                value={
                  <FieldInput
                    type="time"
                    value={form.plannedTimeFrom}
                    onChange={(v) => {
                      set('plannedTimeFrom', v);
                      setTouched(true);
                    }}
                    invalid={touched && !plannedTimeFromReady}
                  />
                }
              />
              <PropertyRow
                icon={<Clock className="h-3 w-3" />}
                label="До *"
                value={
                  <FieldInput
                    type="time"
                    value={form.plannedTimeTo}
                    onChange={(v) => {
                      set('plannedTimeTo', v);
                      setTouched(true);
                    }}
                    invalid={touched && !plannedTimeToReady}
                  />
                }
              />
            </EntityMetaGrid>
            <div
              className={
                reservationReady
                  ? 'rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2'
                  : 'rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2'
              }
            >
              <div
                className={
                  reservationReady
                    ? 'text-[11px] font-medium text-emerald-700'
                    : 'text-[11px] font-medium text-amber-800'
                }
              >
                {reservationReady
                  ? 'Позиция готова к брони. Сохранение доступно.'
                  : 'Для сохранения заполните все обязательные поля со звездочкой.'}
              </div>
              {!reservationReady && reservationMissing.length > 0 ? (
                <div className="mt-1 text-[10px] text-amber-700">
                  Не заполнено: {reservationMissing.join(', ')}.
                </div>
              ) : null}
            </div>
          </EntitySection>

          <EntitySection title="Стоимость">
            <EntityMetaGrid>
              <PropertyRow
                icon={<DollarSign className="h-3 w-3" />}
                label="Цена смены"
                value={
                  <FieldInput
                    value={form.pricePerShift}
                    onChange={(v) => {
                      set('pricePerShift', v);
                      setTouched(true);
                    }}
                    placeholder="20000"
                    invalid={touched && !priceCheck.valid}
                  />
                }
              />
              <PropertyRow
                icon={<DollarSign className="h-3 w-3" />}
                label="Доставка"
                value={
                  <FieldInput
                    value={form.deliveryPrice}
                    onChange={(v) => {
                      set('deliveryPrice', v);
                      setTouched(true);
                    }}
                    placeholder="5000"
                    invalid={touched && !deliveryCheck.valid}
                  />
                }
              />
              <PropertyRow
                icon={<DollarSign className="h-3 w-3" />}
                label="Надбавка"
                value={
                  <FieldInput
                    value={form.surcharge}
                    onChange={(v) => {
                      set('surcharge', v);
                      setTouched(true);
                    }}
                    placeholder="0"
                    invalid={touched && !surchargeCheck.valid}
                  />
                }
              />
            </EntityMetaGrid>
            {!moneyValid && touched ? (
              <div className="text-[11px] text-rose-600">
                Используйте формат суммы `12345` или `12345.67`.
              </div>
            ) : null}
          </EntitySection>

          <EntitySection title="Комментарий">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Заметки"
              value={
                <FieldTextarea
                  value={form.comment}
                  onChange={(v) => set('comment', v)}
                  placeholder="Детали, пожелания клиента"
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

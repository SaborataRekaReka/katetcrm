/**
 * Shell-modal справочников.
 *
 * Единый «shell» для всех атомов/молекул справочника (категория, тип,
 * единица техники, подрядчик). Один и тот же EntityModalFramework, что и у
 * LeadDetailModal / ReservationWorkspace — но со своей начинкой.
 *
 * Контракт публичных пропсов (CategoryDialog/TypeDialog/UnitDialog/
 * SubcontractorDialog) намеренно сохранён совместимым с предыдущим компактным
 * диалогом — чтобы CatalogsWorkspacePage не пришлось переписывать.
 *
 * Режим:
 *   entity == null|undefined → create (все поля пустые, Save disabled пока
 *                                       не заполнены обязательные)
 *   entity != null           → edit   (Save disabled пока ничего не изменено
 *                                       или required сломаны)
 *
 * Валидация: required-поля подсвечиваются красной рамкой, если пользователь
 * попытался сохранить или поле было тронуто и очищено.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  FileText,
  FolderTree,
  Info,
  Layers,
  MapPin,
  Package,
  Phone,
  Tag,
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
import {
  useCreateEquipmentCategory,
  useCreateEquipmentType,
  useCreateEquipmentUnit,
  useCreateSubcontractor,
  useUpdateEquipmentCategory,
  useUpdateEquipmentType,
  useUpdateEquipmentUnit,
  useUpdateSubcontractor,
} from '../../hooks/useDirectoriesMutations';
import {
  useEquipmentCategoriesQuery,
  useEquipmentTypesQuery,
} from '../../hooks/useDirectoriesQuery';
import type {
  EquipmentCategoryApi,
  EquipmentTypeApi,
  EquipmentUnitApi,
  SubcontractorApi,
} from '../../lib/directoriesApi';

type DirectoryStatus = 'active' | 'inactive' | 'archived';

const STATUS_LABEL: Record<DirectoryStatus, string> = {
  active: 'Активно',
  inactive: 'Неактивно',
  archived: 'Архив',
};

/* ========================================================================== *
 *                                 Category                                   *
 * ========================================================================== */

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: EquipmentCategoryApi | null;
};

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateEquipmentCategory();
  const updateMut = useUpdateEquipmentCategory();
  const isEdit = !!category;
  const mut = isEdit ? updateMut : createMut;

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id]);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2;
  const dirty = isEdit ? trimmed !== (category?.name ?? '').trim() : trimmed.length > 0;
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    try {
      if (isEdit && category) {
        await updateMut.mutateAsync({ id: category.id, body: { name: trimmed } });
      } else {
        await createMut.mutateAsync({ name: trimmed });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<FolderTree className="h-3 w-3 text-gray-500" />}
          entityLabel="Категория техники"
          title={isEdit ? category!.name : 'Новая категория'}
          subtitle={
            isEdit
              ? `ID ${category!.id.slice(0, 8)}`
              : 'Заполните обязательные поля и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            onClick: submit,
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      setTouched(true);
                    }}
                    placeholder="Землеройная"
                    invalid={touched && !nameValid}
                  />
                }
              />
            </EntityMetaGrid>
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

/* ========================================================================== *
 *                               Equipment type                               *
 * ========================================================================== */

type TypeDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type?: EquipmentTypeApi | null;
};

export function TypeDialog({ open, onOpenChange, type }: TypeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateEquipmentType();
  const updateMut = useUpdateEquipmentType();
  const isEdit = !!type;
  const mut = isEdit ? updateMut : createMut;
  const categoriesQuery = useEquipmentCategoriesQuery(open);

  useEffect(() => {
    if (!open) return;
    setName(type?.name ?? '');
    setDescription(type?.description ?? '');
    setCategoryId(type?.categoryId ?? '');
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type?.id]);

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 2;
  const dirty = isEdit
    ? trimmed !== (type?.name ?? '').trim()
      || description.trim() !== (type?.description ?? '').trim()
      || categoryId !== (type?.categoryId ?? '')
    : trimmed.length > 0 || description.trim().length > 0 || !!categoryId;
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    const body: Record<string, unknown> = { name: trimmed };
    if (description.trim()) body.description = description.trim();
    if (categoryId) body.categoryId = categoryId;
    try {
      if (isEdit && type) {
        await updateMut.mutateAsync({ id: type.id, body });
      } else {
        await createMut.mutateAsync(body);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: '__none__', label: 'Без категории' },
      ...(categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categoriesQuery.data],
  );

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Layers className="h-3 w-3 text-gray-500" />}
          entityLabel="Тип техники"
          title={isEdit ? type!.name : 'Новый тип техники'}
          subtitle={
            isEdit
              ? `ID ${type!.id.slice(0, 8)} · Единиц: ${type!._count?.units ?? 0}`
              : 'Заполните обязательные поля и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={name}
                    onChange={(v) => {
                      setName(v);
                      setTouched(true);
                    }}
                    placeholder="Экскаватор"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<FolderTree className="h-3 w-3" />}
                label="Категория"
                value={
                  <FieldSelect
                    value={categoryId || '__none__'}
                    onChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
                    options={categoryOptions}
                    placeholder="Без категории"
                    disabled={categoriesQuery.isLoading}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Описание">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={description}
                  onChange={setDescription}
                  placeholder="Гусеничный / колёсный, грузоподъёмность…"
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

/* ========================================================================== *
 *                               Equipment unit                               *
 * ========================================================================== */

type UnitDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit?: EquipmentUnitApi | null;
};

type UnitForm = {
  name: string;
  equipmentTypeId: string;
  year: string;
  plateNumber: string;
  notes: string;
  status: DirectoryStatus;
};

const EMPTY_UNIT: UnitForm = {
  name: '',
  equipmentTypeId: '',
  year: '',
  plateNumber: '',
  notes: '',
  status: 'active',
};

export function UnitDialog({ open, onOpenChange, unit }: UnitDialogProps) {
  const [form, setForm] = useState<UnitForm>(EMPTY_UNIT);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateEquipmentUnit();
  const updateMut = useUpdateEquipmentUnit();
  const isEdit = !!unit;
  const mut = isEdit ? updateMut : createMut;
  const typesQuery = useEquipmentTypesQuery(undefined, open);

  useEffect(() => {
    if (!open) return;
    if (unit) {
      setForm({
        name: unit.name,
        equipmentTypeId: unit.equipmentTypeId,
        year: unit.year ? String(unit.year) : '',
        plateNumber: unit.plateNumber ?? '',
        notes: unit.notes ?? '',
        status: unit.status,
      });
    } else {
      setForm(EMPTY_UNIT);
    }
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id]);

  const set = <K extends keyof UnitForm>(k: K, v: UnitForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const nameValid = form.name.trim().length >= 1;
  const typeValid = form.equipmentTypeId.length > 0;

  const dirty = isEdit && unit
    ? form.name.trim() !== unit.name.trim()
      || form.equipmentTypeId !== unit.equipmentTypeId
      || form.year !== (unit.year ? String(unit.year) : '')
      || form.plateNumber !== (unit.plateNumber ?? '')
      || form.notes !== (unit.notes ?? '')
      || form.status !== unit.status
    : nameValid || typeValid || form.year !== '' || form.plateNumber !== ''
      || form.notes !== '' || form.status !== 'active';
  const canSave = nameValid && typeValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      equipmentTypeId: form.equipmentTypeId,
      status: form.status,
    };
    if (form.year && Number.isFinite(Number(form.year))) body.year = Number(form.year);
    if (form.plateNumber.trim()) body.plateNumber = form.plateNumber.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    try {
      if (isEdit && unit) {
        await updateMut.mutateAsync({ id: unit.id, body });
      } else {
        await createMut.mutateAsync(body);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  const typeOptions = useMemo(
    () =>
      (typesQuery.data ?? []).map((t) => ({
        value: t.id,
        label: t.category ? `${t.name} · ${t.category.name}` : t.name,
      })),
    [typesQuery.data],
  );

  const currentType = typesQuery.data?.find((t) => t.id === form.equipmentTypeId);
  const categoryLabel =
    currentType?.category?.name ?? unit?.equipmentType?.category?.name ?? '—';

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Package className="h-3 w-3 text-gray-500" />}
          entityLabel="Единица техники"
          title={isEdit ? unit!.name : 'Новая единица техники'}
          subtitle={
            isEdit
              ? `${unit!.equipmentType?.name ?? '—'}${
                  unit!.equipmentType?.category?.name
                    ? ' · ' + unit!.equipmentType.category.name
                    : ''
                } · ${STATUS_LABEL[unit!.status]}`
              : 'Заполните название, тип техники и сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
                      setTouched(true);
                    }}
                    placeholder="CAT 320D"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<Layers className="h-3 w-3" />}
                label="Тип техники *"
                value={
                  <FieldSelect
                    value={form.equipmentTypeId}
                    onChange={(v) => {
                      set('equipmentTypeId', v);
                      setTouched(true);
                    }}
                    options={typeOptions}
                    placeholder="Выберите тип"
                    invalid={touched && !typeValid}
                    disabled={typesQuery.isLoading}
                  />
                }
              />
              <PropertyRow
                icon={<FolderTree className="h-3 w-3" />}
                label="Категория"
                value={<span className="text-gray-700">{categoryLabel}</span>}
              />
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Статус"
                value={
                  <FieldSelect
                    value={form.status}
                    onChange={(v) => set('status', v as DirectoryStatus)}
                    options={(Object.keys(STATUS_LABEL) as DirectoryStatus[]).map(
                      (s) => ({ value: s, label: STATUS_LABEL[s] }),
                    )}
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Идентификация">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Год выпуска"
                value={
                  <FieldInput
                    type="number"
                    min={1900}
                    value={form.year}
                    onChange={(v) => set('year', v)}
                    placeholder="2019"
                  />
                }
              />
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Гос. номер"
                value={
                  <FieldInput
                    value={form.plateNumber}
                    onChange={(v) => set('plateNumber', v)}
                    placeholder="А123ВС77"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Примечания">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={form.notes}
                  onChange={(v) => set('notes', v)}
                  placeholder="Любые заметки по единице"
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

/* ========================================================================== *
 *                               Subcontractor                                *
 * ========================================================================== */

type SubcontractorDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subcontractor?: SubcontractorApi | null;
};

type SubForm = {
  name: string;
  specialization: string;
  region: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  status: DirectoryStatus;
};

const EMPTY_SUB: SubForm = {
  name: '',
  specialization: '',
  region: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
  status: 'active',
};

export function SubcontractorDialog({
  open,
  onOpenChange,
  subcontractor,
}: SubcontractorDialogProps) {
  const [form, setForm] = useState<SubForm>(EMPTY_SUB);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreateSubcontractor();
  const updateMut = useUpdateSubcontractor();
  const isEdit = !!subcontractor;
  const mut = isEdit ? updateMut : createMut;

  useEffect(() => {
    if (!open) return;
    if (subcontractor) {
      setForm({
        name: subcontractor.name,
        specialization: subcontractor.specialization ?? '',
        region: subcontractor.region ?? '',
        contactPhone: subcontractor.contactPhone ?? '',
        contactEmail: subcontractor.contactEmail ?? '',
        notes: subcontractor.notes ?? '',
        status: subcontractor.status,
      });
    } else {
      setForm(EMPTY_SUB);
    }
    setTouched(false);
    setError(null);
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subcontractor?.id]);

  const set = <K extends keyof SubForm>(k: K, v: SubForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const nameValid = form.name.trim().length >= 2;

  const dirty = isEdit && subcontractor
    ? form.name.trim() !== subcontractor.name.trim()
      || form.specialization !== (subcontractor.specialization ?? '')
      || form.region !== (subcontractor.region ?? '')
      || form.contactPhone !== (subcontractor.contactPhone ?? '')
      || form.contactEmail !== (subcontractor.contactEmail ?? '')
      || form.notes !== (subcontractor.notes ?? '')
      || form.status !== subcontractor.status
    : nameValid || form.specialization !== '' || form.region !== ''
      || form.contactPhone !== '' || form.contactEmail !== '' || form.notes !== ''
      || form.status !== 'active';
  const canSave = nameValid && dirty && !mut.isPending;

  const submit = async () => {
    setTouched(true);
    if (!canSave) return;
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      status: form.status,
    };
    if (form.specialization.trim()) body.specialization = form.specialization.trim();
    if (form.region.trim()) body.region = form.region.trim();
    if (form.contactPhone.trim()) body.contactPhone = form.contactPhone.trim();
    if (form.contactEmail.trim()) body.contactEmail = form.contactEmail.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    try {
      if (isEdit && subcontractor) {
        await updateMut.mutateAsync({ id: subcontractor.id, body });
      } else {
        await createMut.mutateAsync(body);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  return (
    <ShellDialog open={open} onOpenChange={onOpenChange}>
      <EntityModalShell>
        <EntityModalHeader
          entityIcon={<Building2 className="h-3 w-3 text-gray-500" />}
          entityLabel="Подрядчик"
          title={isEdit ? subcontractor!.name : 'Новый подрядчик'}
          subtitle={
            isEdit
              ? `${subcontractor!.specialization ?? '—'} · ${
                  subcontractor!.region ?? '—'
                } · ${STATUS_LABEL[subcontractor!.status]}`
              : 'Заполните название и контакты, затем сохраните.'
          }
          primaryAction={{
            label: mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать',
            render: (
              <Button
                size="sm"
                className="h-7 gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] disabled:bg-gray-200 disabled:text-gray-400"
                onClick={submit}
                disabled={!canSave}
              >
                {mut.isPending ? 'Сохраняем…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            ),
          }}
          secondaryAction={{ label: 'Закрыть', onClick: () => onOpenChange(false) }}
        />

        <div className="mt-5 space-y-5">
          <EntitySection title="Основное">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Tag className="h-3 w-3" />}
                label="Название *"
                value={
                  <FieldInput
                    value={form.name}
                    onChange={(v) => {
                      set('name', v);
                      setTouched(true);
                    }}
                    placeholder="СпецТехПартнёр"
                    invalid={touched && !nameValid}
                  />
                }
              />
              <PropertyRow
                icon={<Info className="h-3 w-3" />}
                label="Статус"
                value={
                  <FieldSelect
                    value={form.status}
                    onChange={(v) => set('status', v as DirectoryStatus)}
                    options={(Object.keys(STATUS_LABEL) as DirectoryStatus[]).map(
                      (s) => ({ value: s, label: STATUS_LABEL[s] }),
                    )}
                  />
                }
              />
              <PropertyRow
                icon={<Package className="h-3 w-3" />}
                label="Специализация"
                value={
                  <FieldInput
                    value={form.specialization}
                    onChange={(v) => set('specialization', v)}
                    placeholder="Экскаваторы, краны"
                  />
                }
              />
              <PropertyRow
                icon={<MapPin className="h-3 w-3" />}
                label="Регион"
                value={
                  <FieldInput
                    value={form.region}
                    onChange={(v) => set('region', v)}
                    placeholder="Москва"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Контакты">
            <EntityMetaGrid>
              <PropertyRow
                icon={<Phone className="h-3 w-3" />}
                label="Телефон"
                value={
                  <FieldInput
                    type="tel"
                    value={form.contactPhone}
                    onChange={(v) => set('contactPhone', v)}
                    placeholder="+7 (495) 000-00-00"
                  />
                }
              />
              <PropertyRow
                icon={<UserIcon className="h-3 w-3" />}
                label="Email"
                value={
                  <FieldInput
                    type="email"
                    value={form.contactEmail}
                    onChange={(v) => set('contactEmail', v)}
                    placeholder="info@partner.ru"
                  />
                }
              />
            </EntityMetaGrid>
          </EntitySection>

          <EntitySection title="Примечания">
            <PropertyRow
              icon={<FileText className="h-3 w-3" />}
              label="Комментарий"
              value={
                <FieldTextarea
                  value={form.notes}
                  onChange={(v) => set('notes', v)}
                  placeholder="Договор, особенности работы"
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
